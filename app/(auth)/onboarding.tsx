import { requestCrossingNotifications } from '../../services/notifications';
import { loadAccount } from '../../services/account';
import { savePreferences } from '../../services/preferences';
import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, TextInput, Switch, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import { colors, typography } from '../../constants/theme';
import { STATES } from '../../constants/states';
import { requestPermissions } from '../../services/location';
import { supabase, getSession } from '../../services/supabase';
import { useUserStore, type Permit, type FirearmsProfile } from '../../store/userStore';

// ─── Types ────────────────────────────────────────────────────────────────────

type FirearmType = 'handgun' | 'rifle' | 'shotgun' | 'all';
type CarryPurpose = 'ccw' | 'transport' | 'hunting';
type PermitType = 'resident' | 'non-resident';

interface DraftPermit {
  stateCode: string;
  permitType: PermitType;
  expiryDate: string;
}

const TOTAL_STEPS = 4;

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  return (
    <View style={styles.progressContainer}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View
          key={i}
          style={[styles.progressSegment, i < step && styles.progressSegmentActive]}
        />
      ))}
    </View>
  );
}

// ─── Step 1: Home State ───────────────────────────────────────────────────────

function StepHomeState({
  value, onChange,
}: { value: string; onChange: (code: string) => void }) {
  const [query, setQuery] = useState('');
  const filtered = STATES.filter(
    s =>
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.code.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Where is your home state?</Text>
      <Text style={styles.stepSubtitle}>We use this to determine your resident permit status.</Text>
      <TextInput
        style={styles.searchInput}
        placeholder="Search states..."
        placeholderTextColor={colors.silver}
        value={query}
        onChangeText={setQuery}
      />
      <ScrollView style={styles.stateList} showsVerticalScrollIndicator={false}>
        {filtered.map(state => (
          <TouchableOpacity
            key={state.code}
            style={[styles.stateRow, value === state.code && styles.stateRowSelected]}
            onPress={() => onChange(state.code)}
          >
            <Text style={[styles.stateCode, value === state.code && styles.stateTextSelected]}>
              {state.code}
            </Text>
            <Text style={[styles.stateName, value === state.code && styles.stateTextSelected]}>
              {state.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Step 2: Permits ──────────────────────────────────────────────────────────

function StepPermits({
  permits, onAdd, onRemove,
}: {
  permits: DraftPermit[];
  onAdd: (p: DraftPermit) => void;
  onRemove: (i: number) => void;
}) {
  const [stateCode, setStateCode] = useState('');
  const [permitType, setPermitType] = useState<PermitType>('resident');
  const [expiryDate, setExpiryDate] = useState('');
  const [stateQuery, setStateQuery] = useState('');

  const filtered = STATES.filter(
    s =>
      s.name.toLowerCase().includes(stateQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(stateQuery.toLowerCase())
  ).slice(0, 8);

  function addPermit() {
    if (!stateCode) return;
    onAdd({ stateCode, permitType, expiryDate });
    setStateCode('');
    setStateQuery('');
    setExpiryDate('');
  }

  return (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Your permits</Text>
      <Text style={styles.stepSubtitle}>Add all permits you currently hold.</Text>

      {permits.map((p, i) => (
        <View key={i} style={styles.permitChip}>
          <Text style={styles.permitChipText}>{p.stateCode} · {p.permitType}</Text>
          <TouchableOpacity onPress={() => onRemove(i)}>
            <Text style={styles.permitChipRemove}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}

      <View style={styles.permitForm}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search state..."
          placeholderTextColor={colors.silver}
          value={stateQuery}
          onChangeText={v => { setStateQuery(v); setStateCode(''); }}
        />
        {stateQuery.length > 0 && !stateCode && (
          <View style={styles.stateDropdown}>
            {filtered.map(s => (
              <TouchableOpacity
                key={s.code}
                style={styles.dropdownRow}
                onPress={() => { setStateCode(s.code); setStateQuery(s.name); }}
              >
                <Text style={styles.dropdownText}>{s.code} — {s.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.toggleRow}>
          {(['resident', 'non-resident'] as PermitType[]).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.toggleChip, permitType === t && styles.toggleChipActive]}
              onPress={() => setPermitType(t)}
            >
              <Text style={[styles.toggleChipText, permitType === t && styles.toggleChipTextActive]}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={styles.searchInput}
          placeholder="Expiry date (YYYY-MM-DD) — optional"
          placeholderTextColor={colors.silver}
          value={expiryDate}
          onChangeText={setExpiryDate}
        />

        <TouchableOpacity
          style={[styles.addButton, !stateCode && styles.addButtonDisabled]}
          onPress={addPermit}
          disabled={!stateCode}
        >
          <Text style={styles.addButtonText}>+ Add Permit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Step 3: Firearm Profile ──────────────────────────────────────────────────

function StepFirearmProfile({
  profile, onChange,
}: {
  profile: Partial<FirearmsProfile>;
  onChange: (updates: Partial<FirearmsProfile>) => void;
}) {
  const firearmsTypes: { label: string; value: FirearmType }[] = [
    { label: 'Handgun', value: 'handgun' },
    { label: 'Rifle', value: 'rifle' },
    { label: 'Shotgun', value: 'shotgun' },
    { label: 'All Types', value: 'all' },
  ];
  const carryPurposes: { label: string; value: CarryPurpose }[] = [
    { label: 'Concealed Carry (CCW)', value: 'ccw' },
    { label: 'Transport / Storage', value: 'transport' },
    { label: 'Hunting', value: 'hunting' },
  ];

  return (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Firearm profile</Text>
      <Text style={styles.stepSubtitle}>We filter laws to your specific situation.</Text>

      <Text style={styles.fieldLabel}>Firearm type</Text>
      <View style={styles.toggleRow}>
        {firearmsTypes.map(({ label, value }) => (
          <TouchableOpacity
            key={value}
            style={[styles.toggleChip, profile.firearmsType === value && styles.toggleChipActive]}
            onPress={() => onChange({ firearmsType: value })}
          >
            <Text style={[styles.toggleChipText, profile.firearmsType === value && styles.toggleChipTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.fieldLabel}>Carry purpose</Text>
      <View style={styles.toggleRow}>
        {carryPurposes.map(({ label, value }) => (
          <TouchableOpacity
            key={value}
            style={[styles.toggleChip, profile.carryPurpose === value && styles.toggleChipActive]}
            onPress={() => onChange({ carryPurpose: value })}
          >
            <Text style={[styles.toggleChipText, profile.carryPurpose === value && styles.toggleChipTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.fieldLabel}>Magazine capacity</Text>
      <TextInput
        style={styles.searchInput}
        placeholder="e.g. 15"
        placeholderTextColor={colors.silver}
        keyboardType="numeric"
        value={profile.magCapacity != null ? String(profile.magCapacity) : ''}
        onChangeText={v => onChange({ magCapacity: v ? parseInt(v, 10) : null })}
      />

      <View style={styles.switchRow}>
        <Text style={styles.fieldLabel}>Suppressor</Text>
        <Switch
          value={profile.hasSuppressor ?? false}
          onValueChange={v => onChange({ hasSuppressor: v })}
          trackColor={{ true: colors.sky, false: colors.border }}
          thumbColor={colors.white}
        />
      </View>
    </View>
  );
}

// ─── Step 4: Location Permission ──────────────────────────────────────────────

function StepLocation({
  permissionGranted, onRequest,
}: {
  permissionGranted: boolean | null;
  onRequest: () => void;
}) {
  return (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Enable background location</Text>
      <Text style={styles.stepSubtitle}>
        Enable optional background tracking for state-crossing alerts. You can finish setup without granting location access.
      </Text>
      <Text style={styles.locationDetail}>
        Alerts appear after a crossing is confirmed. Device settings and signal quality can delay alerts. Reviewed coverage is limited during beta.
      </Text>
      <Text style={styles.locationDetail}>
        Your location data is processed on-device. We never store your GPS
        coordinates. Saving state-level crossing history is off by default.
      </Text>
      <Text style={styles.locationDetail}>
        You can disable background tracking at any time in Settings.
      </Text>

      {permissionGranted === true && (
        <View style={styles.permissionGranted}>
          <Text style={styles.permissionGrantedText}>Location access granted</Text>
        </View>
      )}
      {permissionGranted === false && (
        <View style={styles.permissionDenied}>
          <Text style={styles.permissionDeniedText}>
            Background access was not granted. Enable it later in your device settings, or continue without tracking.
          </Text>
        </View>
      )}
      {permissionGranted === null && (
        <TouchableOpacity style={styles.ctaButton} onPress={onRequest} activeOpacity={0.85}>
          <Text style={styles.ctaText}>Allow Background Location</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Main Onboarding Screen ───────────────────────────────────────────────────

export default function OnboardingScreen() {
  const router = useRouter();
  const { userId: signedInId, setProfile, addPermit, setOnboarded, setUserId } = useUserStore();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [homeState, setHomeState] = useState('');
  // Step 2
  const [draftPermits, setDraftPermits] = useState<DraftPermit[]>([]);
  // Step 3
  const [firearmsProfile, setFirearmsProfile] = useState<Partial<FirearmsProfile>>({
    hasSuppressor: false,
  });
  // Step 4
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  function canAdvance(): boolean {
    if (step === 1) return homeState !== '';
    if (step === 2) return true; // permits are optional
    if (step === 3) return firearmsProfile.firearmsType != null && firearmsProfile.carryPurpose != null;
    if (step === 4) return true; // location permission is recommended but not blocking
    return false;
  }

  async function handleLocationRequest() {
    try { const granted = await requestPermissions(); setPermissionGranted(granted); if (granted) setNotificationsEnabled(await requestCrossingNotifications()); }
    catch { setPermissionGranted(false); }
  }

  async function handleFinish() {
    setSaving(true);
    try {
      const { data: sessionData } = await getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId) {
        Alert.alert('Error', 'No active session. Please log in.');
        router.replace('/(auth)/login');
        return;
      }

      const profile: FirearmsProfile = {
        firearmsType: firearmsProfile.firearmsType ?? null,
        magCapacity: firearmsProfile.magCapacity ?? null,
        hasSuppressor: firearmsProfile.hasSuppressor ?? false,
        carryPurpose: firearmsProfile.carryPurpose ?? null,
      };

      if (profile.magCapacity !== null && (!Number.isInteger(profile.magCapacity) || profile.magCapacity <= 0)) throw new Error('Magazine capacity must be a positive whole number.');
      const { error: saveError } = await supabase.rpc('save_onboarding', { profile: {
        id: userId,
        home_state: homeState,
        carry_purpose: profile.carryPurpose,
        firearm_type: profile.firearmsType,
        mag_capacity: profile.magCapacity,
        has_suppressor: profile.hasSuppressor,
      }, permits: draftPermits.map(dp => ({ state_code: dp.stateCode, permit_type: dp.permitType, expiry_date: dp.expiryDate || null })) });
      if (saveError) throw saveError;

      await savePreferences(userId, { tracking: permissionGranted === true, alerts: notificationsEnabled });
      await loadAccount(userId);
      setUserId(userId);
      setProfile(homeState, profile);
      setOnboarded(true);

      router.replace('/(tabs)/home');
    } catch (err) {
      Alert.alert('Could not save profile', err instanceof Error ? err.message : 'Check your entries and connection, then retry.');
    } finally {
      setSaving(false);
    }
  }

  function handleNext() {
    if (step < TOTAL_STEPS) {
      setStep(s => s + 1);
    } else {
      handleFinish();
    }
  }

  if (!signedInId) return <Redirect href="/(auth)/login" />;

  function handleBack() {
    if (step > 1) setStep(s => s - 1);
    else router.back();
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <ProgressBar step={step} />
        <Text style={styles.stepCounter}>{step} / {TOTAL_STEPS}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {step === 1 && (
          <StepHomeState value={homeState} onChange={setHomeState} />
        )}
        {step === 2 && (
          <StepPermits
            permits={draftPermits}
            onAdd={p => setDraftPermits(prev => [...prev, p])}
            onRemove={i => setDraftPermits(prev => prev.filter((_, idx) => idx !== i))}
          />
        )}
        {step === 3 && (
          <StepFirearmProfile
            profile={firearmsProfile}
            onChange={updates => setFirearmsProfile(prev => ({ ...prev, ...updates }))}
          />
        )}
        {step === 4 && (
          <StepLocation
            permissionGranted={permissionGranted}
            onRequest={handleLocationRequest}
          />
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.ctaButton, (!canAdvance() || saving) && styles.ctaButtonDisabled]}
          onPress={handleNext}
          disabled={!canAdvance() || saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.ctaText}>
              {step === TOTAL_STEPS ? 'Finish Setup' : 'Continue'}
            </Text>
          )}
        </TouchableOpacity>

        {step === TOTAL_STEPS && (
          <TouchableOpacity onPress={() => router.replace('/(tabs)/home')}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 12,
  },
  backButton: { padding: 4 },
  backText: { color: colors.silver, fontSize: 22 },
  progressContainer: { flex: 1, flexDirection: 'row', gap: 6 },
  progressSegment: {
    flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.steel,
  },
  progressSegmentActive: { backgroundColor: colors.sky },
  stepCounter: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    color: colors.silver,
    minWidth: 32,
    textAlign: 'right',
  },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 24 },
  stepContent: { gap: 16 },
  stepTitle: {
    fontFamily: typography.h1.fontFamily,
    fontSize: typography.h1.fontSize,
    color: colors.white,
    marginTop: 8,
  },
  stepSubtitle: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    color: colors.silver,
    lineHeight: 22,
  },
  searchInput: {
    backgroundColor: colors.steel,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    color: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stateList: { maxHeight: 320 },
  stateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  stateRowSelected: { backgroundColor: colors.sky + '33' },
  stateCode: {
    fontFamily: typography.mono.fontFamily,
    fontSize: typography.mono.fontSize,
    color: colors.silver,
    width: 30,
  },
  stateName: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    color: colors.white,
  },
  stateTextSelected: { color: colors.skyLight },
  permitChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.steel,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  permitChipText: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    color: colors.white,
  },
  permitChipRemove: { color: colors.silver, fontSize: 16 },
  permitForm: { gap: 10 },
  stateDropdown: {
    backgroundColor: colors.steel,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  dropdownRow: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownText: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    color: colors.white,
  },
  toggleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  toggleChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleChipActive: { backgroundColor: colors.sky, borderColor: colors.sky },
  toggleChipText: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    color: colors.silver,
  },
  toggleChipTextActive: { color: colors.white },
  addButton: {
    backgroundColor: colors.sky,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addButtonDisabled: { opacity: 0.4 },
  addButtonText: {
    fontFamily: typography.h2.fontFamily,
    fontSize: typography.body.fontSize,
    color: colors.white,
  },
  fieldLabel: {
    fontFamily: typography.h2.fontFamily,
    fontSize: typography.body.fontSize,
    color: colors.white,
    marginTop: 4,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  locationDetail: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    color: colors.silver,
    lineHeight: 22,
  },
  permissionGranted: {
    backgroundColor: colors.success + '22',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.success,
  },
  permissionGrantedText: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    color: colors.success,
    textAlign: 'center',
  },
  permissionDenied: {
    backgroundColor: colors.warning + '22',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  permissionDeniedText: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    color: colors.warning,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 12,
    gap: 12,
  },
  ctaButton: {
    backgroundColor: colors.sky,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaButtonDisabled: { opacity: 0.4 },
  ctaText: {
    fontFamily: typography.h2.fontFamily,
    fontSize: typography.h2.fontSize,
    color: colors.white,
  },
  skipText: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    color: colors.silver,
    textAlign: 'center',
  },
});
