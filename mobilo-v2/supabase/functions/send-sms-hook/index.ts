// Supabase Auth "Send SMS Hook" - delivers Supabase-generated OTP via 2Factor.in.
//
// Why this exists:
// - Supabase's built-in SMS providers (Twilio, MessageBird, Vonage, TextLocal)
//   are expensive or awkward for India.
// - 2Factor.in is cheap, fast, and India-native, but it isn't a built-in
//   provider. The Send SMS Hook lets us delegate just the delivery step
//   while Supabase still owns OTP generation and JWT issuance, so we keep
//   all the security guarantees of Supabase Auth.
//
// Required environment variables (set in dashboard or via supabase secrets):
//   SEND_SMS_HOOK_SECRETS  Standard Webhooks signing secret. Format:
//                          v1,whsec_<base64>. Provided by Supabase when you
//                          enable the hook in the dashboard.
//   TWO_FACTOR_API_KEY     Your 2Factor.in API key.
//   TWO_FACTOR_TEMPLATE    The DLT-approved 2Factor template name. Must
//                          contain a {#var#} placeholder where the OTP goes.
//
// Payload from Supabase (post Standard Webhooks verification):
//   {
//     "user": { "phone": "919999999999", ... },
//     "sms":  { "otp":   "562841" }
//   }
//
// Note: user.phone is in E.164 form WITHOUT the leading "+", e.g.
// "919999999999". 2Factor expects the same (country code + 10 digits).

import { Webhook } from "standardwebhooks";

const TWO_FACTOR_BASE = "https://2factor.in/API/V1";

interface HookPayload {
  user: { phone: string };
  sms: { otp: string };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function send2FactorOtp(
  apiKey: string,
  template: string,
  phone: string,
  otp: string,
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  // 2Factor "send templated SMS" endpoint:
  //   /{key}/SMS/{phone}/{otp}/{template_name}
  // The OTP value is interpolated into the {#var#} placeholder of the
  // approved DLT template.
  const url = `${TWO_FACTOR_BASE}/${apiKey}/SMS/${phone}/${otp}/${encodeURIComponent(template)}`;

  let response: Response;
  try {
    response = await fetch(url, { method: "GET" });
  } catch (error) {
    return {
      ok: false,
      status: 502,
      message: `Could not reach 2Factor: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }

  const text = await response.text();
  let body: { Status?: string; Details?: string } = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    // 2Factor occasionally returns plain text on errors.
    body = { Details: text };
  }

  if (!response.ok || body.Status !== "Success") {
    return {
      ok: false,
      // 2Factor errors map to a 502 from our side - they're upstream failures,
      // not retry-able auth issues. Returning 5xx so Supabase surfaces this
      // as a clear "SMS provider failed" rather than a credentials problem.
      status: 502,
      message: `2Factor rejected request: ${
        body.Details ?? response.statusText
      }`,
    };
  }

  return { ok: true };
}

Deno.serve(async (req) => {
  // Verify Standard Webhooks signature so only Supabase Auth can trigger
  // this function. The shared secret comes from the Supabase dashboard
  // when the hook is created.
  const rawSecret = Deno.env.get("SEND_SMS_HOOK_SECRETS");
  const apiKey = Deno.env.get("TWO_FACTOR_API_KEY");
  const template = Deno.env.get("TWO_FACTOR_TEMPLATE");

  if (!rawSecret || !apiKey || !template) {
    return jsonResponse(
      {
        error: {
          http_code: 500,
          message:
            "send-sms-hook is missing one of SEND_SMS_HOOK_SECRETS, TWO_FACTOR_API_KEY, TWO_FACTOR_TEMPLATE.",
        },
      },
      500,
    );
  }

  const payloadText = await req.text();
  const headers = Object.fromEntries(req.headers);

  let payload: HookPayload;
  try {
    const wh = new Webhook(rawSecret.replace("v1,whsec_", ""));
    payload = wh.verify(payloadText, headers) as HookPayload;
  } catch (error) {
    return jsonResponse(
      {
        error: {
          http_code: 401,
          message: `Invalid webhook signature: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      },
      401,
    );
  }

  const phone = payload.user?.phone?.replace(/\D/g, "");
  const otp = payload.sms?.otp;
  if (!phone || !otp) {
    return jsonResponse(
      {
        error: {
          http_code: 400,
          message: "Webhook payload missing user.phone or sms.otp.",
        },
      },
      400,
    );
  }

  const result = await send2FactorOtp(apiKey, template, phone, otp);
  if (!result.ok) {
    return jsonResponse(
      { error: { http_code: result.status, message: result.message } },
      result.status,
    );
  }

  // Standard Webhooks: empty body + 200 is the success signal, but Supabase
  // Auth's hook validator still requires a Content-Type header even on empty
  // responses. Returning an explicit `{}` keeps both happy.
  return jsonResponse({}, 200);
});
