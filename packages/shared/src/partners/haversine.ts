import { isUsableCoordinatePair } from './coordinates';

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Distância Haversine em quilômetros entre dois pontos WGS84.
 * Retorna null se alguma coordenada for inválida (inclui 0,0 / Null Island).
 */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number | null {
  if (!isUsableCoordinatePair(lat1, lon1) || !isUsableCoordinatePair(lat2, lon2)) {
    return null;
  }

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export function roundDistanceKm(km: number, decimals = 1): number {
  const f = 10 ** decimals;
  return Math.round(km * f) / f;
}
