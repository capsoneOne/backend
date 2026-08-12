import {NextRequest, NextResponse} from 'next/server';

interface NominatimResponse {
  address?: {
    house_number?: string;
    road?: string;
    pedestrian?: string;
    neighbourhood?: string;
    suburb?: string;
    village?: string;
    town?: string;
    city?: string;
    municipality?: string;
    state?: string;
    province?: string;
    postcode?: string;
    country_code?: string;
  };
}

let requestQueue = Promise.resolve();
let lastRequestAt = 0;

function scheduleRequest<T>(task: () => Promise<T>): Promise<T> {
  const result = requestQueue.then(async () => {
    const wait = Math.max(0, 1_000 - (Date.now() - lastRequestAt));
    if (wait) await new Promise(resolve => setTimeout(resolve, wait));
    lastRequestAt = Date.now();
    return task();
  });
  requestQueue = result.then(() => undefined, () => undefined);
  return result;
}

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get('lat'));
  const lng = Number(request.nextUrl.searchParams.get('lng'));
  const requestedLanguage = request.nextUrl.searchParams.get('lang');
  const language = requestedLanguage === 'km' ? 'km' : 'en';

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({code: 'INVALID_COORDINATES'}, {status: 400});
  }

  const endpoint = process.env.NOMINATIM_REVERSE_URL || 'https://nominatim.openstreetmap.org/reverse';
  const url = new URL(endpoint);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));
  url.searchParams.set('zoom', '18');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('accept-language', language);

  try {
    const response = await scheduleRequest(() => fetch(url, {
      headers: {
        'User-Agent': process.env.GEOCODING_USER_AGENT || 'Lumé/1.0 (address location picker)',
        Accept: 'application/json',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    }));

    if (!response.ok) {
      return NextResponse.json({code: 'GEOCODER_FAILED'}, {status: 502});
    }

    const result = await response.json() as NominatimResponse;
    const address = result.address || {};
    const road = address.road || address.pedestrian || address.neighbourhood || '';
    const streetLine1 = [address.house_number, road].filter(Boolean).join(' ');

    return NextResponse.json({
      streetLine1: streetLine1 || undefined,
      city: address.city || address.town || address.village || address.municipality || address.suburb || undefined,
      province: address.state || address.province || undefined,
      postalCode: address.postcode || undefined,
      countryCode: address.country_code?.toUpperCase() || undefined,
    }, {
      headers: {'Cache-Control': 'private, no-store'},
    });
  } catch {
    return NextResponse.json({code: 'GEOCODER_UNAVAILABLE'}, {status: 503});
  }
}
