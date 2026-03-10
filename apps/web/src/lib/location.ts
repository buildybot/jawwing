// ─── Browser Geolocation Wrapper ─────────────────────────────────────────────

export interface LatLng {
  lat: number;
  lng: number;
}

export function requestLocation(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(new Error(err.message)),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }
    );
  });
}

export function watchLocation(callback: (loc: LatLng) => void): () => void {
  if (!navigator.geolocation) return () => {};
  const id = navigator.geolocation.watchPosition(
    (pos) => callback({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
    (err) => console.warn("[location] watchPosition error:", err.message),
    { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 }
  );
  return () => navigator.geolocation.clearWatch(id);
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`;
    const res = await fetch(url, {
      headers: { "Accept-Language": "en", "User-Agent": "Jawwing/1.0" },
    });
    if (!res.ok) throw new Error("Nominatim error");
    const data = await res.json();
    const addr = data.address ?? {};
    // Try city > town > village > county
    const place =
      addr.city ?? addr.town ?? addr.village ?? addr.county ?? addr.state ?? "Nearby";
    const state = addr.state_code ?? addr.state ?? "";
    return state ? `${place}, ${state}` : place;
  } catch {
    return "Nearby";
  }
}
