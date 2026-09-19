import OfflineBrief from '../components/OfflineBrief';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Button, Text, View, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono/400Regular';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { supabase, startAuthAutoRefresh } from '../services/supabase';
import { loadAccount } from '../services/account';
import { startTracking, stopTracking } from '../services/location';
import { getPreferences } from '../services/preferences';
import { useUserStore } from '../store/userStore';
import { useLocationStore } from '../store/locationStore';
import { colors } from '../constants/theme';

void SplashScreen.preventAutoHideAsync();
export default function RootLayout() {
  const router = useRouter();
  const { userId, isOnboarded } = useUserStore();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_600SemiBold, Inter_700Bold, JetBrainsMono_400Regular });
  useEffect(startAuthAutoRefresh, []);
  useEffect(() => {
    let active = true;
    let generation = 0;
    let currentUser: string | null | undefined;
    async function sync(id: string | null) {
      if (id === currentUser) return;
      currentUser = id;
      const version = ++generation;
      setReady(false); setError('');
      await stopTracking().catch(() => {});
      if (!active || version !== generation) return;
      useUserStore.getState().reset();
      useLocationStore.setState({ currentState: null, previousState: null, crossingHistory: [], isTracking: false });
      useUserStore.getState().setUserId(id);
      try {
        if (id) await loadAccount(id);
        if (active && version === generation) setReady(true);
      } catch {
        if (active && version === generation) setError('Could not load your account. Check your connection and retry.');
      }
    }
    // Defer database calls until the Auth callback has released its lock.
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') router.replace('/reset-password');
      setTimeout(() => { if (active) void sync(session?.user.id ?? null); }, 0);
    });
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setError(error.message);
      else void sync(data.session?.user.id ?? null);
    });
    return () => { active = false; generation++; data.subscription.unsubscribe(); };
  }, [attempt]);
  useEffect(() => {
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);
  useEffect(() => {
    let active = true;
    if (ready && userId && isOnboarded) void getPreferences(userId).then(async p => {
      if (active && p.tracking) await startTracking();
    }).catch(() => useLocationStore.getState().setTracking(false));
    return () => { active = false; };
  }, [ready, userId, isOnboarded]);
  const openNotification = useCallback((response: Notifications.NotificationResponse | null) => {
    const code = response?.notification.request.content.data?.stateCode;
    if (userId && isOnboarded && typeof code === 'string' && /^[A-Z]{2}$/.test(code)) router.push(`/(tabs)/laws?state=${code}`);
  }, [userId, isOnboarded]);
  useEffect(() => {
    if (!ready || Platform.OS === 'web') return;
    const listener = Notifications.addNotificationResponseReceivedListener(openNotification);
    void Notifications.getLastNotificationResponseAsync().then(openNotification).catch(() => {});
    return () => listener.remove();
  }, [ready, openNotification]);
  if (!ready || (!fontsLoaded && !fontError)) return <View style={{ flex: 1, padding: 30, backgroundColor: colors.navy, justifyContent: 'center', gap: 20 }}>
    {error ? <><Text style={{ color: colors.white }}>{error}</Text><OfflineBrief userId={userId} /><Button title="Retry" onPress={() => setAttempt(n => n + 1)} /><Button title="Sign out" onPress={() => { void supabase.auth.signOut(); }} /></> : <ActivityIndicator accessibilityLabel="Loading your account" color={colors.sky} />}
  </View>;
  return <Stack screenOptions={{ headerShown: false }}>
    <Stack.Screen name="index" />
    <Stack.Screen name="auth-callback" />
    <Stack.Screen name="reset-password" />
    <Stack.Screen name="privacy" />
    <Stack.Screen name="references" />
    <Stack.Protected guard={!userId || !isOnboarded}><Stack.Screen name="(auth)" /></Stack.Protected>
    <Stack.Protected guard={Boolean(userId && isOnboarded)}><Stack.Screen name="(tabs)" /><Stack.Screen name="paywall" /></Stack.Protected>
  </Stack>;
}
