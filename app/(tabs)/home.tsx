import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, Alert, Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, typography, statusColors } from '../../constants/theme';
import { useLocationStore } from '../../store/locationStore';
import { useUserStore } from '../../store/userStore';
import { useSubscription } from '../../hooks/useSubscription';
import { getStateFullName } from '../../services/geofence';
import { getStateName } from '../../constants/states';
import { _devSimulateCrossing } from '../../services/location';
import { getTopLawsForState, getCarryStatusForUser, type StateLaw } from '../../services/laws';
import type { CarryStatus } from '../../services/notifications';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

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
  const label: Record<CarryStatus, string> = {
    allowed: 'Carry Permitted',
    restricted: 'Restrictions Apply',
    prohibited: 'Carry Not Permitted',
    unknown: 'Status Unknown',
  };
  return (
    <View style={[styles.badge, { backgroundColor: statusColors[status] + '22', borderColor: statusColors[status] }]}>
      <View style={[styles.badgeDot, { backgroundColor: statusColors[status] }]} />
      <Text style={[styles.badgeText, { color: statusColors[status] }]}>{label[status]}</Text>
    </View>
  );
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonLine} />
      <View style={[styles.skeletonLine, { width: '70%', marginTop: 8 }]} />
    </View>
  );
}

// ─── Hero State Card ──────────────────────────────────────────────────────────

function HeroStateCard({
  stateCode,
  carryStatus,
  lastCrossedAt,
}: {
  stateCode: string | null;
  carryStatus: CarryStatus;
  lastCrossedAt: string | null;
}) {
  const router = useRouter();

  if (!stateCode) {
    return (
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>Current State</Text>
        <Text style={styles.heroPlaceholder}>Tracking your location...</Text>
        <Text style={styles.heroSub}>GPS acquiring signal</Text>
      </View>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.heroCard, pressed && styles.heroCardPressed]}
      onPress={() => router.push(`/(tabs)/laws?state=${stateCode}`)}
    >
      <Text style={styles.heroLabel}>Current State</Text>
      <Text style={styles.heroCode}>{stateCode}</Text>
      <Text style={styles.heroName}>{getStateName(stateCode)}</Text>
      <StatusBadge status={carryStatus} />
      {lastCrossedAt && (
        <Text style={styles.heroSub}>Last crossed {timeAgo(lastCrossedAt)}</Text>
      )}
      <Text style={styles.heroTap}>Tap for full laws →</Text>
    </Pressable>
  );
}

// ─── Top Law Highlights ───────────────────────────────────────────────────────

function LawHighlightCard({ law }: { law: StateLaw }) {
  const router = useRouter();
  return (
    <Pressable
      style={({ pressed }) => [styles.lawCard, pressed && styles.lawCardPressed]}
      onPress={() => router.push(`/(tabs)/laws?state=${law.state_code}&category=${law.category}`)}
    >
      <View style={styles.lawCardHeader}>
        <Text style={styles.lawCategory}>{CATEGORY_LABELS[law.category] ?? law.category}</Text>
        <Text style={styles.lawChevron}>›</Text>
      </View>
      <Text style={styles.lawSummary} numberOfLines={2}>{law.plain_english}</Text>
    </Pressable>
  );
}

function TopLawHighlights({ stateCode }: { stateCode: string }) {
  const [laws, setLaws] = useState<StateLaw[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getTopLawsForState(stateCode, 3).then(data => {
      setLaws(data);
      setLoading(false);
    });
  }, [stateCode]);

  return (
    <View style={styles.highlightsSection}>
      <Text style={styles.sectionHeader}>Key Laws</Text>
      {loading ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : laws.length === 0 ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : (
        laws.map(law => <LawHighlightCard key={law.id} law={law} />)
      )}
    </View>
  );
}

// ─── Crossing History Feed ────────────────────────────────────────────────────

function CrossingFeed() {
  const router = useRouter();
  const { crossingHistory } = useLocationStore();
  const recent = crossingHistory.slice(0, 10);

  if (recent.length === 0) {
    return (
      <View style={styles.emptyFeed}>
        <Text style={styles.emptyFeedText}>No crossings recorded yet.</Text>
        <Text style={styles.emptyFeedSub}>Start driving.</Text>
      </View>
    );
  }

  return (
    <View style={styles.feed}>
      {recent.map((event, i) => {
        const time = new Date(event.crossedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const date = new Date(event.crossedAt).toLocaleDateString([], { month: 'short', day: 'numeric' });
        return (
          <Pressable
            key={i}
            style={({ pressed }) => [styles.feedRow, pressed && styles.feedRowPressed]}
            onPress={() => router.push(`/(tabs)/laws?state=${event.toState}`)}
          >
            <View style={styles.feedDot} />
            <View style={styles.feedContent}>
              <Text style={styles.feedTitle}>
                {event.fromState ? `${event.fromState} → ` : ''}{event.toState}
              </Text>
              <Text style={styles.feedSub}>
                {getStateFullName(event.toState)} · {date} at {time}
              </Text>
            </View>
            <Text style={styles.feedChevron}>›</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Dev Crossing Simulator ───────────────────────────────────────────────────

function DevCrossingSimulator() {
  const [stateInput, setStateInput] = useState('');

  function handleSimulate() {
    const code = stateInput.toUpperCase().trim();
    if (code.length !== 2) {
      Alert.alert('Invalid', 'Enter a two-letter state code (e.g. TX)');
      return;
    }
    _devSimulateCrossing(code);
    setStateInput('');
    Alert.alert('Simulated', `Crossing into ${code} fired. Check notification.`);
  }

  return (
    <View style={styles.devPanel}>
      <Text style={styles.devPanelLabel}>DEV — Simulate Crossing</Text>
      <View style={styles.devRow}>
        <TextInput
          style={styles.devInput}
          placeholder="State code (e.g. TX)"
          placeholderTextColor={colors.silver}
          value={stateInput}
          onChangeText={setStateInput}
          autoCapitalize="characters"
          maxLength={2}
        />
        <TouchableOpacity style={styles.devButton} onPress={handleSimulate}>
          <Text style={styles.devButtonText}>Fire</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Home Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const { currentState, isTracking, crossingHistory } = useLocationStore();
  const { permits, firearmsProfile, subscriptionTier, monthlyAlertCount } = useUserStore();
  const { openPaywall } = useSubscription();
  const [carryStatus, setCarryStatus] = useState<CarryStatus>('unknown');
  const alertLimitReached = subscriptionTier === 'free' && monthlyAlertCount >= 3;

  const lastCrossedAt = crossingHistory[0]?.crossedAt ?? null;

  const refreshCarryStatus = useCallback(async () => {
    if (!currentState) return;
    const status = await getCarryStatusForUser(currentState, permits, firearmsProfile);
    setCarryStatus(status);
  }, [currentState, permits, firearmsProfile]);

  useEffect(() => {
    refreshCarryStatus();
  }, [refreshCarryStatus]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.wordmark}>CROSSLINE</Text>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/profile')}
          style={styles.settingsButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.settingsIcon}>⚙</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Alert limit banner */}
        {alertLimitReached && (
          <Pressable style={styles.alertBanner} onPress={openPaywall}>
            <Text style={styles.alertBannerText}>
              You've used your 3 free crossing alerts this month.{' '}
              <Text style={styles.alertBannerLink}>Upgrade to Pro for unlimited alerts →</Text>
            </Text>
          </Pressable>
        )}

        {/* Hero card */}
        <HeroStateCard
          stateCode={currentState}
          carryStatus={carryStatus}
          lastCrossedAt={lastCrossedAt}
        />

        {/* Top 3 law highlights */}
        {currentState && <TopLawHighlights stateCode={currentState} />}

        {/* Crossing history */}
        <Text style={styles.sectionHeader}>Crossing History</Text>
        <CrossingFeed />

        {/* Dev simulator */}
        {__DEV__ && <DevCrossingSimulator />}
      </ScrollView>
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
    paddingBottom: 12,
  },
  wordmark: {
    fontFamily: typography.display.fontFamily,
    fontSize: 18,
    color: colors.sky,
    letterSpacing: 4,
  },
  settingsButton: { padding: 4 },
  settingsIcon: { fontSize: 20, color: colors.silver },

  scroll: { paddingHorizontal: 20, paddingBottom: 48 },

  alertBanner: {
    backgroundColor: colors.warning + '22',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.warning + '55',
  },
  alertBannerText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    color: colors.warning,
    lineHeight: 18,
  },
  alertBannerLink: {
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  // Hero card
  heroCard: {
    backgroundColor: colors.steel,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  heroCardPressed: { opacity: 0.85 },
  heroLabel: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    color: colors.silver,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  heroCode: {
    fontFamily: typography.display.fontFamily,
    fontSize: 72,
    color: colors.sky,
    lineHeight: 80,
  },
  heroName: {
    fontFamily: typography.h1.fontFamily,
    fontSize: typography.h1.fontSize,
    color: colors.white,
  },
  heroPlaceholder: {
    fontFamily: typography.h2.fontFamily,
    fontSize: typography.h2.fontSize,
    color: colors.silver,
    marginTop: 8,
  },
  heroSub: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    color: colors.silver,
    marginTop: 4,
  },
  heroTap: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    color: colors.skyLight,
    marginTop: 8,
  },

  // Status badge
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 4,
  },
  badgeDot: { width: 7, height: 7, borderRadius: 4 },
  badgeText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
  },

  // Section header
  sectionHeader: {
    fontFamily: typography.h2.fontFamily,
    fontSize: 11,
    color: colors.silver,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },

  // Law highlights
  highlightsSection: { marginBottom: 28 },
  lawCard: {
    backgroundColor: colors.steel,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lawCardPressed: { opacity: 0.8 },
  lawCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  lawCategory: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    color: colors.skyLight,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  lawChevron: { color: colors.silver, fontSize: 18 },
  lawSummary: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    color: colors.white,
    lineHeight: 21,
  },

  // Skeleton
  skeletonCard: {
    backgroundColor: colors.steel,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.border + '66',
    width: '100%',
  },

  // Feed
  emptyFeed: { alignItems: 'center', paddingVertical: 20, gap: 4 },
  emptyFeedText: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    color: colors.silver,
  },
  emptyFeedSub: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    color: colors.slate,
  },
  feed: { gap: 2, marginBottom: 24 },
  feedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '55',
  },
  feedRowPressed: { backgroundColor: colors.steel + '44' },
  feedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.sky,
    flexShrink: 0,
  },
  feedContent: { flex: 1 },
  feedTitle: {
    fontFamily: typography.mono.fontFamily,
    fontSize: typography.mono.fontSize,
    color: colors.white,
  },
  feedSub: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    color: colors.silver,
    marginTop: 2,
  },
  feedChevron: { color: colors.silver, fontSize: 18 },

  // Dev panel
  devPanel: {
    marginTop: 16,
    backgroundColor: '#1a0a2e',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#6b21a8',
    gap: 10,
  },
  devPanelLabel: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    color: '#c084fc',
    letterSpacing: 1,
  },
  devRow: { flexDirection: 'row', gap: 10 },
  devInput: {
    flex: 1,
    backgroundColor: colors.steel,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: typography.mono.fontFamily,
    fontSize: typography.mono.fontSize,
    color: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  devButton: {
    backgroundColor: '#7c3aed',
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  devButtonText: {
    fontFamily: typography.h2.fontFamily,
    fontSize: typography.body.fontSize,
    color: colors.white,
  },
});
