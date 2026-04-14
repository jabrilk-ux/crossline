// Allow importing .geojson files as typed GeoJSON FeatureCollections
declare module '*.geojson' {
  const value: GeoJSON.FeatureCollection;
  export default value;
}
