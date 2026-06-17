// Mobilo payments Edge Function - Razorpay order creation + verification.
//
// Why server-side: the Razorpay KEY SECRET must never ship in the app. This
// function holds it (via env), creates orders through Razorpay's REST API,
// and verifies the HMAC signature Razorpay returns after checkout. It also
// keeps the `public.payments` row in sync (created -> paid/failed).
//
// Required secrets (supabase secrets set ...):
//   RAZORPAY_KEY_ID       Razorpay public key id (also used in the app).
//   RAZORPAY_KEY_SECRET   Razorpay secret - SERVER ONLY.
//   SUPABASE_URL          (auto-injected in Supabase runtime)
//   SUPABASE_SERVICE_ROLE_KEY  service role for writing payments rows.
//
// Request body (JSON):
//   { action: "create_order", amount, booking_code, method }
//   { action: "verify", razorpay_order_id, razorpay_payment_id, razorpay_signature }

import { createClient } from "@supabase/supabase-js";

const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID") ?? "";
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Admin client (service role) for writing payments rows past RLS. */
function adminClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

/** Resolve the calling user from the Authorization bearer token. */
async function getUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return null;
  const client = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

async function createOrder(req: Request, userId: string, body: any) {
  const amount = Number(body.amount);
  const bookingCode = String(body.booking_code ?? "");
  const method = String(body.method ?? "upi");

  if (!Number.isFinite(amount) || amount <= 0 || !bookingCode) {
    return json({ error: "Invalid amount or booking_code." }, 400);
  }

  // Create the order on Razorpay.
  const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
  const rpRes = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount, // paise
      currency: "INR",
      receipt: bookingCode,
      notes: { booking_code: bookingCode, method },
    }),
  });

  const rpBody = await rpRes.json();
  if (!rpRes.ok) {
    return json(
      { error: rpBody?.error?.description ?? "Razorpay order failed." },
      502
    );
  }

  // Record a pending payment row.
  const admin = adminClient();
  await admin.from("payments").insert({
    user_id: userId,
    booking_code: bookingCode,
    amount,
    method,
    gateway: "razorpay",
    gateway_order_id: rpBody.id,
    status: "created",
  });

  return json({
    order_id: rpBody.id,
    amount: rpBody.amount,
    currency: rpBody.currency,
    key_id: RAZORPAY_KEY_ID,
  });
}

/** HMAC-SHA256 hex of `${order_id}|${payment_id}` keyed by the secret. */
async function hmacHex(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function verify(body: any) {
  const orderId = String(body.razorpay_order_id ?? "");
  const paymentId = String(body.razorpay_payment_id ?? "");
  const signature = String(body.razorpay_signature ?? "");

  if (!orderId || !paymentId || !signature) {
    return json({ error: "Missing verification fields." }, 400);
  }

  const expected = await hmacHex(`${orderId}|${paymentId}`, RAZORPAY_KEY_SECRET);
  const verified = expected === signature;

  const admin = adminClient();
  await admin
    .from("payments")
    .update({
      status: verified ? "paid" : "failed",
      gateway_payment_id: paymentId,
    })
    .eq("gateway_order_id", orderId);

  return json({ verified });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    return json({ error: "Razorpay is not configured on the server." }, 500);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const userId = await getUserId(req);
  if (!userId) return json({ error: "Unauthorized." }, 401);

  try {
    if (body.action === "create_order") {
      return await createOrder(req, userId, body);
    }
    if (body.action === "verify") {
      return await verify(body);
    }
    return json({ error: "Unknown action." }, 400);
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : String(error) },
      500
    );
  }
});
