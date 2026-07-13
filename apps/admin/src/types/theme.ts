export const THEME_MODES = ['light', 'dark', 'system'] as const;

export type ThemeMode = (typeof THEME_MODES)[number];

/**
 * Valores de cor como string.
 * A futura collection Theme deverá validar hexadecimal, rgb, hsl
 * ou referência segura de token — sem CSS arbitrário.
 */
export type ColorTokenSet = {
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  background: string;
  foreground: string;
  surface: string;
  surfaceForeground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  info: string;
};

export type TypographyTokenSet = {
  fontFamilyHeading: string;
  fontFamilyBody: string;
  fontWeightRegular: string;
  fontWeightMedium: string;
  fontWeightSemibold: string;
  fontWeightBold: string;
  baseFontSize: string;
  lineHeightBase: string;
};

export type RadiusTokenSet = {
  none: string;
  small: string;
  medium: string;
  large: string;
  full: string;
};

export type ShadowTokenSet = {
  none: string;
  small: string;
  medium: string;
  large: string;
};

export type SpacingTokenSet = {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
};

export type ThemeTokens = {
  colors: ColorTokenSet;
  typography: TypographyTokenSet;
  radius: RadiusTokenSet;
  shadows: ShadowTokenSet;
  spacing: SpacingTokenSet;
};

export type ThemeReference = {
  id: string;
  name: string;
  slug: string;
  mode: ThemeMode;
  brandId?: string;
  siteId?: string;
  tokens: ThemeTokens;
  isDefault: boolean;
  isActive: boolean;
};

const OMNIA_HOLDING_COLOR_TOKENS: ColorTokenSet = {
  primary: '#0A5A47',
  primaryForeground: '#FFFFFF',
  secondary: '#0E2D4D',
  secondaryForeground: '#FFFFFF',
  accent: '#C7783D',
  accentForeground: '#FFFFFF',
  background: '#FFFFFF',
  foreground: '#11161B',
  surface: '#FFFFFF',
  surfaceForeground: '#11161B',
  muted: '#F4F6F7',
  mutedForeground: '#8E969E',
  border: '#8E969E',
  success: '#0A5A47',
  warning: '#C7783D',
  error: '#DC2626',
  info: '#0E2D4D',
};

const OMNIA_HOLDING_TYPOGRAPHY_TOKENS: TypographyTokenSet = {
  fontFamilyHeading: 'Montserrat',
  fontFamilyBody: 'Inter',
  fontWeightRegular: '400',
  fontWeightMedium: '500',
  fontWeightSemibold: '600',
  fontWeightBold: '700',
  baseFontSize: '16px',
  lineHeightBase: '1.5',
};

const OMNIA_HOLDING_RADIUS_TOKENS: RadiusTokenSet = {
  none: '0',
  small: '0.25rem',
  medium: '0.5rem',
  large: '0.75rem',
  full: '9999px',
};

const OMNIA_HOLDING_SHADOW_TOKENS: ShadowTokenSet = {
  none: 'none',
  small: '0 1px 2px 0 rgb(17 22 27 / 0.05)',
  medium: '0 4px 6px -1px rgb(17 22 27 / 0.1)',
  large: '0 10px 15px -3px rgb(17 22 27 / 0.1)',
};

const OMNIA_HOLDING_SPACING_TOKENS: SpacingTokenSet = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
  '3xl': '4rem',
};

export const OMNIA_HOLDING_THEME_DEFAULTS = {
  id: 'omnia-holding-default',
  name: 'Omnia Holding',
  slug: 'omnia-holding',
  mode: 'light',
  tokens: {
    colors: OMNIA_HOLDING_COLOR_TOKENS,
    typography: OMNIA_HOLDING_TYPOGRAPHY_TOKENS,
    radius: OMNIA_HOLDING_RADIUS_TOKENS,
    shadows: OMNIA_HOLDING_SHADOW_TOKENS,
    spacing: OMNIA_HOLDING_SPACING_TOKENS,
  },
  isDefault: true,
  isActive: true,
} as const satisfies ThemeReference;
