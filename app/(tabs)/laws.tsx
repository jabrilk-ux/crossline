import LegalReferenceCard from '../../components/LegalReferenceCard';
import type { CarryRule } from '../../services/carryRules';
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, Pressable,
  TouchableOpacity, TextInput, Modal, FlatList, Linking,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { colors, typography, statusColors } from '../../constants/theme';
import { useLocationStore } from '../../store/locationStore';
import { useUserStore } from '../../store/userStore';
import { STATES } from '../../constants/states';
import {
  getLawsForState,
  getCarryGuidanceForUser,
  type StateLaw,
  type LawCategory,
} from '../../services/laws';
import type { CarryStatus } from '../../services/notifications';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: { key: LawCategory; label: string }[] = [
  { key: 'carry',               label: 'Carry' },
  { key: 'reciprocity',         label: 'Reciprocity' },
  { key: 'duty_to_inform',      label: 'Duty to Inform' },
  { key: 'prohibited_locations',label: 'Prohibited Locations' },
  { key: 'transport',           label: 'Transport' },
  { key: 'magazine',            label: 'Magazine' },
  { key: 'ammo',                label: 'Ammo' },
  { key: 'use_of_force',        label: 'Use of Force' },
  { key: 'red_flag',            label: 'Red Flag' },
  { key: 'storage',             label: 'Storage' },
];

const STALE_DAYS = 90;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isStale(lastVerified: string | null): boolean {
  if (!lastVerified) return false;
  const diff = Date.now() - new Date(lastVerified).getTime();
  return diff > STALE_DAYS * 24 * 60 * 60 * 1000;
}

function formatVerifiedDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── State Selector Bottom Sheet ─────────────────────────────────────────────

function StateSelectorSheet({
  visible,
  selectedCode,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selectedCode: string;
  onSelect: (code: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const filtered = STATES.filter(
    s =>
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.code.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={sheet.overlay}>
        <View style={sheet.container}>
          <View style={sheet.handle} />
          <Text style={sheet.title}>Select State</Text>
          <TextInput
            style={sheet.search}
            placeholder="Search states..."
            placeholderTextColor={colors.silver}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          <FlatList
            data={filtered}
            keyExtractor={item => item.code}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[sheet.stateRow, item.code === selectedCode && sheet.stateRowSelected]}
                onPress={() => { onSelect(item.code); onClose(); setQuery(''); }}
              >
                <Text style={[sheet.stateCode, item.code === selectedCode && sheet.stateCodeSelected]}>
                  {item.code}
                </Text>
                <Text style={[sheet.stateName, item.code === selectedCode && sheet.stateNameSelected]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            )}
            style={sheet.list}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      </View>
    </Modal>
  );
}

// ─── Carry Status Banner ──────────────────────────────────────────────────────

function CarryStatusBanner({
  stateCode,
  status,
  permitType,
}: {
  stateCode: string;
  status: CarryStatus;
  permitType: string | null;
}) {
  const stateName = STATES.find(s => s.code === stateCode)?.name ?? stateCode;
  const permitLabel = permitType ?? 'Your permit';

  const summaries: Record<CarryStatus, string> = {
    allowed:    `Reviewed guidance matches your saved profile in ${stateName}. Review all conditions and official sources.`,
    restricted: `Reviewed restrictions apply to your saved profile in ${stateName}.`,
    prohibited: `Reviewed guidance indicates a restriction for your saved profile in ${stateName}.`,
    unknown:    `Unable to determine your carry status in ${stateName}. Your profile may be incomplete, or reviewed rules may be unavailable.`,
  };

  return (
    <View style={[banner.container, { borderColor: statusColors[status] + '66', backgroundColor: statusColors[status] + '14' }]}>
      <View style={[banner.dot, { backgroundColor: statusColors[status] }]} />
      <Text style={[banner.text, { color: statusColors[status] }]}>{summaries[status]}</Text>
    </View>
  );
}

// ─── Category Tabs ────────────────────────────────────────────────────────────

function CategoryTabs({
  selected,
  onSelect,
}: {
  selected: LawCategory;
  onSelect: (cat: LawCategory) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={tabs.container}
    >
      {CATEGORIES.map(({ key, label }) => (
        <TouchableOpacity
          key={key}
          style={[tabs.tab, selected === key && tabs.tabActive]}
          onPress={() => onSelect(key)}
        >
          <Text style={[tabs.label, selected === key && tabs.labelActive]}>{label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ─── Law Detail Card ──────────────────────────────────────────────────────────

function LawDetailCard({ law }: { law: StateLaw }) {
  const stale = isStale(law.last_verified);

  return (
    <View style={card.container}>
      {stale && (
        <View style={card.staleWarning}>
          <Text style={card.staleText}>
            ⚠ This law may have changed. Verify before relying on it.
          </Text>
        </View>
      )}

      <Text style={card.plainEnglish}>{law.plain_english}</Text>

      {law.statute_reference && (
        <Text style={card.reference}>{law.statute_reference}</Text>
      )}

      {law.statute_url && (
        <TouchableOpacity onPress={() => Linking.openURL(law.statute_url!)}>
          <Text style={card.link}>View official statute →</Text>
        </TouchableOpacity>
      )}

      {law.last_verified && (
        <Text style={card.verified}>
          Last verified {formatVerifiedDate(law.last_verified)}
        </Text>
      )}
    </View>
  );
}

// ─── Laws Screen ──────────────────────────────────────────────────────────────

export default function LawsScreen() {
  const params = useLocalSearchParams<{ state?: string; category?: string }>();
  const { currentState } = useLocationStore();
  const { permits, firearmsProfile } = useUserStore();

  const initialState = params.state ?? currentState ?? 'VA';
  const initialCategory = (params.category as LawCategory | undefined) ?? 'carry';

  const [selectedState, setSelectedState] = useState(initialState);
  const [selectedCategory, setSelectedCategory] = useState<LawCategory>(initialCategory);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [laws, setLaws] = useState<StateLaw[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rules, setRules] = useState<CarryRule[]>([]);
  const [carryStatus, setCarryStatus] = useState<CarryStatus>('unknown');

  // Re-seed from params when deep-linked (e.g. notification tap)
  useEffect(() => {
    if (params.state) setSelectedState(params.state);
    if (params.category) setSelectedCategory(params.category as LawCategory);
  }, [params.state, params.category]);

  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setRules([]); setCarryStatus('unknown');
    Promise.all([getLawsForState(selectedState, [selectedCategory]), getCarryGuidanceForUser(selectedState, permits, firearmsProfile)])
      .then(([data,status]) => { if(active) { setLaws(data); setCarryStatus(status.status); setRules(status.rules); } })
      .catch(() => { if(active) { setLaws([]); setError('Could not load laws. Check your connection and tap to retry.'); } })
      .finally(() => { if(active) setLoading(false); });
    return () => { active=false; };
  }, [selectedState, selectedCategory, permits, firearmsProfile, retry]);

  const stateName = STATES.find(s => s.code === selectedState)?.name ?? selectedState;
  const primaryPermit = permits.find(p => p.stateCode === selectedState);
  const permitLabel = primaryPermit
    ? `Your ${primaryPermit.permitType} permit`
    : permits.length > 0
    ? 'Your permit'
    : null;

  const categoryLaws = laws.filter(l => l.category === selectedCategory);

  return (
    <SafeAreaView style={ls.container}>
      {/* State selector header */}
      <View style={ls.header}>
        <TouchableOpacity
          style={ls.stateSelector}
          onPress={() => setSheetVisible(true)}
          activeOpacity={0.8}
        >
          <View>
            <Text style={ls.stateSelectorLabel}>State Laws</Text>
            <Text style={ls.stateSelectorName}>{stateName}</Text>
          </View>
          <Text style={ls.stateSelectorChevron}>▾</Text>
        </TouchableOpacity>
      </View>

      {/* Carry status banner */}
      <CarryStatusBanner
        stateCode={selectedState}
        status={carryStatus}
        permitType={permitLabel}
      />

      {/* Category tabs */}
      <CategoryTabs selected={selectedCategory} onSelect={setSelectedCategory} />

      {/* Law detail cards */}
      <ScrollView contentContainerStyle={ls.scroll} showsVerticalScrollIndicator={false}>
        <LegalReferenceCard key={selectedState} stateCode={selectedState} />
        {!loading && rules.map((rule, i) => <View key={i} style={{ marginBottom: 16, padding: 14, backgroundColor: colors.steel, borderRadius: 10 }}>
          <Text style={{ color: colors.white, marginBottom: 8 }}>{rule.explanation}</Text>
          <Text style={{ color: colors.silver }}>Scope: {rule.firearm_type} · {rule.carry_purpose} · {rule.permitless ? 'permitless rule' : `${rule.permit_state} ${rule.permit_type} permit`}. Effective {rule.effective_date} through {rule.expires_on}.</Text>
          <TouchableOpacity onPress={() => { void Linking.openURL(rule.source_url).catch(() => {}); }}><Text style={{ color: colors.sky, marginTop: 8 }}>Review rule source →</Text></TouchableOpacity>
        </View>)}
        {loading ? (
          <View style={ls.pending}>
            <Text style={ls.pendingText}>Loading...</Text>
          </View>
        ) : error ? (<TouchableOpacity onPress={() => setRetry(n => n+1)}><Text style={ls.pendingText}>{error}</Text></TouchableOpacity>) : categoryLaws.length === 0 ? (
          <View style={ls.pending}>
            <Text style={ls.pendingText}>
              No reviewed summary is available for this category. The state references above are research notes and do not establish your carry status.
            </Text>
          </View>
        ) : (
          categoryLaws.map(law => <LawDetailCard key={law.id} law={law} />)
        )}
      </ScrollView>

      {/* State selector bottom sheet */}
      <StateSelectorSheet
        visible={sheetVisible}
        selectedCode={selectedState}
        onSelect={setSelectedState}
        onClose={() => setSheetVisible(false)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const ls = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  stateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stateSelectorLabel: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    color: colors.silver,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  stateSelectorName: {
    fontFamily: typography.h1.fontFamily,
    fontSize: typography.h1.fontSize,
    color: colors.white,
    marginTop: 2,
  },
  stateSelectorChevron: {
    fontSize: 20,
    color: colors.sky,
  },
  scroll: { paddingHorizontal: 16, paddingBottom: 48, paddingTop: 8 },
  pending: { paddingVertical: 40, alignItems: 'center', paddingHorizontal: 24 },
  pendingText: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    color: colors.silver,
    textAlign: 'center',
    lineHeight: 22,
  },
});

const banner = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 4,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 4, flexShrink: 0 },
  text: {
    flex: 1,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    lineHeight: 20,
  },
});

const tabs = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.sky,
    borderColor: colors.sky,
  },
  label: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    color: colors.silver,
  },
  labelActive: { color: colors.white },
});

const card = StyleSheet.create({
  container: {
    backgroundColor: colors.steel,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  staleWarning: {
    backgroundColor: colors.warning + '1A',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.warning + '55',
  },
  staleText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    color: colors.warning,
    lineHeight: 17,
  },
  plainEnglish: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    color: colors.white,
    lineHeight: 22,
  },
  reference: {
    fontFamily: typography.mono.fontFamily,
    fontSize: typography.mono.fontSize,
    color: colors.silver,
  },
  link: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    color: colors.skyLight,
  },
  verified: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    color: colors.slate,
  },
});

const sheet = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#00000088',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.navy,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: typography.h2.fontFamily,
    fontSize: typography.h2.fontSize,
    color: colors.white,
    marginBottom: 12,
  },
  search: {
    backgroundColor: colors.steel,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    color: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  list: { flex: 1 },
  stateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '44',
  },
  stateRowSelected: { backgroundColor: colors.sky + '22' },
  stateCode: {
    fontFamily: typography.mono.fontFamily,
    fontSize: typography.mono.fontSize,
    color: colors.silver,
    width: 30,
  },
  stateCodeSelected: { color: colors.sky },
  stateName: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    color: colors.white,
  },
  stateNameSelected: { color: colors.skyLight },
});
