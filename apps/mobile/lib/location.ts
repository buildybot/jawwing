import * as Location from 'expo-location';

export interface Coords {
  lat: number;
  lng: number;
}

export interface LocationInfo extends Coords {
  displayName: string;
}

// ─── Permissions ──────────────────────────────────────────────────────────────

/**
 * Request foreground location permission.
 * On iOS: triggers the native permission dialog ("Allow While Using App").
 * On Android: requests ACCESS_FINE_LOCATION (required for high-accuracy GPS).
 * Call this early in the app lifecycle (e.g. on the home/feed screen mount).
 */
export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export async function hasLocationPermission(): Promise<boolean> {
  const { status } = await Location.getForegroundPermissionsAsync();
  return status === 'granted';
}

// ─── Current location ─────────────────────────────────────────────────────────

/**
 * Get the current device location at HIGH accuracy.
 * Automatically requests permission if not already granted.
 * Returns null if permission is denied or location fails.
 *
 * Using Accuracy.High ensures:
 * - iOS: GPS + assisted GPS
 * - Android: GPS + Wi-Fi + cell (ACCESS_FINE_LOCATION)
 */
export async function getCurrentLocation(): Promise<Coords | null> {
  try {
    // Request permission if not already granted
    let granted = await hasLocationPermission();
    if (!granted) {
      granted = await requestLocationPermission();
    }
    if (!granted) return null;

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
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

/**
 * Request permission, get coordinates, and reverse-geocode to a display name.
 * Returns null if permission denied or location unavailable.
 */
export async function getLocationInfo(): Promise<LocationInfo | null> {
  const coords = await getCurrentLocation();
  if (!coords) return null;
  const displayName = await reverseGeocode(coords);
  return { ...coords, displayName };
}

// ─── Watch location changes ───────────────────────────────────────────────────

export type LocationSubscription = Location.LocationSubscription;

/**
 * Watch for location changes at HIGH accuracy.
 * Fires callback every 50m of movement.
 * Automatically requests permission if not already granted.
 */
export async function watchLocation(
  callback: (info: LocationInfo) => void,
): Promise<LocationSubscription | null> {
  let granted = await hasLocationPermission();
  if (!granted) {
    granted = await requestLocationPermission();
  }
  if (!granted) return null;

  return Location.watchPositionAsync(
    { accuracy: Location.Accuracy.High, distanceInterval: 50 },
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
