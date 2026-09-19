import { useState } from 'react';
import { Button, ScrollView, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TripState } from '../services/trip';
import { colors } from '../constants/theme';
export default function OfflineBrief({ userId }: { userId: string | null }) {
  const [brief, setBrief] = useState<{ savedAt: string; states: TripState[] } | null>(null);
  const [message, setMessage] = useState('');
  if (!userId) return null;
  return <View style={{ maxHeight: '65%', gap: 10 }}>
    <Button title="Open my saved trip offline" onPress={() => {
      void AsyncStorage.getItem(`crossline:trip:${userId}:latest`).then(raw => {
        if (raw) { setBrief(JSON.parse(raw)); setMessage(''); } else setMessage('No trip has been saved on this device.');
      }).catch(() => setMessage('Could not read the saved trip.'));
    }} />
    {message ? <Text style={{ color: colors.silver }}>{message}</Text> : null}
    {brief && <ScrollView><Text style={{ color: colors.warning }}>Saved {new Date(brief.savedAt).toLocaleString()}. Offline copy: carry status is undetermined. Rules may have changed.</Text>{brief.states.map((s,i) => <View key={i} style={{ marginTop: 16, gap: 8 }}><Text style={{ color: colors.white, fontSize: 20 }}>{s.stateName}</Text>{s.keyLaws.length ? s.keyLaws.map(l => <Text key={l.id} style={{ color: colors.silver }}>{l.plain_english}{'\n'}Reviewed {l.last_verified ?? 'unknown'}{'\n'}{l.statute_url}</Text>) : <Text style={{ color: colors.silver }}>No reviewed summaries saved.</Text>}</View>)}</ScrollView>}
  </View>;
}
