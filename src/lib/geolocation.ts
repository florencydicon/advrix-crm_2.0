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
    { enableHighAccuracy: false, timeout: 5000, maximumAge: 0 }
  );
}

export function getCurrentPosition(): Promise<GeoLocation> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
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
        console.error("Geolocation error:", error.message);
        resolve({ latitude: null, longitude: null, location_text: null });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  });
}

async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  const nominatim = await tryNominatim(lat, lon);
  if (nominatim) return nominatim;

  const bdc = await tryBigDataCloud(lat, lon);
  if (bdc) return bdc;

  return null;
}

async function tryNominatim(lat: number, lon: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
      { headers: { "Accept-Language": "en" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const fullAddress = data.display_name || null;
    return fullAddress;
  } catch {
    return null;
  }
}

async function tryBigDataCloud(lat: number, lon: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const parts: string[] = [];
    if (data.locality) parts.push(data.locality);
    if (data.city) parts.push(data.city);
    if (data.principalSubdivision) parts.push(data.principalSubdivision);
    if (data.countryName) parts.push(data.countryName);
    return parts.length > 0 ? parts.join(", ") : null;
  } catch {
    return null;
  }
}

export function googleMapsLink(lat: number | null, lng: number | null): string | null {
  if (lat == null || lng == null) return null;
  return `https://www.google.com/maps?q=${lat},${lng}`;
}
