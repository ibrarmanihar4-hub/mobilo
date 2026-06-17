// Payments via Razorpay (India's standard UPI/card/wallet gateway).
//
// Security model:
//   - The Razorpay KEY SECRET never lives in the app. Order creation and
//     signature verification happen in a Supabase Edge Function
//     (supabase/functions/payments) using server-side secrets.
//   - The app only holds the PUBLIC key id (EXPO_PUBLIC_RAZORPAY_KEY_ID),
//     which is safe to ship.
//
// Flow:
//   1. createOrder()  -> Edge Function creates a Razorpay order, returns
//                        order_id + amount. We also write a `payments` row
//                        (status=created).
//   2. App opens the Razorpay checkout (react-native-razorpay) with the
//      order_id. On success Razorpay returns payment_id + signature.
//   3. verifyPayment() -> Edge Function verifies the signature with the
//                         secret and flips the `payments` row to `paid`.
//
// If Razorpay isn't configured, callers can fall back to a "cash" record so
// the app still works in development.

import { getSupabase, isSupabaseConfigured } from "./supabase";

export const RAZORPAY_KEY_ID =
  process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID?.trim() ?? "";

export const isRazorpayConfigured = RAZORPAY_KEY_ID.length > 0;

export interface CreatedOrder {
  orderId: string;
  amount: number; // paise
  currency: string;
  bookingCode: string;
}

/**
 * Ask the Edge Function to create a Razorpay order and record a pending
 * payment. `amountRupees` is converted to paise for the gateway.
 */
export async function createOrder(params: {
  amountRupees: number;
  bookingCode: string;
  method: string;
}): Promise<CreatedOrder | null> {
  if (!isSupabaseConfigured) return null;
  const client = getSupabase();
  const { data, error } = await client.functions.invoke("payments", {
    body: {
      action: "create_order",
      amount: Math.round(params.amountRupees * 100),
      booking_code: params.bookingCode,
      method: params.method,
    },
  });

  if (error) {
    console.warn("createOrder failed:", error.message);
    return null;
  }

  return {
    orderId: data.order_id,
    amount: data.amount,
    currency: data.currency ?? "INR",
    bookingCode: params.bookingCode,
  };
}

export interface VerifyInput {
  orderId: string;
  paymentId: string;
  signature: string;
}

/** Verify a completed Razorpay payment server-side. */
export async function verifyPayment(input: VerifyInput): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const client = getSupabase();
  const { data, error } = await client.functions.invoke("payments", {
    body: {
      action: "verify",
      razorpay_order_id: input.orderId,
      razorpay_payment_id: input.paymentId,
      razorpay_signature: input.signature,
    },
  });
  if (error) {
    console.warn("verifyPayment failed:", error.message);
    return false;
  }
  return Boolean(data?.verified);
}

/**
 * Record a non-gateway payment (e.g. cash on board) directly. Keeps a
 * consistent payments trail even when no online charge happens.
 */
export async function recordOfflinePayment(params: {
  amountRupees: number;
  bookingCode: string;
  method: string;
  status?: "paid" | "pending";
}): Promise<void> {
  if (!isSupabaseConfigured) return;
  const client = getSupabase();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return;

  const { error } = await client.from("payments").insert({
    user_id: user.id,
    booking_code: params.bookingCode,
    amount: Math.round(params.amountRupees * 100),
    method: params.method,
    gateway: "offline",
    status: params.status ?? "paid",
  });
  if (error) console.warn("recordOfflinePayment failed:", error.message);
}
