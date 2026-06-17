// Thin wrapper around the native Razorpay checkout module.
//
// `react-native-razorpay` is a native module, so it only works in a custom
// dev/release build (not Expo Go). We lazy-require it so the app never
// crashes at import time when the module isn't linked; callers can detect
// that with `isRazorpayCheckoutAvailable` and fall back gracefully.

import { RAZORPAY_KEY_ID } from "./paymentsRepo";

type CheckoutOptions = {
  orderId: string;
  amount: number; // paise
  currency?: string;
  name?: string;
  description?: string;
  prefillEmail?: string;
  prefillContact?: string;
};

export type CheckoutResult =
  | {
      ok: true;
      paymentId: string;
      orderId: string;
      signature: string;
    }
  | { ok: false; cancelled: boolean; message: string };

let RazorpayModule: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  RazorpayModule = require("react-native-razorpay").default;
} catch {
  RazorpayModule = null;
}

export const isRazorpayCheckoutAvailable = Boolean(RazorpayModule);

export async function openRazorpayCheckout(
  options: CheckoutOptions
): Promise<CheckoutResult> {
  if (!RazorpayModule) {
    return {
      ok: false,
      cancelled: false,
      message:
        "Razorpay checkout needs a custom dev build (not available in Expo Go).",
    };
  }

  try {
    const data = await RazorpayModule.open({
      key: RAZORPAY_KEY_ID,
      order_id: options.orderId,
      amount: options.amount,
      currency: options.currency ?? "INR",
      name: options.name ?? "Mobilo",
      description: options.description ?? "Ride payment",
      prefill: {
        email: options.prefillEmail ?? "",
        contact: options.prefillContact ?? "",
      },
      theme: { color: "#0A0A0A" },
    });

    return {
      ok: true,
      paymentId: data.razorpay_payment_id,
      orderId: data.razorpay_order_id ?? options.orderId,
      signature: data.razorpay_signature,
    };
  } catch (error: any) {
    // The module rejects with { code, description } on cancel/failure.
    const cancelled = error?.code === 0 || /cancel/i.test(error?.description ?? "");
    return {
      ok: false,
      cancelled,
      message: error?.description ?? "Payment failed.",
    };
  }
}
