// Hand It design system color tokens
// Source: the sticker logo — blood red, gold hilt, warm dark grounds, maroon ink outline

export const Colors = {
  // Backgrounds (warm near-black, always dark)
  bgBase:     "#160c0c",
  bgSurface:  "#221413",
  bgElevated: "#2f1b19",
  bgSunken:   "#0e0707",

  // Primary — Blood Red
  red500: "#e62b22",
  red600: "#c81f18",
  red700: "#9c1610",  // deep red — used for the button's hard drop-shadow (pop-red)
  red400: "#f0584f",
  red300: "#ff8c84",

  // Secondary — Hilt Gold
  gold500: "#f8ba41",
  gold600: "#e09a1e",
  gold400: "#ffd07a",

  // Ink — the maroon outline that wraps every sticker element
  ink800: "#2a0a0a",
  ink900: "#1a0807",

  // Text on dark
  textStrong: "#ffffff",
  textBody:   "#efe6df",
  textMuted:  "#c9b8b0",
  textFaint:  "#8f7a73",

  // Game states
  alive: "#46c46e",
  dead:  "#7d6f6b",   // bone-500
  bone600: "#574c49", // disabled fill
} as const;

// Typography — font family names as registered in _layout.tsx via useFonts.
// Display = Titan One (chunky rounded headline), Stamp = Bungee (boxy all-caps
// badges/codes), Body/UI = Fredoka (friendly rounded sans, 400 + 700).
export const Fonts = {
  display:  "TitanOne",
  stamp:    "Bungee",
  body:     "Fredoka",
  bodyBold: "FredokaBold",
} as const;

// Spacing — 8px rhythm (mirrors tokens/spacing.css)
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// Corner radii — candy-rounded (tokens/effects.css)
export const Radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

// Control sizing (tokens/spacing.css)
export const Control = {
  height: 52,
  heightSm: 40,
  screenMax: 430,
  gutter: 20,
} as const;

// The signature sticker look: thick maroon border + hard offset shadow
export const Sticker = {
  borderWidth: 3,
  borderColor: "#2a0a0a",
  // Use these as shadowOffset + shadowColor (no blur = hard shadow)
  shadowColor: "#2a0a0a",
  shadowOffset: { width: 4, height: 4 },
  shadowOpacity: 1,
  shadowRadius: 0,
  // On Android, elevation is needed but won't look the same
  elevation: 4,
} as const;
