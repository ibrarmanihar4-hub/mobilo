// Mobilo Driver design tokens - mirrors the rider app's clean light theme.
export const colors = {
  bg: "#F5F5F7",
  surface: "#FFFFFF",
  surfaceMuted: "#F2F2F4",
  border: "#E4E4E7",
  borderSoft: "#EFEFF1",

  ink: "#0A0A0A",
  inkMuted: "#71717A",
  inkFaint: "#A1A1AA",

  primary: "#0A0A0A",
  accent: "#10B981",
  accentSoft: "#D1FAE5",
  warning: "#D97706",
  warningSoft: "#FEF3C7",
  danger: "#DC2626",
  dangerSoft: "#FEE2E2",
  online: "#10B981",
};

export const radii = { sm: 10, md: 14, lg: 18, pill: 999 };

export const shadows = {
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

export const mapStyleLight = [
  { elementType: "geometry", stylers: [{ color: "#F5F5F7" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#FFFFFF" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#E2E8F0" }],
  },
];
