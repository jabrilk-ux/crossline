import type { ExpoConfig, ConfigContext } from 'expo/config';
export default ({ config }: ConfigContext): ExpoConfig => {
  const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID;
  const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
  return {
    ...config,
    name: config.name ?? 'Crossline', slug: config.slug ?? 'crossline',
    ...(projectId && /^[0-9a-f-]{36}$/i.test(projectId) ? { extra: { ...config.extra, eas: { projectId } } } : {}),
    android: { ...config.android, ...(key && !key.startsWith('your-') ? { config: { ...config.android?.config, googleMaps: { apiKey: key } } } : {}) },
  };
};
