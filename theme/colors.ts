/** RetroUI semantic palette + Acharya accent swatches for the design kit */
export const retroColors = {
  background: "#FFFFFF",
  foreground: "#000000",
  card: "#FFFFFF",
  cardForeground: "#000000",
  primary: "#FFDB33",
  primaryHover: "#FFCC00",
  primaryForeground: "#000000",
  secondary: "#000000",
  secondaryForeground: "#FFFFFF",
  muted: "#AEAEAE",
  mutedForeground: "#5A5A5A",
  accent: "#FAE583",
  accentForeground: "#000000",
  destructive: "#E63946",
  destructiveForeground: "#FFFFFF",
  border: "#000000",
  input: "#FFFFFF",
} as const;

/** Secondary accents from the Acharya design spec (palette demo) */
export const accentColors = {
  mint: "#B8E5E1",
  sky: "#A8D5E5",
  coral: "#FFB5A7",
  lime: "#C5E99B",
  lavender: "#E0D4F7",
  cream: "#FFF8E7",
} as const;

export const colors = {
  ...retroColors,
  ...accentColors,
} as const;

export type ThemeColor = keyof typeof colors;
