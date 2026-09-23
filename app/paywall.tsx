import { Text, View, Button } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../constants/theme';
export default function BetaAccess() {
  const router = useRouter();
  return <View style={{ flex: 1, backgroundColor: colors.navy, padding: 28, justifyContent: 'center', gap: 20 }}>
    <Text style={{ color: colors.white, fontSize: 28 }}>Crossline Beta</Text>
    <Text style={{ color: colors.silver, fontSize: 17 }}>Available beta features are free. Purchases are disabled while we test reliability and coverage. Some states do not yet have reviewed law information.</Text>
    <Button title="Back to Crossline" onPress={() => router.back()} />
  </View>;
}
