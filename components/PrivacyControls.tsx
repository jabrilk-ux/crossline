import { useEffect, useState } from 'react';
import { Alert, Button, Switch, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useUserStore } from '../store/userStore';
import { defaults, getPreferences, savePreferences, type Preferences } from '../services/preferences';
import { requestPermissions, startTracking, stopTracking } from '../services/location';
import { clearHistory, clearLocalAccount } from '../services/account';
import { supabase } from '../services/supabase';
import { requestCrossingNotifications } from '../services/notifications';
import { useLocationStore } from '../store/locationStore';
import { colors } from '../constants/theme';
export default function PrivacyControls() {
  const trackingError = useLocationStore(s => s.trackingError);
  const id = useUserStore(s => s.userId);
  const router = useRouter();
  const [prefs, setPrefs] = useState(defaults);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => { let active = true; if (id) void getPreferences(id).then(p => { if (active) { setPrefs(p); setReady(true); } }).catch(() => setMessage('Could not load preferences. Reopen Profile to retry.')); return () => { active = false; }; }, [id]);
  async function change(key: keyof Preferences, value: boolean) {
    if (!id) return;
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
    if (!id) return;
    setBusy(true); setMessage('');
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user?.email) throw userError ?? new Error('Sign in again before deleting your account.');
      const { error: authError } = await supabase.auth.signInWithPassword({ email: userData.user.email, password });
      if (authError) throw authError;
      await savePreferences(id, { tracking: false });
      await stopTracking();
      const { error } = await supabase.functions.invoke('delete-account');
      if (error) throw error;
      await clearLocalAccount(id);
      await supabase.auth.signOut({ scope: 'local' });
      router.replace('/');
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Deletion failed. Retry.'); }
    finally { setBusy(false); }
  }
  return <View style={{ gap: 14, marginTop: 24, padding: 16, backgroundColor: colors.steel, borderRadius: 12 }}>
    <Text style={{ color: colors.white, fontSize: 20 }}>Location & privacy</Text>
    {([['tracking', 'Background tracking'], ['alerts', 'Crossing alerts'], ['saveHistory', 'Save crossing history to my account']] as const).map(([key,label]) => <View key={key} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ color: colors.white, flex: 1 }}>{label}</Text><Switch accessibilityLabel={label} disabled={!ready || busy} value={prefs[key]} onValueChange={v => { void change(key,v); }} /></View>)}
    <Text style={{ color: colors.silver }}>History saving is off by default. Turning it off stops new saved history; use Clear history to delete earlier entries.</Text>
    <Button title="Clear saved crossing history" disabled={busy} onPress={() => Alert.alert('Clear history?', 'This deletes all saved crossings from your account.', [{ text: 'Cancel' }, { text: 'Clear history', style: 'destructive', onPress: () => { setBusy(true); void (async () => { if (id) { setPrefs(await savePreferences(id, { saveHistory: false })); } await stopTracking(); await clearHistory(); setMessage('History cleared. Saving history is now off.'); if (prefs.tracking) await startTracking(); })().catch(e => setMessage(e.message)).finally(() => setBusy(false)); } }])} />
    <Button title="Privacy and beta information" onPress={() => router.push('/privacy')} />
    <Button title="Delete my account" color={colors.danger} disabled={busy} onPress={() => setDeleting(!deleting)} />
    {deleting && <><Text style={{ color: colors.silver }}>This permanently deletes your account, profile, permits and crossing history. Enter your password to confirm.</Text><TextInput accessibilityLabel="Password to confirm account deletion" placeholder="Account password" placeholderTextColor={colors.silver} secureTextEntry value={password} onChangeText={setPassword} style={{ color: colors.white, padding: 14 }} /><Button title="Permanently delete account" color={colors.danger} disabled={busy || !password} onPress={removeAccount} /></>}
    {trackingError ? <Text style={{ color: colors.warning }}>{trackingError}</Text> : null}
    {message ? <Text accessibilityLiveRegion="polite" style={{ color: colors.silver }}>{message}</Text> : null}
  </View>;
}
