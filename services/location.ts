/**
 * services/location.ts
 * Abstraction layer over the underlying location provider.
 *
 * CURRENT PROVIDER: expo-location (watchPositionAsync, Accuracy.Balanced)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TO SWAP IN react-native-background-geolocation (paid, Transistor Software):
 *   1. Replace the import block below with:
 *        import BackgroundGeolocation from 'react-native-background-geolocation';
 *   2. Replace startTracking() body with BackgroundGeolocation.ready() + .start()
 *   3. Replace stopTracking() body with BackgroundGeolocation.stop()
 *   4. Replace the watchPositionAsync subscription in startTracking() with
 *        BackgroundGeolocation.onLocation(location => { ... })
 *   5. Remove the expo-location import entirely.
 *   Everything else in this file — and every other file — stays the same.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as ExpoLocation from 'expo-location';
import * as turf from '@turf/turf';
import stateBorders from '../data/state-borders.geojson';

// ─── Types ───────────────────────────────────────────────────────────────────

export type StateCrossingCallback = (newState: string, prevState: string | null) => void;

interface LocationSubscription {
  remove: () => void;
}

// ─── Module state ─────────────────────────────────────────────────────────────

let _subscription: LocationSubscription | null = null;
let _currentState: string | null = null;
let _crossingListeners: StateCrossingCallback[] = [];

// ─── Core: state detection via Turf.js ───────────────────────────────────────

export function detectStateFromCoords(latitude: number, longitude: number): string | null {
  const point = turf.point([longitude, latitude]);
  for (const feature of (stateBorders as GeoJSON.FeatureCollection).features) {
    if (turf.booleanPointInPolygon(point, feature as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>)) {
      return (feature.properties as { STUSPS: string }).STUSPS;
    }
  }
  return null;
}

function handleLocationUpdate(latitude: number, longitude: number): void {
  const detected = detectStateFromCoords(latitude, longitude);
  if (detected && detected !== _currentState) {
    const prev = _currentState;
    _currentState = detected;
    _crossingListeners.forEach(cb => cb(detected, prev));
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Request foreground + background location permissions.
 * Call this during onboarding before startTracking().
 */
export async function requestPermissions(): Promise<boolean> {
  const { status: fgStatus } = await ExpoLocation.requestForegroundPermissionsAsync();
  if (fgStatus !== 'granted') return false;
  const { status: bgStatus } = await ExpoLocation.requestBackgroundPermissionsAsync();
  return bgStatus === 'granted';
}

/**
 * Start background location monitoring.
 * Uses Accuracy.Balanced to minimize battery drain.
 * Automatically switches to higher frequency when near a state border
 * (border proximity logic added in Session 3).
 */
export async function startTracking(): Promise<void> {
  if (_subscription) return; // already tracking

  // Seed current state immediately before watch begins
  try {
    const loc = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.Balanced });
    handleLocationUpdate(loc.coords.latitude, loc.coords.longitude);
  } catch {
    // Non-fatal — watch will populate state on first update
  }

  // ── SWAP POINT: replace watchPositionAsync with BackgroundGeolocation.onLocation ──
  _subscription = await ExpoLocation.watchPositionAsync(
    {
      accuracy: ExpoLocation.Accuracy.Balanced,
      distanceInterval: 100, // metres — balances responsiveness vs. battery
      timeInterval: 30_000,  // 30 s fallback
    },
    location => {
      handleLocationUpdate(location.coords.latitude, location.coords.longitude);
    }
  );
}

/**
 * Stop background location monitoring and clean up listeners.
 */
export function stopTracking(): void {
  _subscription?.remove();
  _subscription = null;
}

/**
 * Returns the most recently detected two-letter state code, or null if unknown.
 */
export function getCurrentState(): string | null {
  return _currentState;
}

/**
 * Register a callback that fires whenever a state crossing is detected.
 * Returns an unsubscribe function.
 */
export function onStateCrossing(callback: StateCrossingCallback): () => void {
  _crossingListeners.push(callback);
  return () => {
    _crossingListeners = _crossingListeners.filter(cb => cb !== callback);
  };
}
