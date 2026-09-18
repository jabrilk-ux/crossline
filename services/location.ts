import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { detectStateFromCoords } from './geofence';
import { supabase, logCrossingEvent } from './supabase';
import { getPreferences } from './preferences';
import { useLocationStore } from '../store/locationStore';
import { useUserStore } from '../store/userStore';
import { loadAccount } from './account';
import { getCarryStatusForUser } from './laws';
import { sendCrossingAlert } from './notifications';
import { advanceCrossing, initialCrossing, type CrossingState } from './crossing';

const TASK = 'crossline-state-crossings';
let subscription: Location.LocationSubscription | null = null;
let work = Promise.resolve();
let starting: Promise<void> | null = null;
let trackingGeneration = 0;
async function processPosition(location: Location.LocationObject) {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) return;
  const prefs = await getPreferences(id);
  if (!prefs.tracking) return;
  const key = `crossline:crossing:${id}`;
  const raw = await AsyncStorage.getItem(key);
  const previous: CrossingState = raw ? JSON.parse(raw) : initialCrossing;
  const code = detectStateFromCoords(location.coords.latitude, location.coords.longitude);
  const next = advanceCrossing(previous, code, location.timestamp, location.coords.accuracy);
  await AsyncStorage.setItem(key, JSON.stringify(next.state));
  useLocationStore.getState().setCurrentState(next.state.current);
  if (!next.crossed || !next.state.current) return;
  if (useUserStore.getState().userId !== id) {
    useUserStore.getState().reset();
    useUserStore.getState().setUserId(id);
    try { await loadAccount(id); } catch { /* Unknown guidance is safe offline. */ }
  }
  const profile = useUserStore.getState();
  // A session change or tracking stop during the request cancels delivery.
  if (profile.userId !== id || !(await getPreferences(id)).tracking) return;
  let notificationId: string | null = null;
  if ((await getPreferences(id)).alerts) {
    const status = await getCarryStatusForUser(next.state.current, profile.permits, profile.firearmsProfile);
    const latest = await getPreferences(id);
    const { data: currentAuth } = await supabase.auth.getSession();
    if (currentAuth.session?.user.id !== id || !latest.tracking) return;
    if (latest.alerts) notificationId = await sendCrossingAlert(next.state.current, status);
  }
  if ((await getPreferences(id)).saveHistory && useUserStore.getState().userId === id) {
    useLocationStore.getState().recordCrossing(previous.current, next.state.current);
    const { error } = await logCrossingEvent(id, previous.current, next.state.current, notificationId ?? undefined);
    if (error && __DEV__) console.warn('[location] Crossing history could not sync:', error.message);
  }
}
function enqueue(location: Location.LocationObject) {
  work = work.then(() => processPosition(location)).catch(error => {
    if (__DEV__) console.warn('[location] Update failed:', error.message);
  });
  return work;
}
if (Platform.OS !== 'web' && !TaskManager.isTaskDefined(TASK)) TaskManager.defineTask<{ locations: Location.LocationObject[] }>(TASK, async ({ data, error }) => {
  if (error || !data) return;
  for (const location of data.locations) await enqueue(location);
});
export async function requestPermissions() {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') return false;
  if (Platform.OS === 'web') return false;
  const bg = await Location.requestBackgroundPermissionsAsync();
  return bg.status === 'granted';
}
export async function startTracking(): Promise<void> {
  if (starting) return starting;
  const generation = trackingGeneration;
  starting = (async () => {
    if (Platform.OS === 'web') throw new Error('Automatic crossing alerts require the iOS or Android app.');
    if (!await TaskManager.isAvailableAsync()) throw new Error('Background tracking requires a development or installed build.');
    if (!(await Location.getBackgroundPermissionsAsync()).granted) throw new Error('Enable Always / background location access in Settings.');
    if (!await Location.hasStartedLocationUpdatesAsync(TASK)) await Location.startLocationUpdatesAsync(TASK, {
      accuracy: Location.Accuracy.High, distanceInterval: 75, timeInterval: 10000,
      pausesUpdatesAutomatically: false, showsBackgroundLocationIndicator: true,
      foregroundService: { notificationTitle: 'Crossline is watching for state crossings', notificationBody: 'Turn off background tracking in Profile to stop.', killServiceOnDestroy: true },
    });
    if (!subscription) subscription = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, distanceInterval: 75, timeInterval: 10000 }, enqueue);
    if (generation !== trackingGeneration) { subscription?.remove(); subscription = null; if (await Location.hasStartedLocationUpdatesAsync(TASK)) await Location.stopLocationUpdatesAsync(TASK); return; }
    useLocationStore.setState({ isTracking: true, trackingError: null });
    void Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }).then(enqueue).catch(() => {});
  })().catch(async error => {
    subscription?.remove(); subscription = null;
    useLocationStore.setState({ isTracking: false, trackingError: error.message });
    if (Platform.OS !== 'web' && await Location.hasStartedLocationUpdatesAsync(TASK).catch(() => false)) await Location.stopLocationUpdatesAsync(TASK);
    throw error;
  }).finally(() => { starting = null; });
  return starting;
}
export async function stopTracking() {
  trackingGeneration++;
  subscription?.remove(); subscription = null;
  if (Platform.OS !== 'web' && await Location.hasStartedLocationUpdatesAsync(TASK).catch(() => false)) await Location.stopLocationUpdatesAsync(TASK);
  useLocationStore.getState().setTracking(false);
}
export function _devSimulateCrossing(toState: string) {
  if (__DEV__) { useLocationStore.getState().setCurrentState(toState); void sendCrossingAlert(toState, 'unknown'); }
}
export function getCurrentState() { return useLocationStore.getState().currentState; }
