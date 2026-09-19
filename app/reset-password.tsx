import { useState } from 'react';
import { View, Text, TextInput, Button } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../services/supabase';
import { useUserStore } from '../store/userStore';
import { colors } from '../constants/theme';
export default function ResetPassword() {
  const router = useRouter();
  const userId = useUserStore(s => s.userId);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function save() {
    if (password.length < 12 || password !== confirm) { setMessage('Use at least 12 characters and matching passwords.'); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      router.replace('/');
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Could not update password.'); }
    finally { setBusy(false); }
  }
  return <View style={{ flex: 1, padding: 30, justifyContent: 'center', backgroundColor: colors.navy, gap: 18 }}>
    <Text style={{ color: colors.white, fontSize: 26 }}>Set a new password</Text>
    {!userId ? <Text style={{ color: colors.silver }}>Open the password reset email on this device first.</Text> : <>
      <TextInput accessibilityLabel="New password" placeholder="New password" placeholderTextColor={colors.silver} style={{ color: colors.white }} secureTextEntry value={password} onChangeText={setPassword} />
      <TextInput accessibilityLabel="Confirm password" placeholder="Confirm password" placeholderTextColor={colors.silver} style={{ color: colors.white }} secureTextEntry value={confirm} onChangeText={setConfirm} />
      <Button title={busy ? 'Saving…' : 'Save password'} disabled={busy} onPress={save} />
    </>}
    <Text accessibilityLiveRegion="polite" style={{ color: colors.silver }}>{message}</Text><Button title="Back" onPress={() => router.replace('/')} />
  </View>;
}
