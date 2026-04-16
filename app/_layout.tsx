import { useEffect, useRef } from 'react';
import { Stack } from 'expo-router';
import { useRouter } from 'expo-router';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';
import * as SplashScreen from 'expo-splash-screen';
import * as ExpoNotifications from 'expo-notifications';

import { validateGeoJSON } from '../services/geofence';
import { startTracking, onStateCrossing } from '../services/location';
import {
  registerForPushNotifications,
  sendCrossingAlert,
  getCarryStatusForState,
} from '../services/notifications';
import { useUserStore } from '../store/userStore';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const { isOnboarded, permits } = useUserStore();
  const unsubscribeCrossingRef = useRef<(() => void) | null>(null);
  const notificationListenerRef = useRef<ExpoNotifications.Subscription | null>(null);
  const responseListenerRef = useRef<ExpoNotifications.Subscription | null>(null);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
    JetBrainsMono_400Regular,
  });

  // ─── Font / splash gate ───────────────────────────────────────────────────

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // ─── Core services bootstrap ──────────────────────────────────────────────

  useEffect(() => {
    if (!fontsLoaded || !isOnboarded) return;

    if (__DEV__) {
      validateGeoJSON();
    }

    // Start location tracking
    startTracking().catch(err => {
      if (__DEV__) console.warn('[_layout] startTracking failed:', err);
    });

    // Register for push notifications
    registerForPushNotifications().catch(err => {
      if (__DEV__) console.warn('[_layout] registerForPushNotifications failed:', err);
    });

    // Listen for state crossings → send notification
    unsubscribeCrossingRef.current = onStateCrossing(async (newState, _prevState) => {
      const permitTypes = permits.map(p => p.permitType);
      const carryStatus = await getCarryStatusForState(newState);
      await sendCrossingAlert(newState, carryStatus);

      if (__DEV__) {
        console.log(`[_layout] Crossed into ${newState}, carryStatus=${carryStatus}`);
      }
    });

    // Handle notification tap — navigate to laws screen for that state
    responseListenerRef.current =
      ExpoNotifications.addNotificationResponseReceivedListener(response => {
        const stateCode = response.notification.request.content.data?.stateCode as string | undefined;
        if (stateCode) {
          router.push(`/(tabs)/laws?state=${stateCode}`);
        }
      });

    return () => {
      unsubscribeCrossingRef.current?.();
      notificationListenerRef.current?.remove();
      responseListenerRef.current?.remove();
    };
  }, [fontsLoaded, isOnboarded]);

  if (!fontsLoaded) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
