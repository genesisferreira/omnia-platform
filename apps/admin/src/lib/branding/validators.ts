const HEX_COLOR_PATTERN =
  /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

const SAFE_TOKEN_REFERENCE_PATTERN = /^var\(--[a-z0-9]+(?:-[a-z0-9]+)*\)$/;

const REJECTED_COLOR_PATTERN =
  /(?:url\s*\(|expression\s*\(|javascript:|calc\s*\(|color-mix\s*\(|@import|behavior\s*:)/i;

const RGB_PATTERN =
  /^rgba?\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)(?:\s*,\s*(-?\d+(?:\.\d+)?))?\s*\)$/i;

const HSL_PATTERN =
  /^hsla?\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)%\s*,\s*(-?\d+(?:\.\d+)?)%(?:\s*,\s*(-?\d+(?:\.\d+)?))?\s*\)$/i;

const isInRange = (value: number, min: number, max: number): boolean =>
  value >= min && value <= max;

export const isValidHexColor = (value: string): boolean => {
  if (typeof value !== 'string' || value.trim() === '') {
    return false;
  }

  return HEX_COLOR_PATTERN.test(value.trim());
};

export const isValidRgbColor = (value: string): boolean => {
  if (typeof value !== 'string' || value.trim() === '') {
    return false;
  }

  const match = value.trim().match(RGB_PATTERN);

  if (!match) {
    return false;
  }

  const red = Number(match[1]);
  const green = Number(match[2]);
  const blue = Number(match[3]);
  const alpha = match[4] === undefined ? undefined : Number(match[4]);
  const expectsAlpha = value.trim().toLowerCase().startsWith('rgba(');

  if (
    !isInRange(red, 0, 255) ||
    !isInRange(green, 0, 255) ||
    !isInRange(blue, 0, 255)
  ) {
    return false;
  }

  if (expectsAlpha) {
    if (alpha === undefined || !isInRange(alpha, 0, 1)) {
      return false;
    }
  } else if (alpha !== undefined) {
    return false;
  }

  return true;
};

export const isValidHslColor = (value: string): boolean => {
  if (typeof value !== 'string' || value.trim() === '') {
    return false;
  }

  const match = value.trim().match(HSL_PATTERN);

  if (!match) {
    return false;
  }

  const hue = Number(match[1]);
  const saturation = Number(match[2]);
  const lightness = Number(match[3]);
  const alpha = match[4] === undefined ? undefined : Number(match[4]);
  const expectsAlpha = value.trim().toLowerCase().startsWith('hsla(');

  if (
    !isInRange(hue, 0, 360) ||
    !isInRange(saturation, 0, 100) ||
    !isInRange(lightness, 0, 100)
  ) {
    return false;
  }

  if (expectsAlpha) {
    if (alpha === undefined || !isInRange(alpha, 0, 1)) {
      return false;
    }
  } else if (alpha !== undefined) {
    return false;
  }

  return true;
};

export const isSafeTokenReference = (value: string): boolean => {
  if (typeof value !== 'string' || value.trim() === '') {
    return false;
  }

  return SAFE_TOKEN_REFERENCE_PATTERN.test(value.trim());
};

export const isValidColorToken = (value: string): boolean => {
  if (typeof value !== 'string' || value.trim() === '') {
    return false;
  }

  const normalized = value.trim();

  if (REJECTED_COLOR_PATTERN.test(normalized)) {
    return false;
  }

  return (
    isValidHexColor(normalized) ||
    isValidRgbColor(normalized) ||
    isValidHslColor(normalized) ||
    isSafeTokenReference(normalized)
  );
};

export const isValidOfficialUrl = (value: string): boolean => {
  if (typeof value !== 'string' || value.trim() === '') {
    return false;
  }

  const normalized = value.trim();

  try {
    const url = new URL(normalized);
    const protocol = url.protocol.toLowerCase();

    return (
      protocol === 'http:' ||
      protocol === 'https:' ||
      protocol === 'mailto:' ||
      protocol === 'tel:'
    );
  } catch {
    return false;
  }
};
