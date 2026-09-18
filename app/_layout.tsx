import { useEffect, useRef } from 'react';
import { Stack } from 'expo-router';
import { useRouter } from 'expo-router';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';
import * as SplashScreen from 'expo-splash-screen';
import * as ExpoNotifications from 'expo-notifications';
import Purchases from 'react-native-purchases';

import { validateGeoJSON } from '../services/geofence';
import { startTracking, onStateCrossing } from '../services/location';
import {
  registerForPushNotifications,
  sendCrossingAlert,
  getCarryStatusForState,
} from '../services/notifications';
import {
  initializePurchases,
  getCustomerInfo,
  getTierFromCustomerInfo,
  type CustomerInfo,
} from '../services/revenuecat';
import { useUserStore } from '../store/userStore';
import { startAuthAutoRefresh } from '../services/supabase';

SplashScreen.preventAutoHideAsync();

// Initialize RevenueCat before the component tree mounts
initializePurchases();

export default function RootLayout() {
  useEffect(startAuthAutoRefresh, []);
  const router = useRouter();
  const {
    isOnboarded, permits,
    setSubscriptionTier, setCustomerInfo,
    incrementAlertCount, resetAlertCount, setAlertCountResetMonth,
  } = useUserStore();

  const unsubscribeCrossingRef = useRef<(() => void) | null>(null);
  const notificationListenerRef = useRef<ExpoNotifications.Subscription | null>(null);
  const responseListenerRef = useRef<ExpoNotifications.Subscription | null>(null);
  const rcListenerRef = useRef<any>(null);

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

    // Bootstrap RevenueCat customer info
    getCustomerInfo().then(info => {
      if (info) {
        setCustomerInfo(info as unknown as Record<string, unknown>);
        setSubscriptionTier(getTierFromCustomerInfo(info));
      }
    });

    // Listen for subscription changes
    rcListenerRef.current = Purchases.addCustomerInfoUpdateListener((info: CustomerInfo) => {
      setCustomerInfo(info as unknown as Record<string, unknown>);
      setSubscriptionTier(getTierFromCustomerInfo(info));
    });

    // Listen for state crossings → check alert quota → send notification
    unsubscribeCrossingRef.current = onStateCrossing(async (newState, _prevState) => {
      const carryStatus = await getCarryStatusForState(newState);

      // Enforce free-tier alert limit (3/month)
      const store = useUserStore.getState();
      const currentMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'

      if (store.alertCountResetMonth !== currentMonth) {
        setAlertCountResetMonth(currentMonth);
        resetAlertCount();
      }

      const { subscriptionTier, monthlyAlertCount } = useUserStore.getState();
      if (subscriptionTier === 'free' && monthlyAlertCount >= 3) {
        if (__DEV__) {
          console.log(`[_layout] Free alert limit reached (${monthlyAlertCount}/3), suppressing notification`);
        }
        return;
      }

      incrementAlertCount();
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
      rcListenerRef.current?.remove?.();
    };
  }, [fontsLoaded, isOnboarded]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!fontsLoaded) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
