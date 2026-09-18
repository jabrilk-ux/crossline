import * as turf from '@turf/turf';
import stateBorders from '../data/state-borders.json';
import { getStateName } from '../constants/states';

// ─── Types ────────────────────────────────────────────────────────────────────

interface GeoJSONValidationResult {
  total: number;
  missingSTUSPS: string[];
  valid: boolean;
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * validateGeoJSON()
 * Confirms the bundled GeoJSON asset loads correctly and every feature
 * has a valid STUSPS property. Called once on app start in __DEV__ mode.
 */
export function validateGeoJSON(): GeoJSONValidationResult {
  const collection = stateBorders as GeoJSON.FeatureCollection;
  const total = collection.features.length;
  const missingSTUSPS: string[] = [];

  collection.features.forEach((feature, i) => {
    const code = (feature.properties as Record<string, unknown>)?.STUSPS;
    if (!code || typeof code !== 'string' || code.trim() === '') {
      missingSTUSPS.push(`feature[${i}] NAME=${feature.properties?.NAME ?? 'unknown'}`);
    }
  });

  const result: GeoJSONValidationResult = {
    total,
    missingSTUSPS,
    valid: missingSTUSPS.length === 0,
  };

  if (__DEV__) {
    console.log(`[geofence] validateGeoJSON: ${total} features loaded`);
    if (result.valid) {
      console.log('[geofence] validateGeoJSON: ✓ All features have valid STUSPS');
    } else {
      console.warn('[geofence] validateGeoJSON: ✗ Missing STUSPS on:', missingSTUSPS);
    }
  }

  return result;
}

// ─── State detection ──────────────────────────────────────────────────────────

/**
 * detectStateFromCoords()
 * Returns the two-letter STUSPS code for the given coordinates,
 * or null if outside all polygons (ocean, international border, etc.).
 */
export function detectStateFromCoords(lat: number, lng: number): string | null {
  const point = turf.point([lng, lat]);
  const collection = stateBorders as GeoJSON.FeatureCollection;

  for (const feature of collection.features) {
    try {
      const inPolygon = turf.booleanPointInPolygon(
        point,
        feature as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>
      );
      if (inPolygon) {
        return (feature.properties as { STUSPS: string }).STUSPS ?? null;
      }
    } catch {
      // Malformed feature — skip and continue
    }
  }

  return null;
}

/**
 * hasCrossed()
 * Returns true only when newState is non-null and differs from prevState.
 */
export function hasCrossed(
  prevState: string | null,
  newState: string | null
): boolean {
  return newState !== null && newState !== prevState;
}

/**
 * getStateFullName()
 * Returns the full state name for a two-letter code, e.g. 'TX' → 'Texas'.
 */
export { getStateName as getStateFullName };
