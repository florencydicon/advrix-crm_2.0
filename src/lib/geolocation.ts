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

export function getCurrentPosition(): Promise<GeoLocation> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.error("Geolocation: navigator.geolocation not available");
      resolve({ latitude: null, longitude: null, location_text: null });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        const locationText = await reverseGeocode(lat, lon);
        resolve({ latitude: lat, longitude: lon, location_text: locationText });
      },
      (error) => {
        console.error(`Geolocation error (code ${error.code}): ${error.message}`);
        resolve({ latitude: null, longitude: null, location_text: null });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
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
