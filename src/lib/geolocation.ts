export interface GeoLocation {
  latitude: number | null;
  longitude: number | null;
  location_text: string | null;
}

export function getCurrentPosition(): Promise<GeoLocation> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ latitude: null, longitude: null, location_text: null });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const locationText = await reverseGeocode(lat, lng);
        resolve({ latitude: lat, longitude: lng, location_text: locationText });
      },
      () => {
        resolve({ latitude: null, longitude: null, location_text: null });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  });
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  // Try Nominatim (OpenStreetMap) first — more accurate for Indian addresses
  const nominatim = await tryNominatim(lat, lng);
  if (nominatim) return nominatim;

  // Fallback to BigDataCloud
  const bdc = await tryBigDataCloud(lat, lng);
  if (bdc) return bdc;

  return null;
}

async function tryNominatim(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { "Accept-Language": "en" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.address) return null;
    const a = data.address;
    const parts: string[] = [];
    // Build a detailed address: road/locality, city, state, country
    if (a.road) parts.push(a.road);
    if (a.residential || a.neighbourhood || a.suburb) parts.push(a.residential || a.neighbourhood || a.suburb);
    if (a.city || a.town || a.village) parts.push(a.city || a.town || a.village);
    if (a.state) parts.push(a.state);
    if (a.country) parts.push(a.country);
    if (parts.length > 0) return parts.join(", ");
    // Fallback to display_name (first part)
    if (data.display_name) {
      return data.display_name.split(",").slice(0, 4).join(",").trim();
    }
    return null;
  } catch {
    return null;
  }
}

async function tryBigDataCloud(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
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
