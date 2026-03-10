import * as Location from 'expo-location';

export interface Coords {
  lat: number;
  lng: number;
}

export interface LocationInfo extends Coords {
  displayName: string;
}

// ─── Permissions ──────────────────────────────────────────────────────────────

export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export async function hasLocationPermission(): Promise<boolean> {
  const { status } = await Location.getForegroundPermissionsAsync();
  return status === 'granted';
}

// ─── Current location ─────────────────────────────────────────────────────────

export async function getCurrentLocation(): Promise<Coords | null> {
  try {
    const granted = await hasLocationPermission();
    if (!granted) return null;
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return { lat: loc.coords.latitude, lng: loc.coords.longitude };
  } catch {
    return null;
  }
}

// ─── Reverse geocode ─────────────────────────────────────────────────────────

export async function reverseGeocode(coords: Coords): Promise<string> {
  try {
    const results = await Location.reverseGeocodeAsync({
      latitude: coords.lat,
      longitude: coords.lng,
    });
    if (results.length === 0) return 'Unknown Location';
    const r = results[0];
    const parts = [r.name, r.district ?? r.subregion, r.city ?? r.region]
      .filter(Boolean)
      .slice(0, 2);
    return parts.join(', ') || r.formattedAddress || 'Unknown Location';
  } catch {
    return 'Unknown Location';
  }
}

// ─── Get full location info ───────────────────────────────────────────────────

export async function getLocationInfo(): Promise<LocationInfo | null> {
  const coords = await getCurrentLocation();
  if (!coords) return null;
  const displayName = await reverseGeocode(coords);
  return { ...coords, displayName };
}

// ─── Watch location changes ───────────────────────────────────────────────────

export type LocationSubscription = Location.LocationSubscription;

export async function watchLocation(
  callback: (info: LocationInfo) => void,
): Promise<LocationSubscription | null> {
  const granted = await hasLocationPermission();
  if (!granted) return null;
  return Location.watchPositionAsync(
    { accuracy: Location.Accuracy.Balanced, distanceInterval: 50 },
    async (loc) => {
      const coords: Coords = {
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
      };
      const displayName = await reverseGeocode(coords);
      callback({ ...coords, displayName });
    },
  );
}
