// Mobilo v2 design tokens.
// Industry-standard mobility app look: white surfaces on a soft light
// background, near-black ink, a disciplined emerald accent for success
// states, and a solid black primary CTA. No gradients, restrained
// shadows, and big readable typography.

export const colors = {
  // surfaces
  bg: "#F5F5F7",
  bgRaised: "#FFFFFF",
  surface: "#FFFFFF",
  surfaceMuted: "#F2F2F4",
  surfaceHigh: "#EAEAEE",
  border: "#E4E4E7",
  borderSoft: "#EFEFF1",

  // brand
  primary: "#0A0A0A", // primary CTA / selection
  primaryDeep: "#000000",
  primarySoft: "rgba(10,10,10,0.06)",

  // accent (success / booked / confirmation)
  accent: "#10B981",
  accentDeep: "#047857",
  accentSoft: "#D1FAE5",

  hot: "#F97316", // sparingly: destination markers
  hotSoft: "#FFEDD5",

  // ink
  ink: "#0A0A0A",
  inkSoft: "#27272A",
  inkMuted: "#71717A",
  inkFaint: "#A1A1AA",

  // semantic
  success: "#10B981",
  successSoft: "#D1FAE5",
  warning: "#D97706",
  warningSoft: "#FEF3C7",
  danger: "#DC2626",
  dangerSoft: "#FEE2E2",

  // ride accents
  rideShuttle: "#10B981",
  rideCab: "#0A0A0A",
  rideAuto: "#F97316",
  rideMoto: "#2563EB",
};

// Gradient pair retained for backwards compatibility; we rarely use them
// now. Most CTAs are solid black.
export const gradients = {
  primary: ["#0A0A0A", "#0A0A0A"] as const,
  hot: ["#F97316", "#F97316"] as const,
  amber: ["#D97706", "#D97706"] as const,
  glass: ["rgba(0,0,0,0.0)", "rgba(0,0,0,0.0)"] as const,
};

export const radii = {
  xs: 8,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  pill: 999,
};

export const shadows = {
  card: {
    shadowColor: "#0A0A0A",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  soft: {
    shadowColor: "#0A0A0A",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  floating: {
    shadowColor: "#0A0A0A",
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
};

// Light Google Maps style. Subtle, neutral, like Apple Maps default.
export const mapStyleLight = [
  { elementType: "geometry", stylers: [{ color: "#F5F5F7" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#71717A" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#FFFFFF" }] },
  {
    featureType: "administrative",
    elementType: "geometry",
    stylers: [{ visibility: "off" }],
  },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#FFFFFF" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#E4E4E7" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#FFFFFF" }],
  },
  {
    featureType: "road.arterial",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#E2E8F0" }],
  },
  {
    featureType: "landscape",
    elementType: "geometry",
    stylers: [{ color: "#F5F5F7" }],
  },
];

// Backwards-compat alias.
export const mapStyleDark = mapStyleLight;
