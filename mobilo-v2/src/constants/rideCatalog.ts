import { colors } from "../theme/theme";

export type RideOptionId = "shuttle" | "cab" | "auto" | "moto";

export type DirectRideId = Exclude<RideOptionId, "shuttle">;

export type RideIconName =
  | "bus-clock"
  | "car-electric"
  | "rickshaw"
  | "motorbike";

export type RideConfig = {
  title: string;
  supportText: string;
  accent: string;
  icon: RideIconName;
  etaMinutes: number;
  baseFare: number;
  capacity: string;
  serviceTag: string;
};

export const rideOptionIds = [
  "shuttle",
  "cab",
  "auto",
  "moto",
] as const satisfies readonly RideOptionId[];

export const rideConfigs: Record<RideOptionId, RideConfig> = {
  shuttle: {
    title: "Smart Shuttle",
    supportText: "Route-matched pickup",
    accent: colors.rideShuttle,
    icon: "bus-clock",
    etaMinutes: 6,
    baseFare: 49,
    capacity: "Shared seats",
    serviceTag: "Scheduled route",
  },
  cab: {
    title: "Premium Cab",
    supportText: "Private direct ride",
    accent: colors.rideCab,
    icon: "car-electric",
    etaMinutes: 3,
    baseFare: 149,
    capacity: "Up to 4 riders",
    serviceTag: "Comfort class",
  },
  auto: {
    title: "City Auto",
    supportText: "Budget city ride",
    accent: colors.rideAuto,
    icon: "rickshaw",
    etaMinutes: 4,
    baseFare: 89,
    capacity: "Up to 3 riders",
    serviceTag: "Affordable daily",
  },
  moto: {
    title: "Moto",
    supportText: "Fast solo ride",
    accent: colors.rideMoto,
    icon: "motorbike",
    etaMinutes: 2,
    baseFare: 69,
    capacity: "1 rider",
    serviceTag: "Quick pickup",
  },
};

export function formatCurrency(amount: number) {
  return `₹${amount}`;
}
