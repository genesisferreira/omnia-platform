/**
 * Parsing seguro de coordenadas — nunca usa 0 como fallback silencioso.
 */

export function parseOptionalCoordinate(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** WGS84 Null Island — inválido como sede de parceiro no Brasil. */
export function isNullIsland(lat: number, lng: number): boolean {
  return lat === 0 && lng === 0;
}

export function isValidLatitude(lat: number): boolean {
  return Number.isFinite(lat) && lat >= -90 && lat <= 90;
}

export function isValidLongitude(lng: number): boolean {
  return Number.isFinite(lng) && lng >= -180 && lng <= 180;
}

/**
 * Coordenada utilizável para distância / geocode persistido.
 * Rejeita NaN, fora de range e 0,0.
 */
export function isUsableCoordinatePair(
  lat: number | null | undefined,
  lng: number | null | undefined,
): lat is number {
  if (lat == null || lng == null) {
    return false;
  }
  if (!isValidLatitude(lat) || !isValidLongitude(lng)) {
    return false;
  }
  if (isNullIsland(lat, lng)) {
    return false;
  }
  return true;
}

export function normalizeCoordinatePair(
  lat: unknown,
  lng: unknown,
): { latitude: number; longitude: number } | null {
  const latitude = parseOptionalCoordinate(lat);
  const longitude = parseOptionalCoordinate(lng);
  if (!isUsableCoordinatePair(latitude, longitude)) {
    return null;
  }
  return { latitude, longitude };
}
