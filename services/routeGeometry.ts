import { lineString, lineIntersect, bbox, booleanPointInPolygon, point } from '@turf/turf';
import borders from '../data/state-borders.json';
const features = (borders as GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon>).features.map(feature => ({ feature, bounds: bbox(feature) }));
// Split every road segment at polygon boundaries; do not sample a straight
// origin-to-destination line or skip small intervening states.
export function statesAlongGeometry(coordinates: number[][]): { states: string[]; hasUnmappedSections: boolean } {
  if (coordinates.length < 2 || coordinates.some(c => c.length < 2 || !c.every(Number.isFinite) || Math.abs(c[0]) > 180 || Math.abs(c[1]) > 90)) throw new Error('Directions returned invalid route coordinates.');
  const states: string[] = [];
  let hasUnmappedSections = false;
  for (let i = 1; i < coordinates.length; i++) {
    const a = coordinates[i-1], b = coordinates[i];
    if (a[0] === b[0] && a[1] === b[1]) continue;
    const candidates = features.filter(({ bounds: [x1,y1,x2,y2] }) => Math.max(a[0],b[0]) >= x1 && Math.min(a[0],b[0]) <= x2 && Math.max(a[1],b[1]) >= y1 && Math.min(a[1],b[1]) <= y2);
    const cuts = [0,1];
    const axis = Math.abs(b[0]-a[0]) >= Math.abs(b[1]-a[1]) ? 0 : 1;
    for (const { feature } of candidates) for (const hit of lineIntersect(lineString([a,b]), feature).features) {
      const t = (hit.geometry.coordinates[axis]-a[axis])/(b[axis]-a[axis]);
      if (t > 0 && t < 1) cuts.push(t);
    }
    cuts.sort((x,y) => x-y);
    for (let j=1;j<cuts.length;j++) {
      if (cuts[j]-cuts[j-1] < 1e-9) continue;
      const t=(cuts[j]+cuts[j-1])/2;
      const mid=point([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);
      const match=candidates.find(({feature})=>booleanPointInPolygon(mid,feature));
      const code=match?.feature.properties?.STUSPS as string | undefined;
      if (!code) { hasUnmappedSections = true; continue; }
      if (states.at(-1) !== code) states.push(code);
    }
  }
  if (!states.length) throw new Error('No supported states found on this route.');
  return { states, hasUnmappedSections };
}
