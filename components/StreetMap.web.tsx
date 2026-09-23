import { useEffect, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './map.css';
import type { FeatureCollection } from 'geojson';
import borders from '../data/state-borders.json';
import { detectStateFromCoords } from '../services/geofence';
import type { MapPosition } from '../services/useMapLocation';

// Keep Alaska's Aleutian islands together across the date line.
const mapBorders = JSON.parse(JSON.stringify(borders)) as FeatureCollection;
function unwrap(coordinates: unknown): void {
  if (!Array.isArray(coordinates)) return;
  if (typeof coordinates[0] === 'number') { if (coordinates[0] > 0) coordinates[0] -= 360; }
  else coordinates.forEach(unwrap);
}
mapBorders.features.forEach(f => { if (f.properties?.STUSPS === 'AK' && 'coordinates' in f.geometry) unwrap(f.geometry.coordinates); });
const regions: Record<string, L.LatLngBoundsExpression> = {
  'United States': [[24, -125], [49, -66]],
  'East Coast': [[25, -85], [47, -66]],
  Alaska: [[51, -180], [72, -130]],
  Hawaii: [[18.5, -161], [22.5, -154]],
};
export interface MapView { code?: string; region?: string; revision: number }
interface Props {
  position: MapPosition | null;
  stale: boolean;
  following: boolean;
  recenter: number;
  selected: string;
  view: MapView;
  onSelect: (code: string) => void;
  onExplore: () => void;
}
export default function StreetMap(props: Props) {
  const active = useIsFocused();
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const states = useRef<L.GeoJSON | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const accuracy = useRef<L.Circle | null>(null);
  const tiles = useRef<L.TileLayer | null>(null);
  const actions = useRef(props);
  actions.current = props;
  const lastRecenter = useRef(-1);
  const centered = useRef(false);
  const [ready, setReady] = useState(false);
  const [tileError, setTileError] = useState(false);
  useEffect(() => {
    if (!container.current || !active) return;
    const element = container.current;
    const instance = L.map(element, { zoomControl: false, minZoom: 3, maxZoom: 19, worldCopyJump: true, zoomAnimation: false, fadeAnimation: false, markerZoomAnimation: false });
    map.current = instance;
    instance.fitBounds(regions['United States'], { animate: false });
    L.control.zoom({ position: 'topright' }).addTo(instance);
    L.control.scale({ imperial: true, metric: true, position: 'bottomleft' }).addTo(instance);
    tiles.current = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, keepBuffer: 1,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    }).addTo(instance);
    tiles.current.on('loading', () => setTileError(false));
    tiles.current.on('tileerror', () => setTileError(true));
    states.current = L.geoJSON(mapBorders, { interactive: false, style: { color: '#426988', weight: 1.5, fill: false, opacity: 0.65 } }).addTo(instance);
    instance.on('click', (event: L.LeafletMouseEvent) => {
      const code = detectStateFromCoords(event.latlng.lat, event.latlng.wrap().lng);
      if (code) actions.current.onSelect(code);
    });
    instance.on('dragstart', () => actions.current.onExplore());
    const keyboard = (event: KeyboardEvent) => { if (event.key.startsWith('Arrow')) actions.current.onExplore(); };
    element.addEventListener('keydown', keyboard);
    const resize = new ResizeObserver(() => { if (map.current === instance) instance.invalidateSize({ pan: false }); });
    resize.observe(element);
    centered.current = false;
    setReady(true);
    return () => {
      resize.disconnect(); element.removeEventListener('keydown', keyboard);
      instance.remove(); map.current = null; states.current = null;
      marker.current = null; accuracy.current = null; tiles.current = null; setReady(false);
    };
  }, [active]);
  useEffect(() => {
    if (!ready || !map.current) return;
    const { code, region } = props.view;
    if (code) {
      const feature = mapBorders.features.find(f => f.properties?.STUSPS === code);
      if (feature) map.current.fitBounds(L.geoJSON(feature).getBounds(), { padding: [28, 28], maxZoom: 10, animate: false });
    } else if (region && regions[region]) map.current.fitBounds(regions[region], { padding: [12, 12], animate: false });
  }, [props.view, ready]);
  useEffect(() => {
    states.current?.setStyle(feature => ({ color: feature?.properties?.STUSPS === props.selected ? '#2266a4' : '#426988', weight: feature?.properties?.STUSPS === props.selected ? 3 : 1.5, fill: false, opacity: 0.65 }));
  }, [props.selected, ready]);
  useEffect(() => {
    const instance = map.current;
    if (!instance || !ready) return;
    const { position, stale, following, recenter } = props;
    if (!position) {
      marker.current?.remove(); accuracy.current?.remove(); marker.current = null; accuracy.current = null; centered.current = false;
      return;
    }
    const point: L.LatLngExpression = [position.latitude, position.longitude];
    if (!accuracy.current) accuracy.current = L.circle(point, { radius: position.accuracy, weight: 1, fillOpacity: 0.12, interactive: false }).addTo(instance);
    accuracy.current.setLatLng(point).setRadius(position.accuracy).setStyle({ color: stale ? '#64748b' : '#1687ef' });
    if (!marker.current) marker.current = L.marker(point, { interactive: false, keyboard: false, icon: L.divIcon({ className: 'crossline-location', html: '<span></span>', iconSize: [22, 22], iconAnchor: [11, 11] }) }).addTo(instance);
    marker.current.setLatLng(point);
    const element = marker.current.getElement();
    if (element) { element.setAttribute('role', 'img'); element.setAttribute('aria-label', stale ? 'Last known location' : 'Your location'); element.classList.toggle('is-stale', stale); }
    if (following && !stale) {
      if (!centered.current || lastRecenter.current !== recenter) {
        const bounds = L.latLng(point).toBounds(Math.max(position.accuracy * 3, 160));
        instance.fitBounds(bounds, { maxZoom: 16, padding: [36, 36], animate: false });
        centered.current = true; lastRecenter.current = recenter;
      } else instance.panTo(point, { animate: false });
    }
  }, [props.position, props.stale, props.following, props.recenter, ready]);
  return <div className="crossline-map-shell">
    <div ref={container} className="crossline-street-map" role="region" aria-label="Live street map" />
    {tileError && <div className="crossline-tile-error" role="status">Some map tiles could not load. Check your connection. <button onClick={() => { setTileError(false); tiles.current?.redraw(); }}>Retry map</button></div>}
  </div>;
}
