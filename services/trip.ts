import { statesAlongGeometry } from './routeGeometry';
import { getLawsForState, getCarryStatusForUser, type StateLaw } from './laws';
import { getStateName } from '../constants/states';
import type { Permit, FirearmsProfile } from '../store/userStore';
import type { CarryStatus } from './notifications';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GeocodedLocation {
  lat: number;
  lng: number;
  label: string;
}

export interface TripState {
  stateCode: string;
  stateName: string;
  carryStatus: CarryStatus;
  keyLaws: StateLaw[];
  entryWarning: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const OPENCAGE_API_KEY = process.env.EXPO_PUBLIC_OPENCAGE_API_KEY ?? '';

// ─── Geocoding ────────────────────────────────────────────────────────────────

/**
 * geocodeAddress()
 * Calls OpenCage Geocoding API and returns up to 5 candidate results
 * for the given query string, restricted to the US.
 */
export async function geocodeAddress(query: string): Promise<GeocodedLocation[]> {
  if (!query.trim()) return [];

  const params = new URLSearchParams({
    q: query,
    key: OPENCAGE_API_KEY,
    limit: '5',
    countrycode: 'us',
    no_annotations: '1',
    language: 'en',
  });

  const url = `https://api.opencagedata.com/geocode/v1/json?${params.toString()}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (__DEV__) console.warn('[trip] geocodeAddress HTTP error:', response.status);
      return [];
    }

    const json = await response.json();
    const results: GeocodedLocation[] = (json.results ?? []).map((r: {
      geometry: { lat: number; lng: number };
      formatted: string;
    }) => ({
      lat: r.geometry.lat,
      lng: r.geometry.lng,
      label: r.formatted,
    }));

    return results;
  } catch (err) {
    if (__DEV__) console.warn('[trip] geocodeAddress error:', err);
    return [];
  }
}

// ─── Route intersection ───────────────────────────────────────────────────────

/**
 * getStatesAlongRoute()
 * Intersects the configured provider’s full driving geometry with state boundaries.
 * Preserves re-entry and reports gaps in the bundled boundary coverage.
 */
export const drivingRoutesConfigured = Boolean(process.env.EXPO_PUBLIC_ROUTING_URL && OPENCAGE_API_KEY);
export async function getStatesAlongRoute(
  origin: { lat: number; lng: number }, destination: { lat: number; lng: number }
): Promise<{ states: string[]; hasUnmappedSections: boolean }> {
  const base = process.env.EXPO_PUBLIC_ROUTING_URL;
  if (!base || !base.startsWith('https://')) throw new Error('Driving directions are not configured. Use manual state planning.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`${base.replace(/\/$/, '')}/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=false`, { signal: controller.signal });
    if (!response.ok) throw new Error('Directions are unavailable. Please retry.');
    const result = await response.json();
    if (result.code !== 'Ok' || !Array.isArray(result.routes?.[0]?.geometry?.coordinates)) throw new Error('No driving route found.');
    return statesAlongGeometry(result.routes[0].geometry.coordinates);
  } finally { clearTimeout(timeout); }
}

// ─── Entry warning ────────────────────────────────────────────────────────────

/**
 * generateEntryWarning()
 * Returns a plain-English one-liner for the most critical restriction
 * when entering a state, or null if carry is fully allowed.
 */
export function generateEntryWarning(
  stateLaws: StateLaw[],
  carryStatus: CarryStatus
): string | null {
  if (carryStatus === 'prohibited') {
    return 'Reviewed guidance indicates a restriction for your saved profile. Review the official sources before entering.';
  }

  if (carryStatus === 'restricted') {
    const dti = stateLaws.find(l => l.category === 'duty_to_inform');
    if (dti) return dti.plain_english;
    // Fall back to first restricted/critical law
    const critical = stateLaws.find(l =>
      ['prohibited_locations', 'magazine', 'carry'].includes(l.category)
    );
    if (critical) return critical.plain_english;
    return 'Restrictions apply in this state. Review laws before entering.';
  }

  if (carryStatus === 'unknown') {
    return 'No law data available for this state yet. Verify before entering.';
  }

  return null; // allowed
}

// ─── Trip briefing ────────────────────────────────────────────────────────────

/**
 * buildTripBriefing()
 * For each state code in travel order, fetches carry status + top 3 laws
 * and assembles a TripState briefing.
 */
export async function buildTripBriefing(
  stateCodes: string[],
  permits: Permit[],
  firearmsProfile: FirearmsProfile
): Promise<TripState[]> {
  const results = await Promise.all(
    stateCodes.map(async (code) => {
      const [laws, carryStatus] = await Promise.all([
        getLawsForState(code),
        getCarryStatusForUser(code, permits, firearmsProfile),
      ]);

      // Priority order for key laws
      const PRIORITY = [
        'duty_to_inform',
        'prohibited_locations',
        'magazine',
        'carry',
        'reciprocity',
        'transport',
        'ammo',
        'use_of_force',
        'red_flag',
        'storage',
      ];

      const seen = new Set<string>();
      const keyLaws: StateLaw[] = [];

      for (const cat of PRIORITY) {
        const match = laws.find(l => l.category === cat && !seen.has(l.category));
        if (match) {
          seen.add(cat);
          keyLaws.push(match);
        }
        if (keyLaws.length >= 3) break;
      }

      // Fill remaining slots from any unseen categories
      for (const law of laws) {
        if (keyLaws.length >= 3) break;
        if (!seen.has(law.category)) {
          seen.add(law.category);
          keyLaws.push(law);
        }
      }

      const entryWarning = generateEntryWarning(laws, carryStatus);

      return {
        stateCode: code,
        stateName: getStateName(code),
        carryStatus,
        keyLaws,
        entryWarning,
      } satisfies TripState;
    })
  );

  return results;
}
