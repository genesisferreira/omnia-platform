import {
  OMNIA_HOLDING_THEME_DEFAULTS,
  type ColorTokenSet,
  type RadiusTokenSet,
  type ShadowTokenSet,
  type SpacingTokenSet,
  type ThemeTokens,
  type TypographyTokenSet,
} from '../../types/theme';

import { isValidColorToken } from './validators';

export type PartialThemeTokens = {
  colors?: Partial<ColorTokenSet>;
  typography?: Partial<TypographyTokenSet>;
  radius?: Partial<RadiusTokenSet>;
  shadows?: Partial<ShadowTokenSet>;
  spacing?: Partial<SpacingTokenSet>;
};

export type ResolveThemeTokensOptions = {
  core?: ThemeTokens | PartialThemeTokens;
  holding?: ThemeTokens | PartialThemeTokens;
  brand?: ThemeTokens | PartialThemeTokens;
  site?: ThemeTokens | PartialThemeTokens;
};

export type ThemeValidationError = {
  path: string;
  message: string;
};

export type ThemeValidationResult = {
  valid: boolean;
  errors: ThemeValidationError[];
};

const COLOR_KEYS = [
  'primary',
  'primaryForeground',
  'secondary',
  'secondaryForeground',
  'accent',
  'accentForeground',
  'background',
  'foreground',
  'surface',
  'surfaceForeground',
  'muted',
  'mutedForeground',
  'border',
  'success',
  'warning',
  'error',
  'info',
] as const satisfies ReadonlyArray<keyof ColorTokenSet>;

const TYPOGRAPHY_KEYS = [
  'fontFamilyHeading',
  'fontFamilyBody',
  'fontWeightRegular',
  'fontWeightMedium',
  'fontWeightSemibold',
  'fontWeightBold',
  'baseFontSize',
  'lineHeightBase',
] as const satisfies ReadonlyArray<keyof TypographyTokenSet>;

const RADIUS_KEYS = ['none', 'small', 'medium', 'large', 'full'] as const satisfies ReadonlyArray<
  keyof RadiusTokenSet
>;

const SHADOW_KEYS = ['none', 'small', 'medium', 'large'] as const satisfies ReadonlyArray<
  keyof ShadowTokenSet
>;

const SPACING_KEYS = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'] as const satisfies ReadonlyArray<
  keyof SpacingTokenSet
>;

const FONT_WEIGHT_KEYS = [
  'fontWeightRegular',
  'fontWeightMedium',
  'fontWeightSemibold',
  'fontWeightBold',
] as const satisfies ReadonlyArray<keyof TypographyTokenSet>;

const cloneThemeTokens = (tokens: ThemeTokens): ThemeTokens => ({
  colors: { ...tokens.colors },
  typography: { ...tokens.typography },
  radius: { ...tokens.radius },
  shadows: { ...tokens.shadows },
  spacing: { ...tokens.spacing },
});

const mergeColorTokens = (
  base: ColorTokenSet,
  override?: Partial<ColorTokenSet>,
): ColorTokenSet => {
  const next: ColorTokenSet = { ...base };

  if (!override) {
    return next;
  }

  for (const key of COLOR_KEYS) {
    const value = override[key];

    if (value !== undefined) {
      next[key] = value;
    }
  }

  return next;
};

const mergeTypographyTokens = (
  base: TypographyTokenSet,
  override?: Partial<TypographyTokenSet>,
): TypographyTokenSet => {
  const next: TypographyTokenSet = { ...base };

  if (!override) {
    return next;
  }

  for (const key of TYPOGRAPHY_KEYS) {
    const value = override[key];

    if (value !== undefined) {
      next[key] = value;
    }
  }

  return next;
};

const mergeRadiusTokens = (
  base: RadiusTokenSet,
  override?: Partial<RadiusTokenSet>,
): RadiusTokenSet => {
  const next: RadiusTokenSet = { ...base };

  if (!override) {
    return next;
  }

  for (const key of RADIUS_KEYS) {
    const value = override[key];

    if (value !== undefined) {
      next[key] = value;
    }
  }

  return next;
};

const mergeShadowTokens = (
  base: ShadowTokenSet,
  override?: Partial<ShadowTokenSet>,
): ShadowTokenSet => {
  const next: ShadowTokenSet = { ...base };

  if (!override) {
    return next;
  }

  for (const key of SHADOW_KEYS) {
    const value = override[key];

    if (value !== undefined) {
      next[key] = value;
    }
  }

  return next;
};

const mergeSpacingTokens = (
  base: SpacingTokenSet,
  override?: Partial<SpacingTokenSet>,
): SpacingTokenSet => {
  const next: SpacingTokenSet = { ...base };

  if (!override) {
    return next;
  }

  for (const key of SPACING_KEYS) {
    const value = override[key];

    if (value !== undefined) {
      next[key] = value;
    }
  }

  return next;
};

export const mergeThemeTokens = (
  base: ThemeTokens,
  override?: PartialThemeTokens,
): ThemeTokens => ({
  colors: mergeColorTokens(base.colors, override?.colors),
  typography: mergeTypographyTokens(base.typography, override?.typography),
  radius: mergeRadiusTokens(base.radius, override?.radius),
  shadows: mergeShadowTokens(base.shadows, override?.shadows),
  spacing: mergeSpacingTokens(base.spacing, override?.spacing),
});

/**
 * Resolve tokens na ordem: core → holding → brand → site.
 * Se `core` não for informado, a base é `OMNIA_HOLDING_THEME_DEFAULTS.tokens`.
 */
export const resolveThemeTokens = (options: ResolveThemeTokensOptions = {}): ThemeTokens => {
  let resolved = cloneThemeTokens(OMNIA_HOLDING_THEME_DEFAULTS.tokens);

  if (options.core) {
    resolved = mergeThemeTokens(resolved, options.core);
  }

  if (options.holding) {
    resolved = mergeThemeTokens(resolved, options.holding);
  }

  if (options.brand) {
    resolved = mergeThemeTokens(resolved, options.brand);
  }

  if (options.site) {
    resolved = mergeThemeTokens(resolved, options.site);
  }

  return resolved;
};

const isNonEmptyString = (value: string): boolean => value.trim() !== '';

const isValidFontWeight = (value: string): boolean => {
  if (!/^\d+(\.\d+)?$/.test(value.trim())) {
    return false;
  }

  const weight = Number(value);

  return Number.isFinite(weight) && weight >= 100 && weight <= 900;
};

export const validateThemeTokens = (tokens: ThemeTokens): ThemeValidationResult => {
  const errors: ThemeValidationError[] = [];

  for (const key of COLOR_KEYS) {
    const value = tokens.colors[key];
    const path = `colors.${key}`;

    if (!isValidColorToken(value)) {
      errors.push({
        path,
        message: 'Cor inválida. Use hex, rgb(a), hsl(a) ou var(--token).',
      });
    }
  }

  const requiredTypographyKeys = [
    'fontFamilyHeading',
    'fontFamilyBody',
    'baseFontSize',
    'lineHeightBase',
  ] as const;

  for (const key of requiredTypographyKeys) {
    const value = tokens.typography[key];
    const path = `typography.${key}`;

    if (!isNonEmptyString(value)) {
      errors.push({
        path,
        message: 'Token tipográfico obrigatório ausente ou vazio.',
      });
    }
  }

  for (const key of FONT_WEIGHT_KEYS) {
    const value = tokens.typography[key];
    const path = `typography.${key}`;

    if (!isNonEmptyString(value)) {
      errors.push({
        path,
        message: 'Peso tipográfico obrigatório ausente ou vazio.',
      });
      continue;
    }

    if (!isValidFontWeight(value)) {
      errors.push({
        path,
        message: 'Peso tipográfico inválido. Use valor numérico entre 100 e 900.',
      });
    }
  }

  for (const key of RADIUS_KEYS) {
    const value = tokens.radius[key];
    const path = `radius.${key}`;

    if (!isNonEmptyString(value)) {
      errors.push({
        path,
        message: 'Token de raio obrigatório ausente ou vazio.',
      });
    }
  }

  for (const key of SHADOW_KEYS) {
    const value = tokens.shadows[key];
    const path = `shadows.${key}`;

    if (!isNonEmptyString(value)) {
      errors.push({
        path,
        message: 'Token de sombra obrigatório ausente ou vazio.',
      });
    }
  }

  for (const key of SPACING_KEYS) {
    const value = tokens.spacing[key];
    const path = `spacing.${key}`;

    if (!isNonEmptyString(value)) {
      errors.push({
        path,
        message: 'Token de espaçamento obrigatório ausente ou vazio.',
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};
