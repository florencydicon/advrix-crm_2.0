import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const lat = req.nextUrl.searchParams.get("lat");
  const lon = req.nextUrl.searchParams.get("lon");

  if (!lat || !lon) {
    return NextResponse.json({ error: "lat and lon are required" }, { status: 400 });
  }

  const latNum = parseFloat(lat);
  const lonNum = parseFloat(lon);
  if (isNaN(latNum) || isNaN(lonNum) || latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180) {
    return NextResponse.json({ error: "Invalid coordinates." }, { status: 400 });
  }

  // Try Nominatim first with proper User-Agent
  const nominatimAddress = await tryNominatim(lat, lon);
  if (nominatimAddress) {
    return NextResponse.json({ address: nominatimAddress });
  }

  // Fallback to BigDataCloud
  const bdcAddress = await tryBigDataCloud(lat, lon);
  if (bdcAddress) {
    return NextResponse.json({ address: bdcAddress });
  }

  return NextResponse.json({ address: null });
}

async function tryNominatim(lat: string, lon: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
      {
        headers: {
          "Accept-Language": "en",
          "User-Agent": "AdvrixCRM/2.0 (https://advrix-crm.vercel.app)",
        },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.display_name || null;
  } catch {
    return null;
  }
}

async function tryBigDataCloud(lat: string, lon: string): Promise<string | null> {
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
