import AsyncStorage from '@react-native-async-storage/async-storage';
export interface Preferences { alerts: boolean; tracking: boolean; saveHistory: boolean }
export const defaults: Preferences = { alerts: true, tracking: false, saveHistory: false };
const key = (id: string) => `crossline:preferences:${id}`;
export async function getPreferences(id: string): Promise<Preferences> {
  const raw = await AsyncStorage.getItem(key(id));
  return raw ? { ...defaults, ...JSON.parse(raw) } : { ...defaults };
}
export async function savePreferences(id: string, value: Partial<Preferences>) {
  const next = { ...await getPreferences(id), ...value };
  await AsyncStorage.setItem(key(id), JSON.stringify(next));
  return next;
}
