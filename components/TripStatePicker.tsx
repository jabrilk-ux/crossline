import { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { STATES, getStateName } from '../constants/states';
import { colors, typography } from '../constants/theme';
import { getLegalReference } from '../services/legalReferences';
import Button from './ActionButton';

export default function TripStatePicker({ visible, value, onDone, onClose }: { visible: boolean; value: string[]; onDone: (states: string[]) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [announcement, setAnnouncement] = useState('');
  useEffect(() => { if (visible) { setDraft(value); setSearch(''); setAnnouncement(''); } }, [visible]);
  const filtered = STATES.filter(s => `${s.name} ${s.code}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <Modal visible={visible} transparent animationType={Platform.OS === 'web' ? 'none' : 'fade'} onRequestClose={onClose}>
    <View style={{ flex: 1, backgroundColor: '#020914cc', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
      <View accessibilityViewIsModal style={{ width: '100%', maxWidth: 640, height: '90%', maxHeight: 760, backgroundColor: colors.navy, borderRadius: 24, borderWidth: 1, borderColor: colors.border, padding: 22, gap: 14, flexShrink: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}><Text accessibilityRole="header" style={{ ...typography.h2, color: colors.white }}>Choose trip states</Text><Pressable accessibilityRole="button" accessibilityLabel="Cancel state selection" onPress={onClose} style={{ padding: 10 }}><Ionicons name="close" size={24} color={colors.silver} /></Pressable></View>
        <Text style={{ ...typography.body, color: colors.muted, lineHeight: 22 }}>Add every state in travel order. You can add a state again if your route re-enters it.</Text>
        <TextInput autoFocus accessibilityLabel="Search trip states" placeholder="Search by state name or code" placeholderTextColor={colors.muted} value={search} onChangeText={setSearch} style={{ ...typography.body, color: colors.white, backgroundColor: colors.surface, padding: 15, borderWidth: 1, borderColor: colors.border, borderRadius: 14 }} />
        <View style={{ gap: 8 }}><Text style={{ ...typography.caption, color: colors.skyLight }}>YOUR ROUTE · {draft.length} / 30</Text>
          {draft.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>{draft.map((code, i) => <Pressable key={i} accessibilityRole="button" accessibilityLabel={`Remove stop ${i + 1}: ${getStateName(code)}`} onPress={() => setDraft(list => list.filter((_, index) => i !== index))} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, backgroundColor: colors.surfaceRaised }}><Text style={{ ...typography.body, color: colors.white }}>{i + 1}. {code} ×</Text></Pressable>)}</ScrollView> : <Text style={{ ...typography.caption, color: colors.muted }}>Choose your starting state below.</Text>}
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1 }} contentContainerStyle={{ gap: 4 }}>
          {filtered.map(state => { const count = draft.filter(code => code === state.code).length; return <Pressable key={state.code} accessibilityRole="button" accessibilityLabel={`Add ${state.name}`} disabled={draft.length >= 30} onPress={() => { setDraft(list => [...list, state.code]); setAnnouncement(`${state.name} added as stop ${draft.length + 1}.`); }} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 14, padding: 14, backgroundColor: pressed ? colors.surfaceRaised : colors.surface, opacity: draft.length >= 30 ? 0.4 : 1 })}>
            <View style={{ width: 42, height: 42, backgroundColor: colors.surfaceRaised, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}><Text style={{ ...typography.caption, color: colors.skyLight }}>{state.code}</Text></View>
            <View style={{ flex: 1 }}><Text style={{ ...typography.body, color: colors.white }}>{state.name}</Text><Text style={{ ...typography.caption, color: colors.muted, marginTop: 3 }}>{getLegalReference(state.code) ? 'East Coast beta references' : 'Outside beta reference coverage'}</Text></View>
            <Text style={{ color: colors.skyLight, fontSize: 18 }}>{count ? `${count} · +` : '+'}</Text>
          </Pressable>; })}
          {!filtered.length && <Text style={{ color: colors.muted, padding: 20 }}>No states match that search.</Text>}
        </ScrollView>
        <Text accessibilityLiveRegion="polite" style={{ ...typography.caption, color: colors.skyLight }}>{draft.length >= 30 ? '30-stop limit reached. Remove a stop to add another.' : announcement || 'Select a state to add it to your route.'}</Text>
        <Button title={`Use ${draft.length} ${draft.length === 1 ? 'state' : 'states'}`} disabled={!draft.length} onPress={() => onDone(draft)} />
      </View>
    </View>
  </Modal>;
}
