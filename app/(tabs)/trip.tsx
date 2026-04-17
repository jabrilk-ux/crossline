import { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TextInput,
  TouchableOpacity, FlatList, ActivityIndicator, Pressable,
  KeyboardAvoidingView, Platform, Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, typography, statusColors } from '../../constants/theme';
import { useUserStore } from '../../store/userStore';
import {
  geocodeAddress, getStatesAlongRoute, buildTripBriefing,
  type GeocodedLocation, type TripState,
} from '../../services/trip';
import type { StateLaw } from '../../services/laws';
import type { CarryStatus } from '../../services/notifications';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LockedLocation extends GeocodedLocation {
  locked: boolean;
}

// ─── Category labels ──────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  carry: 'Carry',
  reciprocity: 'Reciprocity',
  duty_to_inform: 'Duty to Inform',
  prohibited_locations: 'Prohibited Locations',
  transport: 'Transport',
  magazine: 'Magazine Limits',
  ammo: 'Ammunition',
  use_of_force: 'Use of Force',
  red_flag: 'Red Flag',
  storage: 'Storage',
};

// ─── StatusBadge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: CarryStatus }) {
  const labels: Record<CarryStatus, string> = {
    allowed: 'Carry Permitted',
    restricted: 'Restrictions Apply',
    prohibited: 'Carry Not Permitted',
    unknown: 'Status Unknown',
  };
  return (
    <View style={[
      badge.container,
      { backgroundColor: statusColors[status] + '22', borderColor: statusColors[status] },
    ]}>
      <View style={[badge.dot, { backgroundColor: statusColors[status] }]} />
      <Text style={[badge.text, { color: statusColors[status] }]}>{labels[status]}</Text>
    </View>
  );
}

const badge = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  text: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
  },
});

// ─── Law card (compact) ───────────────────────────────────────────────────────

function LawCard({ law, stateCode }: { law: StateLaw; stateCode: string }) {
  const router = useRouter();
  return (
    <Pressable
      style={({ pressed }) => [lawCard.container, pressed && lawCard.pressed]}
      onPress={() => router.push(`/(tabs)/laws?state=${stateCode}&category=${law.category}`)}
    >
      <View style={lawCard.header}>
        <Text style={lawCard.category}>{CATEGORY_LABELS[law.category] ?? law.category}</Text>
        <Text style={lawCard.chevron}>›</Text>
      </View>
      <Text style={lawCard.summary} numberOfLines={2}>{law.plain_english}</Text>
    </Pressable>
  );
}

const lawCard = StyleSheet.create({
  container: {
    backgroundColor: colors.navy,
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.border + '55',
  },
  pressed: { opacity: 0.75 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  category: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    color: colors.skyLight,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  chevron: { color: colors.silver, fontSize: 16 },
  summary: {
    fontFamily: typography.body.fontFamily,
    fontSize: 14,
    color: colors.white,
    lineHeight: 20,
  },
});

// ─── State briefing card ──────────────────────────────────────────────────────

function StateBriefingCard({
  tripState,
  index,
}: {
  tripState: TripState;
  index: number;
}) {
  const router = useRouter();
  const hasWarning = tripState.entryWarning !== null;
  const warningBg =
    tripState.carryStatus === 'prohibited' ? colors.danger + '22' :
    tripState.carryStatus === 'restricted' ? colors.warning + '22' :
    colors.silver + '22';
  const warningBorder =
    tripState.carryStatus === 'prohibited' ? colors.danger + '88' :
    tripState.carryStatus === 'restricted' ? colors.warning + '88' :
    colors.silver + '44';

  return (
    <View style={stateCard.container}>
      {/* Index badge + state header */}
      <View style={stateCard.header}>
        <View style={stateCard.indexBadge}>
          <Text style={stateCard.indexText}>{index + 1}</Text>
        </View>
        <View style={stateCard.titleGroup}>
          <Text style={stateCard.stateName}>{tripState.stateName}</Text>
          <Text style={stateCard.stateCode}>{tripState.stateCode}</Text>
        </View>
      </View>

      <StatusBadge status={tripState.carryStatus} />

      {/* Entry warning banner */}
      {hasWarning && (
        <View style={[stateCard.warningBanner, { backgroundColor: warningBg, borderColor: warningBorder }]}>
          <Text style={stateCard.warningIcon}>
            {tripState.carryStatus === 'prohibited' ? '⛔' :
             tripState.carryStatus === 'restricted' ? '⚠️' : 'ℹ️'}
          </Text>
          <Text style={stateCard.warningText}>{tripState.entryWarning}</Text>
        </View>
      )}

      {/* Key laws */}
      {tripState.keyLaws.length > 0 ? (
        <View style={stateCard.laws}>
          {tripState.keyLaws.map(law => (
            <LawCard key={law.id} law={law} stateCode={tripState.stateCode} />
          ))}
        </View>
      ) : (
        <View style={stateCard.noData}>
          <Text style={stateCard.noDataText}>No law data available yet.</Text>
        </View>
      )}

      {/* View full laws link */}
      <TouchableOpacity
        style={stateCard.fullLawsBtn}
        onPress={() => router.push(`/(tabs)/laws?state=${tripState.stateCode}`)}
        activeOpacity={0.75}
      >
        <Text style={stateCard.fullLawsText}>View full {tripState.stateName} laws →</Text>
      </TouchableOpacity>
    </View>
  );
}

const stateCard = StyleSheet.create({
  container: {
    backgroundColor: colors.steel,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border + '66',
    gap: 12,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  indexBadge: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.sky + '33',
    borderWidth: 1, borderColor: colors.sky + '66',
    alignItems: 'center', justifyContent: 'center',
  },
  indexText: {
    fontFamily: typography.mono.fontFamily,
    fontSize: 13,
    color: colors.sky,
    fontWeight: '700',
  },
  titleGroup: { flex: 1 },
  stateName: {
    fontFamily: typography.h2.fontFamily,
    fontSize: typography.h2.fontSize,
    color: colors.white,
  },
  stateCode: {
    fontFamily: typography.mono.fontFamily,
    fontSize: typography.mono.fontSize,
    color: colors.silver,
    marginTop: 1,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  warningIcon: { fontSize: 14, lineHeight: 20 },
  warningText: {
    flex: 1,
    fontFamily: typography.body.fontFamily,
    fontSize: 13,
    color: colors.white,
    lineHeight: 19,
  },
  laws: { gap: 0 },
  noData: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  noDataText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    color: colors.silver,
  },
  fullLawsBtn: {
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border + '33',
    marginTop: 4,
  },
  fullLawsText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    color: colors.skyLight,
    textAlign: 'right',
  },
});

// ─── Location input with dropdown ─────────────────────────────────────────────

function LocationInput({
  placeholder,
  value,
  locked,
  onSelect,
  onClear,
}: {
  placeholder: string;
  value: string;
  locked: boolean;
  onSelect: (loc: GeocodedLocation) => void;
  onClear: () => void;
}) {
  const [text, setText] = useState(value);
  const [results, setResults] = useState<GeocodedLocation[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback((input: string) => {
    setText(input);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (input.length < 3) { setResults([]); return; }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const found = await geocodeAddress(input);
      setSearching(false);
      setResults(found);
    }, 400);
  }, []);

  const handleSelect = useCallback((loc: GeocodedLocation) => {
    setText(loc.label);
    setResults([]);
    Keyboard.dismiss();
    onSelect(loc);
  }, [onSelect]);

  const handleClear = useCallback(() => {
    setText('');
    setResults([]);
    onClear();
  }, [onClear]);

  return (
    <View>
      <View style={input.row}>
        <TextInput
          style={[input.field, locked && input.fieldLocked]}
          placeholder={placeholder}
          placeholderTextColor={colors.silver}
          value={locked ? value : text}
          onChangeText={locked ? undefined : handleChange}
          editable={!locked}
          returnKeyType="search"
          autoCorrect={false}
        />
        {locked ? (
          <TouchableOpacity style={input.clearBtn} onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={input.clearText}>✕</Text>
          </TouchableOpacity>
        ) : searching ? (
          <ActivityIndicator style={input.spinner} color={colors.silver} size="small" />
        ) : null}
      </View>

      {!locked && results.length > 0 && (
        <View style={input.dropdown}>
          {results.map((loc, i) => (
            <TouchableOpacity
              key={i}
              style={[input.dropdownRow, i < results.length - 1 && input.dropdownDivider]}
              onPress={() => handleSelect(loc)}
              activeOpacity={0.75}
            >
              <Text style={input.dropdownText} numberOfLines={2}>{loc.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const input = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.steel,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border + '66',
    paddingHorizontal: 12,
    paddingVertical: 2,
    marginBottom: 8,
  },
  field: {
    flex: 1,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    color: colors.white,
    paddingVertical: 12,
  },
  fieldLocked: { color: colors.skyLight },
  clearBtn: { padding: 4 },
  clearText: { color: colors.silver, fontSize: 14 },
  spinner: { marginLeft: 8 },
  dropdown: {
    backgroundColor: colors.steel,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border + '66',
    marginTop: -4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  dropdownRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '44',
  },
  dropdownText: {
    fontFamily: typography.body.fontFamily,
    fontSize: 14,
    color: colors.white,
  },
});

// ─── Route pill row ───────────────────────────────────────────────────────────

function RoutePillRow({
  states,
  onPillPress,
}: {
  states: TripState[];
  onPillPress: (index: number) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={pills.row}
      style={pills.scroll}
    >
      {states.map((s, i) => (
        <TouchableOpacity
          key={s.stateCode + i}
          style={[pills.pill, { borderColor: statusColors[s.carryStatus] + '88' }]}
          onPress={() => onPillPress(i)}
          activeOpacity={0.75}
        >
          <View style={[pills.dot, { backgroundColor: statusColors[s.carryStatus] }]} />
          <Text style={pills.code}>{s.stateCode}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const pills = StyleSheet.create({
  scroll: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '44',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: colors.steel,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  code: {
    fontFamily: typography.mono.fontFamily,
    fontSize: 12,
    color: colors.white,
    fontWeight: '600',
  },
});

// ─── Empty placeholder ────────────────────────────────────────────────────────

function EmptyPlaceholder() {
  return (
    <View style={empty.container}>
      <Text style={empty.icon}>🗺️</Text>
      <Text style={empty.text}>
        Enter your origin and destination to get a legal briefing for every state on your route.
      </Text>
    </View>
  );
}

const empty = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  icon: { fontSize: 48 },
  text: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    color: colors.silver,
    textAlign: 'center',
    lineHeight: 23,
  },
});

// ─── Trip Screen ──────────────────────────────────────────────────────────────

export default function TripScreen() {
  const { permits, firearmsProfile } = useUserStore();

  const [originLoc, setOriginLoc] = useState<LockedLocation | null>(null);
  const [destLoc, setDestLoc] = useState<LockedLocation | null>(null);
  const [originKey, setOriginKey] = useState(0);
  const [destKey, setDestKey] = useState(0);

  const [tripStates, setTripStates] = useState<TripState[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasTrip, setHasTrip] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const cardOffsets = useRef<number[]>([]);

  const canPlan = originLoc !== null && destLoc !== null;

  const handlePlanTrip = useCallback(async () => {
    if (!originLoc || !destLoc) return;
    Keyboard.dismiss();
    setLoading(true);
    setHasTrip(false);
    setTripStates([]);

    const stateCodes = getStatesAlongRoute(originLoc, destLoc);
    const briefing = await buildTripBriefing(stateCodes, permits, firearmsProfile);

    setTripStates(briefing);
    setHasTrip(true);
    setLoading(false);
  }, [originLoc, destLoc, permits, firearmsProfile]);

  const handleReset = useCallback(() => {
    setOriginLoc(null);
    setDestLoc(null);
    setTripStates([]);
    setHasTrip(false);
    setOriginKey(k => k + 1);
    setDestKey(k => k + 1);
    cardOffsets.current = [];
  }, []);

  const scrollToCard = useCallback((index: number) => {
    const offset = cardOffsets.current[index];
    if (offset !== undefined) {
      scrollRef.current?.scrollTo({ y: offset, animated: true });
    }
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.title}>Trip Planner</Text>
          {hasTrip && (
            <TouchableOpacity onPress={handleReset} style={styles.newTripBtn} activeOpacity={0.75}>
              <Text style={styles.newTripText}>New Trip</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Search inputs ── */}
        <View style={styles.searchPanel}>
          <LocationInput
            key={`origin-${originKey}`}
            placeholder="Origin — city, address, or landmark"
            value={originLoc?.label ?? ''}
            locked={originLoc !== null}
            onSelect={(loc) => setOriginLoc({ ...loc, locked: true })}
            onClear={() => setOriginLoc(null)}
          />
          <LocationInput
            key={`dest-${destKey}`}
            placeholder="Destination — city, address, or landmark"
            value={destLoc?.label ?? ''}
            locked={destLoc !== null}
            onSelect={(loc) => setDestLoc({ ...loc, locked: true })}
            onClear={() => setDestLoc(null)}
          />
          <TouchableOpacity
            style={[styles.planBtn, !canPlan && styles.planBtnDisabled]}
            onPress={handlePlanTrip}
            disabled={!canPlan || loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.planBtnText}>Plan Trip</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Route pills ── */}
        {hasTrip && tripStates.length > 0 && (
          <RoutePillRow states={tripStates} onPillPress={scrollToCard} />
        )}

        {/* ── Main content ── */}
        {loading ? (
          <View style={styles.loadingCenter}>
            <ActivityIndicator color={colors.sky} size="large" />
            <Text style={styles.loadingText}>Building your trip briefing…</Text>
          </View>
        ) : !hasTrip ? (
          <EmptyPlaceholder />
        ) : (
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.briefingScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {tripStates.length === 0 ? (
              <View style={styles.noStates}>
                <Text style={styles.noStatesText}>No states detected along this route.</Text>
                <Text style={styles.noStatesSub}>Try a longer or different route.</Text>
              </View>
            ) : (
              tripStates.map((ts, i) => (
                <View
                  key={ts.stateCode + i}
                  onLayout={(e) => {
                    cardOffsets.current[i] = e.nativeEvent.layout.y;
                  }}
                >
                  <StateBriefingCard tripState={ts} index={i} />
                </View>
              ))
            )}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  title: {
    fontFamily: typography.h1.fontFamily,
    fontSize: typography.h1.fontSize,
    color: colors.white,
  },
  newTripBtn: {
    backgroundColor: colors.steel,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.border + '55',
  },
  newTripText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    color: colors.skyLight,
    fontWeight: '600',
  },

  searchPanel: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },

  planBtn: {
    backgroundColor: colors.sky,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  planBtnDisabled: {
    backgroundColor: colors.steel,
  },
  planBtnText: {
    fontFamily: typography.h2.fontFamily,
    fontSize: typography.h2.fontSize,
    color: colors.white,
  },

  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  loadingText: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    color: colors.silver,
  },

  briefingScroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 48,
  },

  noStates: {
    paddingTop: 48,
    alignItems: 'center',
    gap: 8,
  },
  noStatesText: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    color: colors.silver,
  },
  noStatesSub: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    color: colors.slate,
  },
});
