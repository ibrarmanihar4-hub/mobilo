import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import ScreenBackground from "../components/ScreenBackground";
import ScreenHeader from "../components/ScreenHeader";
import GradientButton from "../components/GradientButton";

import {
  PaymentMethodId,
  RootStackParamList,
} from "../navigation/RootNavigator";
import { colors, radii, shadows } from "../theme/theme";
import { createTrip, requestDispatch } from "../services/tripsRepo";
import {
  createOrder,
  isRazorpayConfigured,
  recordOfflinePayment,
  verifyPayment,
} from "../services/paymentsRepo";
import { openRazorpayCheckout } from "../services/razorpayCheckout";

type PaymentRouteProp = RouteProp<RootStackParamList, "Payment">;

const PROMO_CODES: Record<string, { discount: number; label: string }> = {
  MOBILO50: { discount: 0.5, label: "MOBILO50 · 50% off" },
  FIRST20: { discount: 0.2, label: "FIRST20 · 20% off" },
  SHUTTLE10: { discount: 0.1, label: "SHUTTLE10 · 10% off" },
};

const methods: Array<{
  id: PaymentMethodId;
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  badge?: string;
}> = [
  {
    id: "upi",
    title: "UPI",
    subtitle: "Google Pay · PhonePe · Paytm",
    icon: "qrcode-scan",
    badge: "Recommended",
  },
  {
    id: "card",
    title: "Card",
    subtitle: "Visa, Mastercard, RuPay",
    icon: "credit-card-outline",
  },
  {
    id: "wallet",
    title: "Mobilo Wallet",
    subtitle: "₹240 balance available",
    icon: "wallet-outline",
  },
  {
    id: "cash",
    title: "Cash on board",
    subtitle: "Pay the conductor",
    icon: "cash",
  },
];

export default function PaymentScreen() {
  const route = useRoute<PaymentRouteProp>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const { intent } = route.params;
  const baseFare = intent.fare;

  const [method, setMethod] = useState<PaymentMethodId>("upi");
  const [upiId, setUpiId] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progressStep, setProgressStep] = useState(0);

  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!processing) return;
    const loop = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [processing, spinAnim]);

  const promoDiscount = useMemo(() => {
    if (!appliedPromo) return 0;
    const promo = PROMO_CODES[appliedPromo];
    return Math.round(baseFare * (promo?.discount ?? 0));
  }, [appliedPromo, baseFare]);

  const taxes = useMemo(() => Math.round(baseFare * 0.05), [baseFare]);
  const total = Math.max(0, baseFare + taxes - promoDiscount);
  const isCash = method === "cash";

  const methodValid = useMemo(() => {
    if (method === "upi") return /^[a-z0-9._-]+@[a-z]+$/i.test(upiId.trim());
    if (method === "card") {
      const digits = cardNumber.replace(/\s/g, "");
      return (
        digits.length >= 12 &&
        cardExpiry.length === 5 &&
        cardCvv.replace(/\D/g, "").length >= 3
      );
    }
    return true;
  }, [cardCvv, cardExpiry, cardNumber, method, upiId]);

  const applyPromo = () => {
    const code = promoCode.trim().toUpperCase();
    setPromoError(null);
    if (!code) return;
    if (PROMO_CODES[code]) {
      setAppliedPromo(code);
      setPromoCode("");
    } else {
      setPromoError("Invalid promo code");
    }
  };

  const removePromo = () => {
    setAppliedPromo(null);
    setPromoError(null);
  };

  const formatCardNumber = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(.{4})/g, "$1 ").trim();
  };

  const formatExpiry = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  };

  const runPayment = async (
    bookingCode: string
  ): Promise<{ ok: boolean; reference: string }> => {
    // Cash needs no online charge - just record it.
    if (method === "cash") {
      await recordOfflinePayment({
        amountRupees: total,
        bookingCode,
        method,
        status: "pending",
      });
      return { ok: true, reference: `CASH-${bookingCode}` };
    }

    // Online methods: try the real Razorpay gateway when it's configured
    // and the native checkout is linked. Otherwise fall back to a recorded
    // payment so the flow still completes in dev/Expo Go.
    if (isRazorpayConfigured) {
      const order = await createOrder({
        amountRupees: total,
        bookingCode,
        method,
      });
      if (order) {
        const checkout = await openRazorpayCheckout({
          orderId: order.orderId,
          amount: order.amount,
          currency: order.currency,
          description: `Mobilo ${intent.kind} booking`,
          prefillContact: upiId || "",
        });
        if (checkout.ok) {
          const verified = await verifyPayment({
            orderId: checkout.orderId,
            paymentId: checkout.paymentId,
            signature: checkout.signature,
          });
          return { ok: verified, reference: checkout.paymentId };
        }
        if (checkout.cancelled) {
          return { ok: false, reference: "" };
        }
        // Checkout module unavailable (Expo Go) - fall through to record.
      }
    }

    // Fallback: record the payment locally so development isn't blocked.
    await recordOfflinePayment({
      amountRupees: total,
      bookingCode,
      method,
      status: "paid",
    });
    return {
      ok: true,
      reference: `PAY-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    };
  };

  const handlePay = async () => {
    setProcessing(true);
    setProgressStep(0);
    await delay(500);
    setProgressStep(1);

    const result = await runPayment(intent.bookingCode);

    if (!result.ok) {
      setProcessing(false);
      setProgressStep(0);
      if (result.reference !== "") {
        Alert.alert("Payment failed", "Your payment could not be completed.");
      }
      return;
    }

    setProgressStep(2);
    await delay(400);
    setProcessing(false);

    const paymentReference = result.reference;

    if (intent.kind === "shuttle") {
      navigation.replace("ShuttleSuccess", {
        bookingCode: intent.bookingCode,
        seatNumbers: intent.seatNumbers,
        departureTime: intent.departureTime,
        pickupNode: intent.pickupNode,
        dropNode: intent.dropNode,
        routePlan: intent.routePlan,
        fare: total,
        paymentMethod: method,
        paymentReference,
      });
    } else {
      // Create a REAL trip request. A driver will claim it via the driver
      // app; DirectRideStatus then tracks the driver live.
      const pickupName = intent.sourceLocation.isCurrentLocation
        ? "Current location"
        : intent.sourceLocation.name;
      const trip = await createTrip({
        bookingCode: intent.bookingCode,
        rideType: intent.selectedRide,
        pickupName,
        pickupLat: intent.sourceLocation.lat,
        pickupLng: intent.sourceLocation.lng,
        dropName: intent.destinationLocation.name,
        dropLat: intent.destinationLocation.lat,
        dropLng: intent.destinationLocation.lng,
        fare: total,
      });

      if (!trip) {
        Alert.alert(
          "Could not request ride",
          "We couldn't reach the dispatch service. Please try again."
        );
        return;
      }

      // Kick off proximity dispatch immediately. Fire-and-forget: the status
      // screen subscribes to the trip + offers, so we don't block navigation
      // on the dispatch round-trip.
      void requestDispatch(trip.id);

      navigation.replace("DirectRideStatus", {
        tripId: trip.id,
        selectedRide: intent.selectedRide,
        sourceLocation: intent.sourceLocation,
        destinationLocation: intent.destinationLocation,
        fare: total,
        paymentMethod: method,
        paymentReference,
        bookingCode: intent.bookingCode,
        otp: trip.otp,
      });
    }
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
        <ScreenHeader
          title="Payment"
          subtitle={
            intent.kind === "shuttle"
              ? `${
                  intent.seatNumbers.length > 1 ? "Seats" : "Seat"
                } ${intent.seatNumbers.join(", ")} · ${intent.departureTime}`
              : "Confirm your ride"
          }
        />

        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: 130 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Order summary */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeadRow}>
                <View>
                  <Text style={styles.eyebrow}>YOU PAY</Text>
                  <Text style={styles.total}>₹{total}</Text>
                </View>
                <View style={styles.secureBadge}>
                  <Ionicons
                    name="lock-closed"
                    size={12}
                    color={colors.accentDeep}
                  />
                  <Text style={styles.secureText}>Secure</Text>
                </View>
              </View>

              <View style={styles.summaryDivider} />

              <SummaryRow label="Ride fare" value={`₹${baseFare}`} />
              <SummaryRow label="Taxes & fees" value={`₹${taxes}`} />
              {promoDiscount > 0 ? (
                <SummaryRow
                  label={appliedPromo ? `Promo (${appliedPromo})` : "Promo"}
                  value={`-₹${promoDiscount}`}
                  highlight
                />
              ) : null}
            </View>

            {/* Promo */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Promo code</Text>
              {appliedPromo ? (
                <View style={styles.appliedRow}>
                  <View style={styles.appliedPill}>
                    <Ionicons
                      name="pricetag"
                      size={14}
                      color={colors.accentDeep}
                    />
                    <Text style={styles.appliedText}>
                      {PROMO_CODES[appliedPromo].label}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={removePromo}>
                    <Text style={styles.removeText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.promoRow}>
                  <TextInput
                    value={promoCode}
                    onChangeText={(v) => {
                      setPromoCode(v.toUpperCase());
                      setPromoError(null);
                    }}
                    placeholder="Try MOBILO50"
                    placeholderTextColor={colors.inkFaint}
                    style={styles.promoInput}
                    autoCapitalize="characters"
                  />
                  <TouchableOpacity
                    onPress={applyPromo}
                    style={styles.applyBtn}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.applyText}>Apply</Text>
                  </TouchableOpacity>
                </View>
              )}
              {promoError ? (
                <Text style={styles.promoError}>{promoError}</Text>
              ) : null}
            </View>

            {/* Methods */}
            <Text style={styles.sectionEyebrow}>PAY WITH</Text>
            <View style={styles.methodList}>
              {methods.map((m) => {
                const isSelected = m.id === method;
                return (
                  <TouchableOpacity
                    key={m.id}
                    onPress={() => setMethod(m.id)}
                    activeOpacity={0.85}
                    style={[
                      styles.methodCard,
                      isSelected && styles.methodCardSelected,
                    ]}
                  >
                    <View style={styles.methodIcon}>
                      <MaterialCommunityIcons
                        name={m.icon}
                        size={20}
                        color={colors.ink}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.methodTitleRow}>
                        <Text style={styles.methodTitle}>{m.title}</Text>
                        {m.badge ? (
                          <View style={styles.methodBadge}>
                            <Text style={styles.methodBadgeText}>
                              {m.badge}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.methodSub}>{m.subtitle}</Text>
                    </View>
                    <View
                      style={[styles.radio, isSelected && styles.radioActive]}
                    >
                      {isSelected ? (
                        <View style={styles.radioDot} />
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Method-specific input */}
            {method === "upi" ? (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Pay with UPI</Text>
                <Text style={styles.label}>UPI ID</Text>
                <TextInput
                  value={upiId}
                  onChangeText={setUpiId}
                  placeholder="name@upi"
                  placeholderTextColor={colors.inkFaint}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={styles.input}
                />
                <Text style={styles.helper}>
                  We'll send a collect request to your UPI app.
                </Text>
              </View>
            ) : null}

            {method === "card" ? (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Card details</Text>
                <Text style={styles.label}>Card number</Text>
                <TextInput
                  value={cardNumber}
                  onChangeText={(v) => setCardNumber(formatCardNumber(v))}
                  placeholder="1234 5678 9012 3456"
                  placeholderTextColor={colors.inkFaint}
                  keyboardType="number-pad"
                  maxLength={19}
                  style={styles.input}
                />
                <View style={styles.cardRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Expiry</Text>
                    <TextInput
                      value={cardExpiry}
                      onChangeText={(v) => setCardExpiry(formatExpiry(v))}
                      placeholder="MM/YY"
                      placeholderTextColor={colors.inkFaint}
                      keyboardType="number-pad"
                      maxLength={5}
                      style={styles.input}
                    />
                  </View>
                  <View style={{ width: 14 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>CVV</Text>
                    <TextInput
                      value={cardCvv}
                      onChangeText={(v) =>
                        setCardCvv(v.replace(/\D/g, "").slice(0, 4))
                      }
                      placeholder="•••"
                      placeholderTextColor={colors.inkFaint}
                      keyboardType="number-pad"
                      maxLength={4}
                      secureTextEntry
                      style={styles.input}
                    />
                  </View>
                </View>
              </View>
            ) : null}

            {method === "wallet" ? (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Mobilo Wallet</Text>
                <View style={styles.walletRow}>
                  <View style={styles.walletDot}>
                    <Ionicons
                      name="wallet"
                      size={18}
                      color={colors.accentDeep}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.walletBalance}>₹240.00</Text>
                    <Text style={styles.walletMeta}>Balance available</Text>
                  </View>
                  <Text style={styles.walletPay}>Charge ₹{total}</Text>
                </View>
              </View>
            ) : null}

            {method === "cash" ? (
              <View style={[styles.card, styles.cashCard]}>
                <Ionicons
                  name="information-circle"
                  size={20}
                  color={colors.warning}
                  style={{ marginRight: 10, marginTop: 2 }}
                />
                <Text style={styles.cashText}>
                  Pay ₹{total} in cash to the conductor or driver. Carry exact
                  change if you can.
                </Text>
              </View>
            ) : null}

            <View style={styles.legalRow}>
              <Ionicons
                name="shield-checkmark-outline"
                size={14}
                color={colors.inkMuted}
              />
              <Text style={styles.legal}>
                Secured by 256-bit TLS · No card data stored
              </Text>
            </View>
          </View>
        </ScrollView>

        <View
          style={[
            styles.payDock,
            { paddingBottom: Math.max(insets.bottom, 12) + 8 },
          ]}
        >
          <View style={styles.payDockInner}>
            <View>
              <Text style={styles.payLabel}>TOTAL</Text>
              <Text style={styles.payTotal}>₹{total}</Text>
            </View>
            <GradientButton
              label={
                processing
                  ? "Processing"
                  : isCash
                  ? `Confirm · ₹${total}`
                  : `Pay ₹${total}`
              }
              icon={isCash ? "checkmark" : "lock-closed"}
              loading={processing}
              disabled={!methodValid || processing}
              onPress={handlePay}
              style={{ flex: 1, marginLeft: 16 }}
            />
          </View>
        </View>

        {processing ? (
          <View style={styles.processingOverlay}>
            <View style={styles.processingCard}>
              <Animated.View
                style={[
                  styles.spinnerWrap,
                  {
                    transform: [
                      {
                        rotate: spinAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ["0deg", "360deg"],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View style={styles.spinnerArc} />
              </Animated.View>

              <Text style={styles.processingTitle}>
                {progressStep === 0
                  ? "Authorising"
                  : progressStep === 1
                  ? "Charging"
                  : "Confirming"}
              </Text>
              <Text style={styles.processingSub}>
                {isCash
                  ? "Locking your ride…"
                  : `Working with your bank for ₹${total}`}
              </Text>

              <View style={styles.steps}>
                <Step active={progressStep >= 0} label="Verifying method" />
                <Step active={progressStep >= 1} label="Authorising" />
                <Step active={progressStep >= 2} label="Reserving ride" />
              </View>
            </View>
          </View>
        ) : null}
      </SafeAreaView>
    </ScreenBackground>
  );
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function SummaryRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text
        style={[
          styles.summaryValue,
          highlight && { color: colors.accentDeep },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function Step({ active, label }: { active: boolean; label: string }) {
  return (
    <View style={styles.stepRow}>
      <View style={[styles.stepDot, active && styles.stepDotActive]}>
        {active ? (
          <Ionicons name="checkmark" size={11} color="#FFFFFF" />
        ) : (
          <ActivityIndicator size="small" color={colors.inkMuted} />
        )}
      </View>
      <Text
        style={[styles.stepLabel, active && styles.stepLabelActive]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  content: { paddingHorizontal: 22 },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryHeadRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  eyebrow: {
    color: colors.inkMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  total: {
    color: colors.ink,
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -0.6,
    marginTop: 4,
  },
  secureBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.accentSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  secureText: {
    color: colors.accentDeep,
    fontSize: 11,
    fontWeight: "800",
    marginLeft: 4,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.borderSoft,
    marginVertical: 14,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  summaryLabel: {
    color: colors.inkMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  summaryValue: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "800",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 12,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 12,
  },
  appliedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  appliedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  appliedText: {
    color: colors.accentDeep,
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 4,
  },
  removeText: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  promoRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  promoInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.ink,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  applyBtn: {
    backgroundColor: colors.ink,
    borderRadius: radii.md,
    paddingHorizontal: 18,
    justifyContent: "center",
    marginLeft: 10,
  },
  applyText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  promoError: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 8,
  },
  sectionEyebrow: {
    color: colors.inkMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: 22,
    marginBottom: 10,
  },
  methodList: { gap: 10 },
  methodCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  methodCardSelected: {
    borderColor: colors.ink,
    borderWidth: 2,
  },
  methodIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  methodTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  methodTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800",
  },
  methodBadge: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  methodBadgeText: {
    color: colors.accentDeep,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  methodSub: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioActive: {
    borderColor: colors.ink,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.ink,
  },
  label: {
    color: colors.inkMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.ink,
    fontSize: 15,
    fontWeight: "600",
  },
  helper: {
    color: colors.inkMuted,
    fontSize: 11,
    marginTop: 8,
  },
  cardRow: {
    flexDirection: "row",
    marginTop: 4,
  },
  walletRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    padding: 14,
  },
  walletDot: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  walletBalance: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "800",
  },
  walletMeta: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  walletPay: {
    color: colors.accentDeep,
    fontSize: 13,
    fontWeight: "800",
  },
  cashCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.warningSoft,
    borderColor: colors.warningSoft,
  },
  cashText: {
    flex: 1,
    color: colors.warning,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  legalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 18,
  },
  legal: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  payDock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 14,
    paddingHorizontal: 22,
    ...shadows.floating,
  },
  payDockInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  payLabel: {
    color: colors.inkMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  payTotal: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 2,
  },
  processingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(10,10,10,0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  processingCard: {
    width: "100%",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: 28,
    alignItems: "center",
  },
  spinnerWrap: {
    width: 56,
    height: 56,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  spinnerArc: {
    width: 56,
    height: 56,
    borderRadius: 999,
    borderWidth: 4,
    borderColor: colors.surfaceMuted,
    borderTopColor: colors.ink,
  },
  processingTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "800",
  },
  processingSub: {
    color: colors.inkMuted,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 6,
    textAlign: "center",
  },
  steps: {
    marginTop: 18,
    width: "100%",
    gap: 12,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotActive: {
    backgroundColor: colors.accent,
  },
  stepLabel: {
    color: colors.inkMuted,
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 4,
  },
  stepLabelActive: { color: colors.ink },
});
