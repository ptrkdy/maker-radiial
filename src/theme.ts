// Radiial Brand Theme
// Colors derived from www-radiial/src/App.css

export const theme = {
  // Primary brand color - lavender/periwinkle
  accent: "#8B9FE8",
  accentLight: "#a0b3f0",

  // Background colors
  bgDeep: "#0a0a1a",
  bgMid: "#0d1025",

  // Text colors
  textPrimary: "white",
  textSecondary: "gray",
  textMuted: "gray",

  // Status colors
  success: "green",
  error: "red",
  warning: "yellow",
} as const;

// For Ink components that need color names instead of hex
// The closest terminal color to #8B9FE8 is "blueBright" or we use hex directly
export const inkColors = {
  accent: "#8B9FE8",
  accentBg: "#8B9FE8",
} as const;
