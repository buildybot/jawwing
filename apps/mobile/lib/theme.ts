// Jawwing Design System — Simple Futurism
// B&W only. Sharp corners. Terminal meets minimalism.

export const colors = {
  // Backgrounds
  bg: '#000000',
  bgCard: '#0A0A0A',
  bgElevated: '#141414',

  // Borders
  border: '#1F1F1F',
  borderBright: '#333333',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textMuted: '#555555',

  // Functional (grayscale only)
  accent: '#FFFFFF',       // active states, selected
  destructive: '#FF3333',  // errors / remove only
  upvote: '#FFFFFF',       // active upvote = white
  downvote: '#555555',     // active downvote = dimmed
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Sharp corners only — NO border radius anywhere
export const radius = {
  none: 0,
};

export const typography = {
  xs: 12,   // metadata
  sm: 13,   // labels, tabs (uppercase)
  md: 14,   // button text
  body: 16, // post content
  lg: 18,
  xl: 22,
  xxl: 28,
  hero: 48,
};

export const tracking = {
  tight: -0.3,
  normal: 0,
  wide: 0.8,     // labels
  wider: 1.0,    // section headers
  widest: 1.5,   // tabs, hero labels
};

export const lineHeight = {
  tight: 18,
  body: 26,   // 16px * 1.6 — generous for post content
  heading: 28,
};
