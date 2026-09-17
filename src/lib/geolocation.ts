const LOCATION_PROMPT_KEY = "advrix.location.prompted";

export interface GeoLocation {
  latitude: number | null;
  longitude: number | null;
  location_text: string | null;
}

/**
 * Request location permission once per browser on first visit.
 * Shows the native browser prompt silently in the background.
 * Safe to call on every page load — only fires once.
 */
export function requestLocationPermissionOnce() {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(LOCATION_PROMPT_KEY)) return;
  if (!navigator.geolocation) return;

  localStorage.setItem(LOCATION_PROMPT_KEY, "1");

  navigator.geolocation.getCurrentPosition(
    () => {},
    () => {},
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
}

export function getCurrentPosition(): Promise<GeoLocation & { errorCode?: number | null; errorMessage?: string | null }> {
  return new Promise((resolve) => {
    const tryCapacitor = async (fallbackError: GeolocationPositionError | null) => {
      try {
        // Capacitor native geolocation as fallback for WebView where navigator is blocked
        const maybeCap: any = (globalThis as any).Capacitor;
        if (maybeCap?.isNativePlatform?.() || maybeCap?.getPlatform?.() === "android" || maybeCap?.getPlatform?.() === "ios") {
          const mod: any = await import("@capacitor/geolocation").catch(() => null);
          if (mod?.Geolocation) {
            try {
              const perm = await mod.Geolocation.requestPermissions().catch(() => null);
              // requestPermissions returns { location: 'granted'|'denied' } on newer versions
              if (perm && perm.location && perm.location !== "granted" && perm.location !== "prompt") {
                resolve({ latitude: null, longitude: null, location_text: null, errorCode: 1, errorMessage: fallbackError?.message || "Permission denied" });
                return;
              }
            } catch {}
            const pos = await mod.Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 });
            if (pos && pos.coords) {
              const lat = pos.coords.latitude;
              const lon = pos.coords.longitude;
              const locationText = await reverseGeocode(lat, lon);
              resolve({ latitude: lat, longitude: lon, location_text: locationText, errorCode: null, errorMessage: null });
              return;
            }
          }
        }
      } catch {}
      resolve({ latitude: null, longitude: null, location_text: null, errorCode: fallbackError ? fallbackError.code : 0, errorMessage: fallbackError ? fallbackError.message : "Unavailable" });
    };

    if (!navigator.geolocation) {
      console.error("Geolocation: navigator.geolocation not available");
      tryCapacitor(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        const locationText = await reverseGeocode(lat, lon);
        resolve({ latitude: lat, longitude: lon, location_text: locationText, errorCode: null, errorMessage: null });
      },
      (error) => {
        console.error(`Geolocation error (code ${error.code}): ${error.message}`);
        // code 1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT
        if (error.code === 1) {
          tryCapacitor(error);
        } else {
          resolve({ latitude: null, longitude: null, location_text: null, errorCode: error.code, errorMessage: error.message });
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  });
}

async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const res = await fetch(`/api/geocode?lat=${lat}&lon=${lon}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.address || null;
  } catch {
    return null;
  }
}

export function googleMapsLink(lat: number | null, lng: number | null): string | null {
  if (lat == null || lng == null) return null;
  return `https://www.google.com/maps?q=${lat},${lng}`;
}
