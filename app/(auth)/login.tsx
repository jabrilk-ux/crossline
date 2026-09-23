import { authRedirectUrl, signInWithGoogle } from '../../services/googleAuth';
import { useState } from 'react';
import { View, Text, TextInput, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../services/supabase';
import ActionButton from '../../components/ActionButton';
import { colors, typography } from '../../constants/theme';
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
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, paddingTop: 36, gap: 24, width:'100%',maxWidth:500,alignSelf:'center',flexGrow:1 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.canGoBack()?router.back():router.replace('/')} style={{width:44,height:44,borderRadius:22,backgroundColor:colors.surface,alignItems:'center',justifyContent:'center'}}><Text style={{color:colors.textSecondary,fontSize:24}}>←</Text></Pressable>
      <View style={{gap:10}}><Text style={{ ...typography.h1, color: colors.white, letterSpacing:-0.9 }}>{mode === 'signup' ? 'Create your account' : mode === 'reset' ? 'Reset your password' : 'Welcome back'}</Text><Text style={{...typography.body,color:colors.muted,lineHeight:23}}>{mode === 'reset' ? 'We’ll send a link to help you get back in.' : 'Sign in to sync your permits and plan your trips.'}</Text></View>
      <View style={{gap:12}}>
      <Text style={{...typography.caption,color:colors.muted}}>Email address</Text>
      <TextInput accessibilityLabel="Email address" placeholder="you@example.com" placeholderTextColor={colors.dim} style={{ ...typography.body, minHeight:58,padding:16,backgroundColor:colors.surface,color:colors.white,borderRadius:16,borderWidth:1,borderColor:colors.border }} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" value={email} onChangeText={setEmail} />
      {mode !== 'reset' && <><Text style={{...typography.caption,color:colors.muted}}>Password</Text><TextInput accessibilityLabel="Password" placeholder={mode === 'signup' ? 'At least 12 characters' : 'Password'} placeholderTextColor={colors.dim} style={{...typography.body,minHeight:58,padding:16,backgroundColor:colors.surface,color:colors.white,borderRadius:16,borderWidth:1,borderColor:colors.border}} secureTextEntry autoCapitalize="none" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChangeText={setPassword} /></>}
      {mode === 'login' && <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setMode('reset'); setMessage(''); }} style={{alignSelf:'flex-end',paddingVertical:8}}><Text style={{...typography.body,color:colors.skyLight}}>Forgot password?</Text></Pressable>}
      </View>
      {message ? <Text accessibilityLiveRegion="polite" style={{...typography.body,color:colors.textSecondary}}>{message}</Text> : null}
      <ActionButton title={busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Send reset email' : 'Sign in'} disabled={busy} onPress={submit} />
      {mode !== 'reset' && <><View style={{flexDirection:'row',alignItems:'center',gap:12}}><View style={{height:1,backgroundColor:colors.border,flex:1}}/><Text style={{...typography.caption,color:colors.dim}}>or</Text><View style={{height:1,backgroundColor:colors.border,flex:1}}/></View><GoogleSignInButton disabled={busy} onPress={googleSignIn} /></>}
      <ActionButton variant="row" title={mode === 'login' ? 'Create an account' : 'Back to sign in'} disabled={busy} onPress={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage(''); }} />
      <View><ActionButton variant="row" title="Official state references" onPress={() => router.push('/references')} /><ActionButton variant="row" title="Privacy and beta information" onPress={() => router.push('/privacy')} /></View>
    </ScrollView>
  </KeyboardAvoidingView>;
}
