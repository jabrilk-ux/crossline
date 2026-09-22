import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { detectStateFromCoords } from './geofence';
import { useLocationStore } from '../store/locationStore';
import { useUserStore } from '../store/userStore';

export interface MapPosition { latitude: number; longitude: number; accuracy: number; timestamp: number }

// Foreground-only location: never stored or sent to Crossline's backend.
export function useMapLocation() {
  const userId = useUserStore(s => s.userId);
  const [enabled, setEnabled] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [position, setPosition] = useState<MapPosition | null>(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  useFocusEffect(useCallback(() => {
    if (!enabled) return;
    let active = true;
    let watch: number | undefined;
    function stop() {
      if (watch !== undefined) navigator.geolocation?.clearWatch(watch);
      watch = undefined;
    }
    function start() {
      stop();
      if (document.hidden) return;
      if (!navigator.geolocation) { setError('Location is unavailable in this browser.'); return; }
      setError('');
      watch = navigator.geolocation.watchPosition(p => {
        if (!active || !userId || useUserStore.getState().userId !== userId) return;
        const { latitude, longitude, accuracy } = p.coords;
        if (![latitude, longitude, accuracy].every(Number.isFinite) || accuracy < 0) return;
        setPosition({ latitude, longitude, accuracy, timestamp: p.timestamp });
        useLocationStore.setState({ browserLocation: { stateCode: detectStateFromCoords(latitude, longitude), timestamp: p.timestamp, userId } });
        setNow(Date.now()); setError('');
      }, e => {
        if (!active || !userId || useUserStore.getState().userId !== userId) return;
        setError(e.code === 1 ? 'Location permission is blocked. Allow location for this site in your browser settings, then choose Locate me.' : e.code === 3 ? 'Location timed out. Check device location services and try Locate me again.' : 'Location is unavailable. Check device location services and try Locate me again.');
        if (e.code === 1) { useLocationStore.setState({ browserLocation: null }); stop(); setPosition(null); setEnabled(false); }
      }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
    }
    const visibility = () => { if (document.hidden) { stop(); setError('Location paused while this tab is hidden.'); } else start(); };
    start();
    document.addEventListener('visibilitychange', visibility);
    const timer = setInterval(() => setNow(Date.now()), 5000);
    return () => { active = false; stop(); clearInterval(timer); document.removeEventListener('visibilitychange', visibility); };
  }, [enabled, attempt, userId]));
  return { position, error, enabled, stale: !!position && (now - position.timestamp > 30000 || !!error || !enabled),
    locate: () => { setError(''); setEnabled(true); setAttempt(n => n + 1); },
    stop: () => { useLocationStore.setState({ browserLocation: null }); setEnabled(false); setPosition(null); setError(''); },
  };
}
