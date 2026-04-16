/**
 * services/location.ts
 * Abstraction layer over the underlying location provider.
 *
 * CURRENT PROVIDER: expo-location (watchPositionAsync, Accuracy.Balanced)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TO SWAP IN react-native-background-geolocation (paid, Transistor Software):
 *   1. Replace the ── SWAP POINT ── block in startTracking() with:
 *        BackgroundGeolocation.onLocation(loc => {
 *          _handleLocationUpdate(loc.coords.latitude, loc.coords.longitude);
 *        });
 *        BackgroundGeolocation.ready({ desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_MEDIUM });
 *        BackgroundGeolocation.start();
 *   2. Replace stopTracking() body with: BackgroundGeolocation.stop()
 *   3. Remove the ExpoLocation import.
 *   4. No other file needs to change.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as ExpoLocation from 'expo-location';
import { detectStateFromCoords, hasCrossed } from './geofence';
import { useLocationStore } from '../store/locationStore';
import { logCrossingEvent, getSession } from './supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type StateCrossingCallback = (newState: string, prevState: string | null) => void;

interface LocationSubscription {
  remove: () => void;
}

// ─── Module state ─────────────────────────────────────────────────────────────

let _subscription: LocationSubscription | null = null;
let _crossingListeners: StateCrossingCallback[] = [];

// ─── Internal update handler ──────────────────────────────────────────────────

async function _handleLocationUpdate(latitude: number, longitude: number): Promise<void> {
  const store = useLocationStore.getState();
  const prevState = store.currentState;
  const newState = detectStateFromCoords(latitude, longitude);

  if (!hasCrossed(prevState, newState)) return;

  // Update store
  store.recordCrossing(prevState, newState!);

  // Notify listeners
  _crossingListeners.forEach(cb => cb(newState!, prevState));

  // Persist to Supabase (best-effort, non-blocking)
  try {
    const { data: sessionData } = await getSession();
    const userId = sessionData.session?.user?.id;
    if (userId) {
      await logCrossingEvent(userId, prevState, newState!);
    }
  } catch (err) {
    if (__DEV__) console.warn('[location] Failed to log crossing to Supabase:', err);
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
 * Seeds the current state immediately, then watches for position changes.
 */
export async function startTracking(): Promise<void> {
  if (_subscription) return; // already tracking

  useLocationStore.getState().setTracking(true);

  // Seed current state immediately before watch begins
  try {
    const loc = await ExpoLocation.getCurrentPositionAsync({
      accuracy: ExpoLocation.Accuracy.Balanced,
    });
    await _handleLocationUpdate(loc.coords.latitude, loc.coords.longitude);
  } catch {
    // Non-fatal — watch will populate state on first update
  }

  // ── SWAP POINT: replace the block below with BackgroundGeolocation.onLocation ──
  _subscription = await ExpoLocation.watchPositionAsync(
    {
      accuracy: ExpoLocation.Accuracy.Balanced,
      distanceInterval: 100, // metres — minimises battery drain on highway
      timeInterval: 30_000,  // 30 s fallback poll
    },
    location => {
      _handleLocationUpdate(location.coords.latitude, location.coords.longitude);
    }
  );
  // ── END SWAP POINT ────────────────────────────────────────────────────────
}

/**
 * Stop background location monitoring and clean up.
 */
export function stopTracking(): void {
  _subscription?.remove();
  _subscription = null;
  useLocationStore.getState().setTracking(false);
}

/**
 * Returns the most recently detected two-letter state code, or null if unknown.
 */
export function getCurrentState(): string | null {
  return useLocationStore.getState().currentState;
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

/**
 * Manually trigger a state crossing — dev simulator only.
 * Never call this in production code.
 */
export function _devSimulateCrossing(toState: string): void {
  if (!__DEV__) return;
  const store = useLocationStore.getState();
  const prev = store.currentState;
  store.recordCrossing(prev, toState);
  _crossingListeners.forEach(cb => cb(toState, prev));
}
