import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { STATES } from '../constants/states';
import { colors } from '../constants/theme';
import { useUserStore } from '../store/userStore';
import { getCarryStatusesForUser } from '../services/laws';
import { getLegalReference } from '../services/legalReferences';
import type { CarryStatus } from '../services/notifications';
import { useMapLocation } from '../services/useMapLocation';
import { detectStateFromCoords } from '../services/geofence';
import StreetMap, { type MapView } from './StreetMap.web';

const labels: Record<CarryStatus, string> = { allowed: 'Reviewed guidance', restricted: 'Restrictions apply', prohibited: 'Reviewed prohibition', unknown: 'Unknown' };
export default function StateMap() {
  const router = useRouter();
  const location = useMapLocation();
  const [following, setFollowing] = useState(true);
  const [recenter, setRecenter] = useState(0);
  const { permits, firearmsProfile, homeState } = useUserStore();
  const [selected, setSelected] = useState(homeState ?? '');
  const [region, setRegion] = useState('United States');
  const [view, setView] = useState<MapView>({ region: 'United States', revision: 0 });
  const [statuses, setStatuses] = useState<Record<string, CarryStatus>>({});
  const [loading, setLoading] = useState(true);
  const position = location.position;
  const currentCode = position ? detectStateFromCoords(position.latitude, position.longitude) : null;
  const currentName = STATES.find(s => s.code === currentCode)?.name;
  useEffect(() => {
    let active = true;
    setLoading(true); setStatuses({});
    getCarryStatusesForUser(STATES.map(s => s.code), permits, firearmsProfile)
      .then(result => { if (active) setStatuses(result); })
      .catch(() => { if (active) setStatuses({}); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [permits, firearmsProfile, homeState]);
  useEffect(() => { if (following && currentCode && !location.stale) setSelected(currentCode); }, [currentCode, following, location.stale]);
  const state = STATES.find(s => s.code === selected);
  const status = statuses[selected] ?? 'unknown';
  function choose(code: string, zoom = false) {
    setFollowing(false); setSelected(code);
    if (zoom) setView(previous => ({ code, revision: previous.revision + 1 }));
  }
  return <main className="crossline-map-page" style={{ flex: 1, overflowY: 'auto', background: colors.navy, color: colors.white, fontFamily: 'Geist_400Regular, sans-serif', padding: '28px clamp(16px, 3vw, 40px)' }}>
    <div style={{ maxWidth: 1500, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
        <div><h1 style={{ margin: '0 0 6px', fontSize: 30 }}>Live map</h1><p style={{ color: colors.muted, margin: 0, lineHeight: 1.5 }}>Your surroundings. Your state. Guidance along the way.</p></div>
        <div className="crossline-map-controls"><button className="crossline-locate" aria-label="Locate me" onClick={() => { setFollowing(true); setRecenter(n => n + 1); location.locate(); }}>◎ Locate me</button>{location.enabled && <button onClick={location.stop}>Stop location</button>}</div>
      </div>
      <div className="crossline-map-controls" style={{ marginBottom: 14 }}>
        <select aria-label="Find a state" value={selected} onChange={e => choose(e.target.value, true)}><option value="">Find a state…</option>{STATES.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}</select>
        <select aria-label="Map region" value={region} onChange={e => { const region = e.target.value; setRegion(region); setFollowing(false); setView(previous => ({ region, revision: previous.revision + 1 })); }}>{['United States', 'East Coast', 'Alaska', 'Hawaii'].map(name => <option key={name}>{name}</option>)}</select>
        <button onClick={() => { setFollowing(false); setView(previous => ({ region, revision: previous.revision + 1 })); }}>Reset view</button>
      </div>
      <StreetMap position={position} stale={location.stale} following={following} recenter={recenter} selected={selected} view={view} onSelect={code => choose(code)} onExplore={() => setFollowing(false)} />
      <p role="status" style={{ color: colors.silver, fontSize: 13, lineHeight: 1.7, margin: '14px 0 20px' }}>
        {location.error || (position ? `${location.stale ? 'Last known location' : 'Your location'}${currentName ? ` · ${currentName}` : ''} · Accuracy ±${Math.round(position.accuracy)} m · Updated ${new Date(position.timestamp).toLocaleTimeString()}${following && !location.stale ? ' · Following you' : ' · Tap Locate me to recenter'}` : location.enabled ? 'Finding your location… Allow location access when your browser asks.' : 'Location is off. Choose Locate me to show your position.')}
        {position && position.accuracy > 1000 && !location.error && <><br />Your device is providing an approximate location. The circle shows that uncertainty.</>}
      </p>
      <section aria-live="polite" style={{ border: `1px solid ${colors.border}`, borderRadius: 20, padding: '20px 24px', background: colors.surface }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 23 }}>{state?.name ?? 'Explore state guidance'}</h2>
        <p style={{ color: colors.silver, lineHeight: 1.6, margin: '0 0 14px' }}>{loading ? 'Loading reviewed guidance…' : state ? `${labels[status]}. ${status === 'unknown' ? 'Unable to determine carry status from the available reviewed rules and your profile.' : 'Check the full conditions and sources for your profile before relying on this guidance.'}` : 'Tap the map or choose a state above to see its guidance and official sources.'}</p>
        {state && <><p style={{ color: colors.muted, lineHeight: 1.6, fontSize: 13 }}>{getLegalReference(state.code) ? 'Included in the 14-state East Coast reference beta.' : 'Outside the East Coast reference beta. Verify this jurisdiction separately.'}</p><div className="crossline-map-controls"><button onClick={() => router.push(`/(tabs)/laws?state=${state.code}`)}>View state guidance →</button>{getLegalReference(state.code) && <button onClick={() => router.push({ pathname: '/references', params: { state: state.code } })}>Official state references</button>}</div></>}
      </section>
      <p style={{ color: colors.muted, fontSize: 12, lineHeight: 1.7, marginBottom: 0 }}>Location updates while this map is open. Street maps need an internet connection and load from OpenStreetMap. This map does not provide turn-by-turn directions. <a className="crossline-map-link" href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noreferrer">Report a map issue ↗</a></p>
    </div>
  </main>;
}
