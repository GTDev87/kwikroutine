import type { Focus } from "../domain/types";

// Dark theme from the Kwikroutine design: near-black surfaces, lime as the hero accent,
// and a few loud supporting colors so each kind of day has its own identity.
export const C = {
  bg: "#0A0A0B",
  surface: "#161618",
  surface2: "#232326",
  line: "#2E2E32",
  line2: "#222225",
  ink: "#F7F7F2",
  muted: "#A0A0A6",
  faint: "#65656B",
  body: "#1E1E21",
  region: "#34343A",
  stripeA: "#1A1A1D",
  stripeB: "#212124",
  bar: "#111113",
  accent: "#C0F447",
  accentDeep: "#9BD41E",
  accentSoft: "rgba(192,244,71,0.14)",
  onAccent: "#0D0D0E",
  violet: "#9D7BFF",
  coral: "#FF5C7A",
  cyan: "#3EE6FF",
  amber: "#FFC23D",
  orange: "#FF7A3D",
  mild: "#F5B75B",
  moderate: "#FA7C20",
  severe: "#F13A32",
  danger: "#FF7A6E",
  // Light backdrop behind photos and illustrations, so every picture sits on the same plate.
  plate: "#ECECE8",
  plateIcon: "#8C8C92",
};
// One radius per kind of surface: tags, chips, controls (buttons/inputs/tiles), cards, sheets.
export const R = { tag: 8, chip: 12, control: 18, card: 24, sheet: 32 };
// Heading sizes: hero moments, screen titles, titles inside cards.
export const sizes = { display: 44, title: 34, card: 28 };
export const fonts = {
  body: "Outfit_400Regular",
  medium: "Outfit_500Medium",
  semibold: "Outfit_600SemiBold",
  bold: "Outfit_700Bold",
  black: "Outfit_800ExtraBold",
  mono: "DMMono_500Medium",
};

export type Theme = {
  // Poster gradient, lightest first.
  colors: readonly [string, string, ...string[]];
  // Solid color used for glows, strips and accents on dark surfaces.
  tint: string;
  // Text color that reads on the gradient.
  ink: string;
};
// Every kind of day gets its own poster colors.
export const focusTheme: Record<Focus | "rest", Theme> = {
  full: { colors: ["#D8FF5C", "#C0F447", "#5EE6B5"], tint: C.accent, ink: C.onAccent },
  upper: { colors: ["#C3AEFF", "#9D7BFF", "#FF6FB5"], tint: C.violet, ink: C.onAccent },
  lower: { colors: ["#FFD66B", "#FF9A3D", "#FF5C7A"], tint: C.orange, ink: C.onAccent },
  open: { colors: ["#8FF4FF", "#3EE6FF", "#9D7BFF"], tint: C.cyan, ink: C.onAccent },
  custom: { colors: ["#FFE27A", "#FFC23D", "#C0F447"], tint: C.amber, ink: C.onAccent },
  rest: { colors: ["#3A2F8F", "#241C5C", "#120E2E"], tint: C.violet, ink: C.ink },
};
