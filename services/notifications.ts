import * as ExpoNotifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getStateFullName } from './geofence';
import { supabase, getSession } from './supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CarryStatus = 'allowed' | 'restricted' | 'prohibited' | 'unknown';

// Configure how notifications present when the app is in the foreground
ExpoNotifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── Permission + token registration ─────────────────────────────────────────

/**
 * registerForPushNotifications()
 * Requests notification permission, retrieves the Expo push token,
 * and stores it on the authenticated user's row in Supabase.
 * Safe to call on every app launch — no-ops if already registered.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'android') {
    await ExpoNotifications.setNotificationChannelAsync('crossings', {
      name: 'State Crossings',
      importance: ExpoNotifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { status: existing } = await ExpoNotifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await ExpoNotifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    if (__DEV__) console.warn('[notifications] Push permission not granted');
    return null;
  }

  let token: string | null = null;
  try {
    const result = await ExpoNotifications.getExpoPushTokenAsync();
    token = result.data;
  } catch (err) {
    // getExpoPushTokenAsync requires a physical device or configured projectId
    if (__DEV__) console.warn('[notifications] Could not get push token (simulator?):', err);
    return null;
  }

  // Persist token to Supabase
  try {
    const { data: sessionData } = await getSession();
    const userId = sessionData.session?.user?.id;
    if (userId && token) {
      await supabase.from('users').update({ push_token: token }).eq('id', userId);
    }
  } catch (err) {
    if (__DEV__) console.warn('[notifications] Failed to persist push token:', err);
  }

  return token;
}

// ─── Notification templates ───────────────────────────────────────────────────

function buildNotificationContent(
  stateCode: string,
  carryStatus: CarryStatus
): ExpoNotifications.NotificationContentInput {
  const stateName = getStateFullName(stateCode);

  switch (carryStatus) {
    case 'allowed':
      return {
        title: `Entered ${stateName}`,
        body: `Your permit is honored here. Carry is permitted. Tap for full ${stateName} laws.`,
        data: { stateCode, carryStatus },
      };
    case 'restricted':
      return {
        title: `Entered ${stateName} — Restrictions Apply`,
        body: `Your permit is honored but ${stateName} has specific restrictions. Tap to review before carrying.`,
        data: { stateCode, carryStatus },
      };
    case 'prohibited':
      return {
        title: `Entered ${stateName} — Carry Not Permitted`,
        body: `Your permit is not recognized in ${stateName}. Tap to review transport and storage rules.`,
        data: { stateCode, carryStatus },
      };
    case 'unknown':
    default:
      return {
        title: `Entered ${stateName}`,
        body: `Tap to review firearm laws for ${stateName}.`,
        data: { stateCode, carryStatus },
      };
  }
}

// ─── Send crossing alert ──────────────────────────────────────────────────────

/**
 * sendCrossingAlert()
 * Schedules an immediate local notification when a state crossing is detected.
 * Returns the notification identifier.
 */
export async function sendCrossingAlert(
  toState: string,
  carryStatus: CarryStatus
): Promise<string | null> {
  try {
    const content = buildNotificationContent(toState, carryStatus);
    const notificationId = await ExpoNotifications.scheduleNotificationAsync({
      content,
      trigger: null, // fire immediately
    });
    if (__DEV__) {
      console.log(
        `[notifications] Crossing alert → ${toState} (${carryStatus}), id: ${notificationId}`
      );
    }
    return notificationId;
  } catch (err) {
    if (__DEV__) console.warn('[notifications] Failed to send crossing alert:', err);
    return null;
  }
}

// ─── Carry status lookup ──────────────────────────────────────────────────────

/**
 * getCarryStatusForState()
 * Queries state_laws for the most recent carry_status row for the given state.
 * Returns 'unknown' when the table has no data for this state yet.
 */
export async function getCarryStatusForState(
  stateCode: string,
): Promise<CarryStatus> {
  try {
    const { data, error } = await supabase
      .from('state_laws')
      .select('carry_status')
      .eq('state_code', stateCode)
      .eq('category', 'carry')
      .not('carry_status', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data?.carry_status) return 'unknown';
    return data.carry_status as CarryStatus;
  } catch {
    return 'unknown';
  }
}
