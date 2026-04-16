import { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, Alert,
} from 'react-native';
import { colors, typography } from '../../constants/theme';
import { useLocationStore } from '../../store/locationStore';
import { getStateFullName } from '../../services/geofence';
import { _devSimulateCrossing } from '../../services/location';
import { getStateName } from '../../constants/states';

// ─── Current State Card ───────────────────────────────────────────────────────

function CurrentStateCard({ stateCode }: { stateCode: string | null }) {
  return (
    <View style={styles.stateCard}>
      <Text style={styles.stateCardLabel}>Current State</Text>
      {stateCode ? (
        <>
          <Text style={styles.stateCardCode}>{stateCode}</Text>
          <Text style={styles.stateCardName}>{getStateName(stateCode)}</Text>
        </>
      ) : (
        <>
          <Text style={styles.stateCardCode}>--</Text>
          <Text style={styles.stateCardName}>Location not yet detected</Text>
        </>
      )}
    </View>
  );
}

// ─── Crossing History Feed ────────────────────────────────────────────────────

function CrossingFeed() {
  const { crossingHistory } = useLocationStore();

  if (crossingHistory.length === 0) {
    return (
      <View style={styles.emptyFeed}>
        <Text style={styles.emptyFeedText}>No crossings recorded yet.</Text>
        <Text style={styles.emptyFeedSub}>Drive across a state line to see events here.</Text>
      </View>
    );
  }

  return (
    <View style={styles.feed}>
      {crossingHistory.map((event, i) => {
        const time = new Date(event.crossedAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
        const date = new Date(event.crossedAt).toLocaleDateString([], {
          month: 'short',
          day: 'numeric',
        });
        return (
          <View key={i} style={styles.feedRow}>
            <View style={styles.feedDot} />
            <View style={styles.feedContent}>
              <Text style={styles.feedTitle}>
                {event.fromState ? `${event.fromState} → ` : ''}{event.toState}
              </Text>
              <Text style={styles.feedSub}>
                {getStateFullName(event.toState)} · {date} at {time}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── Dev Crossing Simulator (__DEV__ only) ───────────────────────────────────

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
  const { currentState, isTracking } = useLocationStore();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.wordmark}>CROSSLINE</Text>
        <View style={[styles.trackingBadge, isTracking && styles.trackingBadgeActive]}>
          <Text style={styles.trackingBadgeText}>
            {isTracking ? 'Tracking' : 'Paused'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <CurrentStateCard stateCode={currentState} />

        <Text style={styles.sectionHeader}>Crossing History</Text>
        <CrossingFeed />

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
    paddingBottom: 16,
  },
  wordmark: {
    fontFamily: typography.display.fontFamily,
    fontSize: 18,
    color: colors.sky,
    letterSpacing: 4,
  },
  trackingBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.steel,
    borderWidth: 1,
    borderColor: colors.border,
  },
  trackingBadgeActive: { borderColor: colors.success },
  trackingBadgeText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    color: colors.silver,
  },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  stateCard: {
    backgroundColor: colors.steel,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stateCardLabel: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    color: colors.silver,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  stateCardCode: {
    fontFamily: typography.display.fontFamily,
    fontSize: 64,
    color: colors.sky,
    lineHeight: 72,
  },
  stateCardName: {
    fontFamily: typography.h2.fontFamily,
    fontSize: typography.h2.fontSize,
    color: colors.white,
    marginTop: 4,
  },

  sectionHeader: {
    fontFamily: typography.h2.fontFamily,
    fontSize: typography.body.fontSize,
    color: colors.silver,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },

  emptyFeed: { alignItems: 'center', paddingVertical: 24, gap: 6 },
  emptyFeedText: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    color: colors.silver,
  },
  emptyFeedSub: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    color: colors.steel,
    textAlign: 'center',
  },
  feed: { gap: 4 },
  feedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  feedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.sky,
    marginTop: 5,
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

  devPanel: {
    marginTop: 32,
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
