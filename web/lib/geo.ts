import type { ProvinceStat } from "@/lib/types";

export const RDC_BOUNDS = {
  latMin: -13.5,
  latMax: 5.5,
  lngMin: 12,
  lngMax: 31.5,
};

export function isInRdc(lat: number, lng: number) {
  return (
    lat >= RDC_BOUNDS.latMin &&
    lat <= RDC_BOUNDS.latMax &&
    lng >= RDC_BOUNDS.lngMin &&
    lng <= RDC_BOUNDS.lngMax
  );
}

export function projectMapCoords(
  lat: number,
  lng: number,
  w: number,
  h: number,
) {
  return {
    x: ((lng - RDC_BOUNDS.lngMin) / (RDC_BOUNDS.lngMax - RDC_BOUNDS.lngMin)) * w,
    y: ((RDC_BOUNDS.latMax - lat) / (RDC_BOUNDS.latMax - RDC_BOUNDS.latMin)) * h,
  };
}

export function findNearestProvince(
  lat: number,
  lng: number,
  provinces: ProvinceStat[],
): ProvinceStat | null {
  const withCoords = provinces.filter((p) => p.latitude != null && p.longitude != null);
  if (withCoords.length === 0) return null;

  let nearest = withCoords[0]!;
  let minDist = Infinity;

  for (const province of withCoords) {
    const dLat = lat - province.latitude!;
    const dLng = lng - province.longitude!;
    const dist = dLat * dLat + dLng * dLng;
    if (dist < minDist) {
      minDist = dist;
      nearest = province;
    }
  }

  return nearest;
}

export function formatCoords(lat: number, lng: number) {
  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "E" : "O";
  return `${Math.abs(lat).toFixed(5)}° ${latDir}, ${Math.abs(lng).toFixed(5)}° ${lngDir}`;
}
