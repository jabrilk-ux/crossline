import { ScrollView, Text, Button } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../constants/theme';
export default function Privacy() {
  const router = useRouter();
  const sections = [
    ['Invited beta', 'Crossline provides reference information for travel. Coverage is incomplete. Reviewed guidance is limited to the saved profile and stated conditions; it is not a legal determination. Verify official sources before acting. All beta features are free and purchases are disabled.'],
    ['Your account', 'Supabase stores your email and authentication information, home state, permits and firearm profile. Other users cannot read your personal records. Account deletion removes your profile, permits and saved crossing history from the active database; provider backups may persist under the provider’s retention schedule.'],
    ['Location and history', 'With your permission, the device checks coordinates against state boundaries. Crossline does not upload a continuous GPS track. The last state and a candidate crossing are stored on this device to prevent duplicate alerts. Optional saved history contains state codes and crossing times in your account, not exact coordinates. History saving starts off. You can stop tracking, turn off alerts, clear history or delete your account in Profile.'],
    ['Trip planning', 'Manual state planning does not contact a directions provider. When configured, address searches go to OpenCage and driving-route coordinates go to the configured routing provider. Saved trip briefs stay on this device and include their download date. Clear them in Trip or sign out to remove them.'],
    ['Permissions and reliability', 'You can use the law browser without granting location permission. Background alerts require an installed mobile build, location permission and notification permission. Operating-system restrictions, low battery and force-quitting can interrupt tracking. Missing or stale rules produce an undetermined status.'],
    ['Questions and feedback', 'During the invited beta, contact the person who invited you for support or to report incorrect information. Do not include passwords, permit documents or precise location history in public issue reports.'],
  ];
  return <ScrollView style={{ backgroundColor: colors.navy }} contentContainerStyle={{ padding: 28, paddingTop: 65, gap: 18 }}><Text style={{ color: colors.white, fontSize: 28 }}>Privacy & beta information</Text>{sections.map(([title,body]) => <Text key={title} style={{ color: colors.silver, fontSize: 16, lineHeight: 24 }}><Text style={{ color: colors.white, fontWeight: 'bold' }}>{title}{'\n'}</Text>{body}</Text>)}<Button title="Back" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} /></ScrollView>;
}
