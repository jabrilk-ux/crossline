import * as turf from '@turf/turf';
import { detectStateFromCoords } from './geofence';
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
const SAMPLE_POINTS = 100;

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
 * Draws a straight line between origin and destination, samples SAMPLE_POINTS
 * evenly spaced points along it, and returns the ordered, deduplicated list
 * of state codes the route passes through.
 */
export function getStatesAlongRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): string[] {
  const line = turf.lineString([
    [origin.lng, origin.lat],
    [destination.lng, destination.lat],
  ]);

  const totalLength = turf.length(line, { units: 'kilometers' });
  const step = totalLength / (SAMPLE_POINTS - 1);

  const stateCodes: string[] = [];
  let lastSeen: string | null = null;

  for (let i = 0; i < SAMPLE_POINTS; i++) {
    const dist = i * step;
    const pt = turf.along(line, dist, { units: 'kilometers' });
    const [lng, lat] = pt.geometry.coordinates;
    const code = detectStateFromCoords(lat, lng);

    if (code && code !== lastSeen) {
      if (!stateCodes.includes(code)) {
        stateCodes.push(code);
      } else if (stateCodes[stateCodes.length - 1] !== code) {
        // Re-entering a state after crossing another (e.g. panhandle) — append again
        stateCodes.push(code);
      }
      lastSeen = code;
    } else if (!code) {
      lastSeen = null;
    }
  }

  return stateCodes;
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
    return 'Your permit is not recognized here. Secure your firearm before entering.';
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
