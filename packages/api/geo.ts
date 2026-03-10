import {
  latLngToCell,
  cellToLatLng,
  gridDisk,
  getResolution,
} from "h3-js";

// ─── Constants ────────────────────────────────────────────────────────────────

export const DEFAULT_H3_RESOLUTION = 7;
export const DEFAULT_RING_SIZE = 2; // ~2 rings at res 7 ≈ 5km radius

// ─── Geo Utilities ────────────────────────────────────────────────────────────

/**
 * Convert lat/lng coordinates to an H3 cell index.
 */
export function latLngToH3(
  lat: number,
  lng: number,
  resolution: number = DEFAULT_H3_RESOLUTION
): string {
  return latLngToCell(lat, lng, resolution);
}

/**
 * Get all H3 cells within `ringSize` rings of `h3Index` (includes center).
 * Ring size of 1 = center + 6 neighbors = 7 cells.
 * Ring size of 2 = center + 18 neighbors = 19 cells.
 * At resolution 7, ring size 2 ≈ 5km radius.
 */
export function getNeighborHexes(
  h3Index: string,
  ringSize: number = DEFAULT_RING_SIZE
): string[] {
  return gridDisk(h3Index, ringSize);
}

/**
 * Convert an H3 cell index back to lat/lng coordinates (cell center).
 */
export function h3ToLatLng(h3Index: string): { lat: number; lng: number } {
  const [lat, lng] = cellToLatLng(h3Index);
  return { lat, lng };
}

/**
 * Estimate ring size from a radius in meters at resolution 7.
 * Res 7 hex edge length ≈ 1.22km, so avg width ≈ 2.1km.
 * Each ring adds ~2.1km.
 */
export function radiusToRingSize(radiusMeters: number): number {
  // At H3 res 7, avg cell diameter ~2.1km
  const hexWidthMeters = 2100;
  const rings = Math.ceil(radiusMeters / hexWidthMeters);
  return Math.max(1, Math.min(rings, 10)); // cap at 10 rings
}

/**
 * Get H3 cells covering a radius around a point.
 */
export function getHexesForRadius(
  lat: number,
  lng: number,
  radiusMeters: number,
  resolution: number = DEFAULT_H3_RESOLUTION
): string[] {
  const center = latLngToH3(lat, lng, resolution);
  const ringSize = radiusToRingSize(radiusMeters);
  return getNeighborHexes(center, ringSize);
}
