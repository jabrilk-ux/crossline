import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useRouter } from 'expo-router';
import { STATES } from '../constants/states';
import { colors, statusColors } from '../constants/theme';
import { useUserStore } from '../store/userStore';
import { getCarryStatusesForUser } from '../services/laws';
import { getLegalReference } from '../services/legalReferences';
import type { CarryStatus } from '../services/notifications';
import borders from '../data/state-borders.json';
import { useMapLocation } from '../services/useMapLocation';
import { detectStateFromCoords } from '../services/geofence';

type ViewBox = [number, number, number, number];
const regions: Record<string, ViewBox> = {
  'United States': [-126, -69, 61, 39],
  'East Coast': [-85, -65, 21, 34],
  Alaska: [-190, -97, 63, 31],
  Hawaii: [-161, -31, 7, 7],
};
const labels: Record<CarryStatus, string> = { allowed: 'Reviewed guidance', restricted: 'Restrictions apply', prohibited: 'Reviewed prohibition', unknown: 'Unknown' };
// Longitude is unwrapped for Alaska's islands across the date line.
const point = ([lng, lat]: number[]) => [lng > 0 ? lng - 360 : lng, -lat / 0.75];
const shapes = (borders as GeoJSON.FeatureCollection).features.flatMap(feature => {
  const code = String(feature.properties?.STUSPS);
  const state = STATES.find(s => s.code === code);
  const geometry = feature.geometry;
  if (!state || (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon')) return [];
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  const points = polygons.flat(2).map(point);
  const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
  const bounds: ViewBox = [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
  return [{ ...state, bounds, path: polygons.map(poly => poly.map(ring => ring.map((p, i) => `${i ? 'L' : 'M'}${point(p).join(',')}`).join(' ') + 'Z').join(' ')).join(' ') }];
});
const control: CSSProperties = { background: colors.steel, color: 'white', border: '1px solid #58708c', borderRadius: 8, padding: '10px 14px', minHeight: 44, cursor: 'pointer', font: 'inherit' };

export default function StateMap() {
  const router = useRouter();
  const location = useMapLocation();
  const following = useRef(true);
  const [follow, setFollow] = useState(true);
  function pauseFollow() { following.current = false; setFollow(false); }
  const position = location.position;
  const currentCode = position ? detectStateFromCoords(position.latitude, position.longitude) : null;
  const currentName = STATES.find(s => s.code === currentCode)?.name;
  const locationPoint = position ? point([position.longitude, position.latitude]) : null;
  const { permits, firearmsProfile, homeState } = useUserStore();
  const [statuses, setStatuses] = useState<Record<string, CarryStatus>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState('');
  const [view, setView] = useState<ViewBox>(regions['United States']);
  const [region, setRegion] = useState('United States');
  const drag = useRef<{ x: number; y: number; view: ViewBox; scale: number; moved: boolean; code: string | null } | null>(null);
  useEffect(() => {
    let active = true;
    setLoading(true); setStatuses({});
    getCarryStatusesForUser(STATES.map(s => s.code), permits, firearmsProfile)
      .then(result => { if (active) setStatuses(result); })
      .catch(() => { if (active) setStatuses({}); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [permits, firearmsProfile, homeState]);
  useEffect(() => {
    if (!position || !following.current || location.stale) return;
    const [x,y] = point([position.longitude,position.latitude]);
    setView(previous => { const size = Math.min(previous[2], 6); return [x-size/2,y-size/2,size,size]; });
  }, [position, location.stale]);
  const state = STATES.find(s => s.code === selected);
  const status = statuses[selected] ?? 'unknown';
  function zoom(factor: number) {
    setView(([x,y,w,h]) => { const width = Math.max(1, Math.min(90, w * factor)); const height = h * width / w; return [x + (w-width)/2, y + (h-height)/2, width, height]; });
  }
  function choose(code: string, focus = false) {
    if (focus) pauseFollow();
    setSelected(code);
    if (focus) {
      const shape = shapes.find(s => s.code === code);
      if (shape) { const [x,y,w,h] = shape.bounds; const size = Math.max(w,h,2) * 1.3; setView([x+w/2-size/2,y+h/2-size/2,size,size]); }
    }
  }
  return <main style={{ flex: 1, overflowY: 'auto', background: colors.navy, color: 'white', fontFamily: 'Inter_400Regular, sans-serif', padding: '24px clamp(16px, 4vw, 48px)' }}>
    <h1 style={{ margin: '0 0 8px', fontSize: 28 }}>Explore the map</h1>
    <p style={{ color: '#b7c8dc', margin: '0 0 20px', lineHeight: 1.5 }}>Select a state to explore guidance and official sources. Drag to pan; use + and − to zoom.</p>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
      <select aria-label="Map region" value={region} style={control} onChange={e => { pauseFollow(); setRegion(e.target.value); setView(regions[e.target.value]); }}>
        {Object.keys(regions).map(name => <option key={name}>{name}</option>)}
      </select>
      <select aria-label="Find a state" value={selected} style={{ ...control, maxWidth: '100%' }} onChange={e => choose(e.target.value, true)}>
        <option value="">Find a state…</option>{STATES.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
      </select>
      <button style={control} aria-label="Zoom in" onClick={() => zoom(0.7)}>+</button>
      <button style={control} aria-label="Zoom out" onClick={() => zoom(1/0.7)}>−</button>
      <button style={control} onClick={() => { pauseFollow(); setView(regions[region]); }}>Reset view</button>
    </div>
    <div style={{ display:'flex',gap:10,flexWrap:'wrap',marginBottom:12 }}>
      <button style={control} onClick={() => { following.current=true; setFollow(true); location.locate(); if(locationPoint) setView([locationPoint[0]-3,locationPoint[1]-3,6,6]); }}>Locate me</button>
      {location.enabled && <button style={control} onClick={location.stop}>Stop location</button>}
    </div>
    <p role="status" style={{color:'#c4d3e3',lineHeight:1.5}}>
      {location.error || (position ? `${location.stale ? 'Last known location' : 'Your location'}${currentName ? ` · ${currentName}` : ' · Outside mapped U.S. states'} · Accuracy ±${Math.round(position.accuracy)} m · Updated ${new Date(position.timestamp).toLocaleTimeString()}${follow && !location.stale ? ' · Following you' : ''}` : location.enabled ? 'Finding your location… Allow location access when your browser asks.' : 'Location is off. Choose Locate me to show your position.')}
    </p>
    <svg aria-label="Interactive state map" role="group" viewBox={view.join(' ')}
      style={{ width: '100%', height: 'clamp(320px, 53vh, 620px)', display: 'block', background: '#10243b', borderRadius: 14, border: '1px solid #35516e', touchAction: 'none', cursor: 'grab' }}
      onPointerDown={e => {
        if (!e.isPrimary || e.button !== 0) return;
        const rect = e.currentTarget.getBoundingClientRect();
        drag.current = { x:e.clientX, y:e.clientY, view, scale:Math.min(rect.width/view[2],rect.height/view[3]), moved:false, code:(e.target as Element).closest('[data-state]')?.getAttribute('data-state') ?? null };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={e => {
        const d = drag.current; if (!d) return;
        const dx=e.clientX-d.x, dy=e.clientY-d.y;
        if (Math.hypot(dx,dy)>5) d.moved=true;
        if (d.moved) { pauseFollow(); }
        if (d.moved) setView([d.view[0]-dx/d.scale,d.view[1]-dy/d.scale,d.view[2],d.view[3]]);
      }}
      onPointerUp={e => { const d=drag.current; drag.current=null; if(e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); if(d && !d.moved && d.code) choose(d.code); }}
      onPointerCancel={() => { drag.current=null; }} onLostPointerCapture={() => { drag.current=null; }}>
      <style>{'.crossline-state:hover,.crossline-state:focus { fill: #467bab; outline: none; stroke: white; stroke-width: 2px; }'}</style>
      {shapes.map(s => <path key={s.code} className="crossline-state" data-state={s.code} d={s.path} fillRule="evenodd"
        fill={s.code === selected ? '#467bab' : (statuses[s.code] && statuses[s.code] !== 'unknown' ? statusColors[statuses[s.code]] : '#304b67')}
        stroke={s.code === selected ? 'white' : '#91aac2'} strokeWidth={s.code === selected ? 2 : 0.8} vectorEffect="non-scaling-stroke"
        role="button" tabIndex={0} aria-label={`${s.name}: ${labels[statuses[s.code] ?? 'unknown']}`} aria-pressed={s.code === selected}
        onClick={e => { if(e.detail === 0) choose(s.code); }}
        onKeyDown={e => { if(e.key==='Enter'||e.key===' ') { e.preventDefault(); choose(s.code,true); } }}>
        <title>{s.name} · {labels[statuses[s.code] ?? 'unknown']}</title>
      </path>)}
      {position && locationPoint && <g role="img" aria-label={location.stale ? 'Last known location' : 'Your location'} pointerEvents="none">
        <ellipse cx={locationPoint[0]} cy={locationPoint[1]} rx={position.accuracy / (111320 * Math.max(0.01, Math.cos(position.latitude*Math.PI/180)))} ry={position.accuracy / (111320 * 0.75)} fill="#38bdf833" stroke="#38bdf8" vectorEffect="non-scaling-stroke" />
        <circle cx={locationPoint[0]} cy={locationPoint[1]} r={Math.min(view[2],view[3])*0.012} fill={location.stale ? '#94a3b8' : '#38bdf8'} stroke="white" strokeWidth={2} vectorEffect="non-scaling-stroke" />
      </g>}
    </svg>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, padding: '14px 0', fontSize: 13 }}>
      {(Object.keys(labels) as CarryStatus[]).map(key => <span key={key}><span style={{ display:'inline-block', width:10, height:10, borderRadius:5, background:key==='unknown'?'#304b67':statusColors[key], border:'1px solid #91aac2', marginRight:6 }} />{labels[key]}</span>)}
    </div>
    <section aria-live="polite" style={{ border:'1px solid #35516e', borderRadius:14, padding:20, background:'#122a43' }}>
      <h2 style={{ margin:'0 0 10px',fontSize:22 }}>{state?.name ?? 'Choose a state'}</h2>
      <p style={{ color:'#c4d3e3',lineHeight:1.6,margin:'0 0 14px' }}>{loading ? 'Loading reviewed guidance…' : state ? `${labels[status]}. ${status === 'unknown' ? 'Unable to determine carry status from the available reviewed rules and your profile.' : 'Check the full conditions and sources for your profile before relying on this guidance.'}` : 'Click a state on the map or use “Find a state” above, including small states and Washington D.C.'}</p>
      {state && <><p style={{ color:'#c4d3e3',lineHeight:1.6 }}>{getLegalReference(state.code) ? 'Included in the 14-state East Coast reference beta.' : 'Outside the East Coast reference beta. Verify this jurisdiction separately.'}</p>
        <div style={{ display:'flex',flexWrap:'wrap',gap:10 }}><button style={control} onClick={() => router.push(`/(tabs)/laws?state=${state.code}`)}>View state guidance</button>
        {getLegalReference(state.code) && <button style={control} onClick={() => router.push({ pathname:'/references',params:{state:state.code} })}>Official state references</button>}</div></>}
    </section>
    <p style={{color:'#b7c8dc',fontSize:12,lineHeight:1.5}}>Live location while this map is open · Coordinates stay on this device · No street navigation. Unknown does not mean permitted. Reference coverage is not a legal clearance.</p>
  </main>;
}
