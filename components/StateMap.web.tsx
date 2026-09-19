import { ScrollView, Text, Button } from 'react-native';
import { useRouter } from 'expo-router';
import { STATES } from '../constants/states';
import { colors } from '../constants/theme';
export default function StateDirectory() {
  const router=useRouter();
  return <ScrollView style={{ backgroundColor: colors.navy }} contentContainerStyle={{ padding: 24, gap: 12 }}><Text style={{ color: colors.white, fontSize: 26 }}>Explore states</Text><Text style={{ color: colors.silver }}>The interactive map is available in the mobile app. Choose a state to review its available guidance.</Text>{STATES.map(s=><Button key={s.code} title={s.name} onPress={()=>router.push(`/(tabs)/laws?state=${s.code}`)} />)}</ScrollView>;
}
