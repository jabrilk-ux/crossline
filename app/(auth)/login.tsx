import { authRedirectUrl, signInWithGoogle } from '../../services/googleAuth';
import { useState } from 'react';
import { View, Text, TextInput, Button, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../services/supabase';
import { colors } from '../../constants/theme';
import { GoogleSignInButton } from '../../components/GoogleSignInButton';
export default function Login() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>(params.mode === 'signup' ? 'signup' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function googleSignIn() {
    setBusy(true); setMessage('');
    try {
      const result = await signInWithGoogle();
      if (result === 'signed-in') router.replace('/');
      if (result === 'cancelled') setMessage('Google sign-in cancelled. You can try again.');
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Google sign-in failed. Please try again.'); }
    finally { setBusy(false); }
  }
  async function submit() {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setMessage('Enter a valid email address.'); return; }
    if (mode !== 'reset' && (mode === 'signup' ? password.length < 12 : !password)) { setMessage(mode === 'signup' ? 'Use a password with at least 12 characters.' : 'Enter your password.'); return; }
    setBusy(true); setMessage('');
    try {
      if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: authRedirectUrl(true) });
        if (error) throw error;
        setMessage('If an account exists, a reset email is on its way. Open it on this device.');
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: authRedirectUrl() } });
        if (error) throw error;
        if (data.session) router.replace('/');
        else setMessage('Check your email to confirm your account. Then return here and sign in.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        router.replace('/');
      }
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Unable to connect. Please try again.'); }
    finally { setBusy(false); }
  }
  return <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.navy }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 28, paddingTop: 80, gap: 22 }}>
      <Text style={{ color: colors.sky, fontSize: 24 }}>CROSSLINE · BETA</Text>
      <Text style={{ color: colors.white, fontSize: 28 }}>{mode === 'signup' ? 'Create your account' : mode === 'reset' ? 'Reset your password' : 'Welcome back'}</Text>
      {mode !== 'reset' && <><GoogleSignInButton disabled={busy} onPress={googleSignIn} /><Text style={{ color: colors.silver }}>Or continue with email</Text></>}
      <TextInput accessibilityLabel="Email address" placeholder="Email address" placeholderTextColor={colors.silver} style={{ padding: 16, backgroundColor: colors.steel, color: colors.white, borderRadius: 10 }} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" value={email} onChangeText={setEmail} />
      {mode !== 'reset' && <TextInput accessibilityLabel="Password" placeholder={mode === 'signup' ? 'Password (12+ characters)' : 'Password'} placeholderTextColor={colors.silver} style={{ padding: 16, backgroundColor: colors.steel, color: colors.white, borderRadius: 10 }} secureTextEntry autoCapitalize="none" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChangeText={setPassword} />}
      {message ? <Text accessibilityLiveRegion="polite" style={{ color: colors.silver }}>{message}</Text> : null}
      <Button title={busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Send reset email' : 'Sign in'} disabled={busy} onPress={submit} />
      <Button title={mode === 'login' ? 'Create an account' : 'Back to sign in'} disabled={busy} onPress={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage(''); }} />
      {mode === 'login' && <Button title="Forgot password?" disabled={busy} onPress={() => { setMode('reset'); setMessage(''); }} />}
      <Button title="Official state references" onPress={() => router.push('/references')} />
      <Button title="Privacy and beta information" onPress={() => router.push('/privacy')} />
    </ScrollView>
  </KeyboardAvoidingView>;
}
