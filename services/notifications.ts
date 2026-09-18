import * as ExpoNotifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getStateFullName } from './geofence';

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

export async function requestCrossingNotifications(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (Platform.OS === 'android') await ExpoNotifications.setNotificationChannelAsync('crossings', {
    name: 'State crossings', importance: ExpoNotifications.AndroidImportance.HIGH,
  });
  return (await ExpoNotifications.requestPermissionsAsync()).granted;
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
        body: `Reviewed guidance matches your saved profile. Check the conditions and official sources. Tap for full ${stateName} laws.`,
        data: { stateCode, carryStatus },
      };
    case 'restricted':
      return {
        title: `Entered ${stateName} — Restrictions Apply`,
        body: `${stateName} has restrictions matching your saved profile. Tap to review before carrying.`,
        data: { stateCode, carryStatus },
      };
    case 'prohibited':
      return {
        title: `Entered ${stateName} — Carry Not Permitted`,
        body: `Reviewed guidance indicates a restriction for your saved profile. Tap to review transport and storage rules.`,
        data: { stateCode, carryStatus },
      };
    case 'unknown':
    default:
      return {
        title: `Entered ${stateName}`,
        body: `Unable to determine your carry status. Review official ${stateName} sources before acting.`,
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
      trigger: Platform.OS === 'android' ? { channelId: 'crossings' } : null,
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
