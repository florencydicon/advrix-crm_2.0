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
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  });
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
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
