import { useState, useEffect } from 'react';
import { ScrollView, View, Text, Pressable, Button } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import LegalReferenceCard from '../components/LegalReferenceCard';
import { legalReferences } from '../services/legalReferences';
import { colors } from '../constants/theme';
export default function References() {
  const router = useRouter();
  const { state } = useLocalSearchParams<{ state?: string }>();
  const [selected, setSelected] = useState(state ?? 'ME');
  useEffect(() => { if (state) setSelected(state); }, [state]);
  return <ScrollView style={{ backgroundColor: colors.navy }} contentContainerStyle={{ padding: 22, paddingTop: 60, gap: 16 }}>
    <Text accessibilityRole="header" style={{ color: colors.white, fontSize: 28 }}>East Coast reference library</Text>
    <Text style={{ color: colors.silver, lineHeight: 23 }}>Official resources for 14 coastal states. These research notes are not a complete legal review. Possession, carry, permit recognition and transportation are different questions. State guidance does not replace federal or local requirements.</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {legalReferences.map(entry => <Pressable key={entry.code} accessibilityRole="button" accessibilityLabel={`Reference: ${entry.name}`} accessibilityState={{ selected: selected === entry.code }} onPress={() => setSelected(entry.code)} style={{ padding: 12, borderRadius: 8, backgroundColor: selected === entry.code ? colors.sky : colors.steel }}><Text style={{ color: colors.white }}>{entry.name}</Text></Pressable>)}
    </View>
    <LegalReferenceCard key={selected} stateCode={selected} />
    <Text style={{ color: colors.silver, lineHeight: 23 }}>Pennsylvania, Vermont and Washington, DC are outside this initial reference collection. Include every jurisdiction you enter when researching a trip.</Text>
    <Button title="Back" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} />
  </ScrollView>;
}
