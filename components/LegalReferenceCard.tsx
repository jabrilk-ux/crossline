import { useState } from 'react';
import { View, Text, Pressable, Linking, StyleSheet } from 'react-native';
import { getLegalReference, referenceNeedsRefresh } from '../services/legalReferences';
import { colors } from '../constants/theme';
export default function LegalReferenceCard({ stateCode }: { stateCode: string }) {
  const entry = getLegalReference(stateCode);
  const [linkError, setLinkError] = useState('');
  if (!entry) return <View style={styles.card}>
    <Text style={styles.title}>Outside the 14-state beta reference coverage</Text>
    <Text style={styles.body}>No beta research notes are available for this jurisdiction. That does not mean there are no restrictions. Check every jurisdiction on your route, including federal and local requirements.</Text>
  </View>;
  const stale = referenceNeedsRefresh(entry);
  return <View style={styles.card}>
    <Text accessibilityRole="header" style={styles.title}>{entry.name} · official references</Text>
    <Text style={styles.meta}>Research notes · {entry.researchDate} · Not independently reviewed</Text>
    <Text style={styles.body}>General state overview. This is not a determination of your personal carry status.</Text>
    {stale ? <Text style={styles.warning}>Research notes need refreshing. Open the official sources for current information.</Text> : <>
      <Text style={styles.body}>{entry.summary}</Text>
      <Text style={styles.title}>Questions still to verify</Text>
      <Text style={styles.body}>{entry.questions}</Text>
    </>}
    {entry.retrieval === 'discovered' && <Text style={styles.warning}>Source located; full-page verification is incomplete.</Text>}
    {entry.sources.map(source => <Pressable key={source.url} accessibilityRole="link" accessibilityLabel={source.title} onPress={() => { setLinkError(''); void Linking.openURL(source.url).catch(() => setLinkError('Could not open the source. Check your connection and try again.')); }} style={styles.link}>
      <Text style={{ color: colors.skyLight }}>{source.title} ↗</Text>
      <Text selectable style={styles.meta}>{source.url}</Text>
    </Pressable>)}
    {linkError ? <Text accessibilityLiveRegion="polite" style={styles.warning}>{linkError}</Text> : null}
    <Text style={styles.meta}>Links need an internet connection. The research date does not certify current law or legal eligibility. These notes never determine a carry-status color.</Text>
  </View>;
}
const styles = StyleSheet.create({
  card: { backgroundColor: colors.steel, borderRadius: 14, padding: 18, gap: 12, marginBottom: 16 },
  title: { color: colors.white, fontSize: 17, fontWeight: '600' },
  body: { color: '#D5DEEA', fontSize: 15, lineHeight: 23 },
  meta: { color: '#BCCADB', fontSize: 12, lineHeight: 18 },
  warning: { color: colors.warning, fontSize: 14, lineHeight: 21 },
  link: { paddingVertical: 10, gap: 4 },
});
