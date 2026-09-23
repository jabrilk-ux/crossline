import Button from './ActionButton';
import { useEffect, useState } from 'react';
import { Alert, Switch, Text, TextInput, View, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useUserStore } from '../store/userStore';
import { defaults, getPreferences, savePreferences, type Preferences } from '../services/preferences';
import { requestPermissions, startTracking, stopTracking } from '../services/location';
import { clearHistory, clearLocalAccount } from '../services/account';
import { supabase } from '../services/supabase';
import { requestCrossingNotifications } from '../services/notifications';
import { useLocationStore } from '../store/locationStore';
import { colors, typography } from '../constants/theme';
export default function PrivacyControls() {
  const trackingError = useLocationStore(s => s.trackingError);
  const id = useUserStore(s => s.userId);
  const router = useRouter();
  const [prefs, setPrefs] = useState(defaults);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => { let active = true; if (id) void getPreferences(id).then(p => { if (active) { setPrefs(p); setReady(true); } }).catch(() => setMessage('Could not load preferences. Reopen Profile to retry.')); return () => { active = false; }; }, [id]);
  async function change(key: keyof Preferences, value: boolean) {
    if (!id) return;
    if (Platform.OS === 'web' && (key === 'tracking' || key === 'alerts')) { router.push('/(tabs)/map'); return; }
    setBusy(true); setMessage('');
    const before = prefs;
    try {
      if (key === 'tracking' && value && !await requestPermissions()) throw new Error('Background permission was not granted. You can still browse laws and plan trips.');
      if (key === 'alerts' && value && !await requestCrossingNotifications()) throw new Error('Enable notifications in your device settings.');
      const notificationPermission = key === 'tracking' && value ? await requestCrossingNotifications() : prefs.alerts;
      const next = await savePreferences(id, { [key]: value, ...(key === 'tracking' && value ? { alerts: notificationPermission } : {}) });
      if (key === 'tracking') { if (value) await startTracking(); else await stopTracking(); }
      if (key === 'saveHistory' && !value) { /* Existing history remains until explicitly cleared. */ }
      setPrefs(next);
    } catch (e) { await savePreferences(id, before); setMessage(e instanceof Error ? e.message : 'Could not save preference.'); }
    finally { setBusy(false); }
  }
  async function removeAccount() {
    if (!id || confirmation !== 'DELETE') return;
    setBusy(true); setMessage('');
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (sessionError || !token || sessionData.session?.user.id !== id) throw new Error('Sign in again before deleting your account.');
      const { data: userData, error: userError } = await supabase.auth.getUser(token);
      if (userError || userData.user?.id !== id) throw new Error('Sign in again before deleting your account.');
      await savePreferences(id, { tracking: false });
      await stopTracking();
      const { error } = await supabase.functions.invoke('delete-account', { headers: { Authorization: `Bearer ${token}` } });
      if (error) throw error;
      await clearLocalAccount(id);
      await supabase.auth.signOut({ scope: 'local' });
      router.replace('/');
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Deletion failed. Retry.'); }
    finally { setBusy(false); }
  }
  return <View style={{ gap: 14, marginTop: 24, padding: 20, backgroundColor: colors.surface, borderRadius: 20, borderWidth:1, borderColor:colors.border }}>
    <Text style={{ ...typography.body, color: colors.white, fontSize: 20 }}>Location & privacy</Text>
    {Platform.OS === 'web' && <><Text style={{ ...typography.body, color: colors.white }}>Browser location works while the map is open. Background crossing alerts require the installed mobile app. Chrome and Codex have separate location permissions.</Text><Button variant="row" title="Open live location map" onPress={() => router.push('/(tabs)/map')} /></>}
    {([['tracking', 'Background tracking'], ['alerts', 'Crossing alerts'], ['saveHistory', 'Save crossing history to my account']] as const).filter(([key]) => Platform.OS !== 'web' || key === 'saveHistory').map(([key,label]) => <View key={key} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ ...typography.body, color: colors.white, flex: 1 }}>{label}</Text><Switch trackColor={{false:colors.border,true:colors.sky}} thumbColor={colors.white} accessibilityLabel={label} disabled={!ready || busy} value={prefs[key]} onValueChange={v => { void change(key,v); }} /></View>)}
    <Text style={{ ...typography.body, color: colors.silver }}>History saving is off by default. Turning it off stops new saved history; use Clear history to delete earlier entries.</Text>
    <Button variant="row" title="Clear saved crossing history" disabled={busy} onPress={() => Alert.alert('Clear history?', 'This deletes all saved crossings from your account.', [{ text: 'Cancel' }, { text: 'Clear history', style: 'destructive', onPress: () => { setBusy(true); void (async () => { if (id) { setPrefs(await savePreferences(id, { saveHistory: false })); } await stopTracking(); await clearHistory(); setMessage('History cleared. Saving history is now off.'); if (Platform.OS !== 'web' && prefs.tracking) await startTracking(); })().catch(e => setMessage(e.message)).finally(() => setBusy(false)); } }])} />
    <Button variant="row" title="Official state references" onPress={() => router.push('/references')} />
      <Button variant="row" title="Privacy and beta information" onPress={() => router.push('/privacy')} />
    <Button variant="row" title="Delete my account" color={colors.danger} disabled={busy} onPress={() => { setDeleting(!deleting); setConfirmation(''); }} />
    {deleting && <><Text style={{ ...typography.body, color: colors.silver }}>This permanently deletes your account, profile, permits and crossing history. Type DELETE to confirm. This deletes your Crossline account, not your Google account.</Text><TextInput accessibilityLabel="Type DELETE to confirm account deletion" placeholder="DELETE" placeholderTextColor={colors.silver} autoCapitalize="characters" autoCorrect={false} value={confirmation} onChangeText={setConfirmation} style={{ ...typography.body, color: colors.white, padding: 14 }} /><Button variant="row" title="Permanently delete account" color={colors.danger} disabled={busy || confirmation !== 'DELETE'} onPress={removeAccount} /></>}
    {Platform.OS !== 'web' && trackingError ? <Text style={{ ...typography.body, color: colors.warning }}>{trackingError}</Text> : null}
    {message ? <Text accessibilityLiveRegion="polite" style={{ ...typography.body, color: colors.silver }}>{message}</Text> : null}
  </View>;
}
