import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, Switch,
  TouchableOpacity, Alert, Modal, TextInput, Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, typography } from '../../constants/theme';
import { useUserStore, type Permit, type FirearmsProfile } from '../../store/userStore';
import { useLocationStore } from '../../store/locationStore';
import { useSubscription } from '../../hooks/useSubscription';
import { STATES } from '../../constants/states';
import {
  signOut, insertPermit, deletePermit, upsertUserProfile, getSession,
} from '../../services/supabase';
import { startTracking, stopTracking } from '../../services/location';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

function formatExpiry(iso: string): string {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Add Permit Sheet ─────────────────────────────────────────────────────────

function AddPermitSheet({
  visible, onClose, onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (stateCode: string, permitType: 'resident' | 'non-resident', expiryDate: string) => Promise<void>;
}) {
  const [stateQuery, setStateQuery] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [permitType, setPermitType] = useState<'resident' | 'non-resident'>('resident');
  const [expiryDate, setExpiryDate] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = STATES.filter(
    s => s.name.toLowerCase().includes(stateQuery.toLowerCase()) ||
         s.code.toLowerCase().includes(stateQuery.toLowerCase())
  ).slice(0, 6);

  async function handleAdd() {
    if (!stateCode) { Alert.alert('Select a state first'); return; }
    setSaving(true);
    await onAdd(stateCode, permitType, expiryDate);
    setSaving(false);
    setStateCode(''); setStateQuery(''); setExpiryDate('');
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={addSheet.overlay} onPress={onClose}>
        <Pressable style={addSheet.container} onPress={() => {}}>
          <View style={addSheet.handle} />
          <Text style={addSheet.title}>Add Permit</Text>

          <TextInput
            style={addSheet.input}
            placeholder="Search state..."
            placeholderTextColor={colors.silver}
            value={stateQuery}
            onChangeText={v => { setStateQuery(v); setStateCode(''); }}
          />
          {stateQuery.length > 0 && !stateCode && (
            <View style={addSheet.dropdown}>
              {filtered.map(s => (
                <TouchableOpacity
                  key={s.code}
                  style={addSheet.dropdownRow}
                  onPress={() => { setStateCode(s.code); setStateQuery(s.name); }}
                >
                  <Text style={addSheet.dropdownCode}>{s.code}</Text>
                  <Text style={addSheet.dropdownName}>{s.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={addSheet.toggleRow}>
            {(['resident', 'non-resident'] as const).map(t => (
              <TouchableOpacity
                key={t}
                style={[addSheet.chip, permitType === t && addSheet.chipActive]}
                onPress={() => setPermitType(t)}
              >
                <Text style={[addSheet.chipText, permitType === t && addSheet.chipTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={addSheet.input}
            placeholder="Expiry date (YYYY-MM-DD) — optional"
            placeholderTextColor={colors.silver}
            value={expiryDate}
            onChangeText={setExpiryDate}
          />

          <TouchableOpacity
            style={[addSheet.cta, (!stateCode || saving) && addSheet.ctaDisabled]}
            onPress={handleAdd}
            disabled={!stateCode || saving}
          >
            <Text style={addSheet.ctaText}>{saving ? 'Saving…' : 'Add Permit'}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Edit Firearm Modal ───────────────────────────────────────────────────────

function EditFirearmModal({
  visible, profile, onClose, onSave,
}: {
  visible: boolean;
  profile: FirearmsProfile;
  onClose: () => void;
  onSave: (p: FirearmsProfile) => Promise<void>;
}) {
  const [draft, setDraft] = useState<FirearmsProfile>(profile);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setDraft(profile); }, [profile]);

  type FirearmType = 'handgun' | 'rifle' | 'shotgun' | 'all';
  type CarryPurpose = 'ccw' | 'transport' | 'hunting';

  const firearmsTypes: { label: string; value: FirearmType }[] = [
    { label: 'Handgun', value: 'handgun' },
    { label: 'Rifle',   value: 'rifle'   },
    { label: 'Shotgun', value: 'shotgun' },
    { label: 'All',     value: 'all'     },
  ];
  const carryPurposes: { label: string; value: CarryPurpose }[] = [
    { label: 'CCW',       value: 'ccw'       },
    { label: 'Transport', value: 'transport' },
    { label: 'Hunting',   value: 'hunting'   },
  ];

  async function handleSave() {
    setSaving(true);
    await onSave(draft);
    setSaving(false);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={addSheet.overlay} onPress={onClose}>
        <Pressable style={addSheet.container} onPress={() => {}}>
          <View style={addSheet.handle} />
          <Text style={addSheet.title}>Edit Firearm Profile</Text>

          <Text style={editStyle.label}>Firearm type</Text>
          <View style={editStyle.row}>
            {firearmsTypes.map(({ label, value }) => (
              <TouchableOpacity
                key={value}
                style={[addSheet.chip, draft.firearmsType === value && addSheet.chipActive]}
                onPress={() => setDraft(d => ({ ...d, firearmsType: value }))}
              >
                <Text style={[addSheet.chipText, draft.firearmsType === value && addSheet.chipTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={editStyle.label}>Carry purpose</Text>
          <View style={editStyle.row}>
            {carryPurposes.map(({ label, value }) => (
              <TouchableOpacity
                key={value}
                style={[addSheet.chip, draft.carryPurpose === value && addSheet.chipActive]}
                onPress={() => setDraft(d => ({ ...d, carryPurpose: value }))}
              >
                <Text style={[addSheet.chipText, draft.carryPurpose === value && addSheet.chipTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={editStyle.label}>Magazine capacity</Text>
          <TextInput
            style={addSheet.input}
            placeholder="e.g. 15"
            placeholderTextColor={colors.silver}
            keyboardType="numeric"
            value={draft.magCapacity != null ? String(draft.magCapacity) : ''}
            onChangeText={v => setDraft(d => ({ ...d, magCapacity: v ? parseInt(v, 10) : null }))}
          />

          <View style={editStyle.switchRow}>
            <Text style={editStyle.label}>Suppressor</Text>
            <Switch
              value={draft.hasSuppressor}
              onValueChange={v => setDraft(d => ({ ...d, hasSuppressor: v }))}
              trackColor={{ true: colors.sky, false: colors.border }}
              thumbColor={colors.white}
            />
          </View>

          <TouchableOpacity
            style={[addSheet.cta, saving && addSheet.ctaDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={addSheet.ctaText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return <Text style={sectionStyle.header}>{title}</Text>;
}

// ─── Profile Screen ───────────────────────────────────────────────────────────

function renewalDate(customerInfo: Record<string, unknown> | null): string | null {
  try {
    const active = (customerInfo as any)?.entitlements?.active ?? {};
    const entitlement = active['pro_plus'] ?? active['pro'];
    if (!entitlement?.expirationDate) return null;
    return new Date(entitlement.expirationDate).toLocaleDateString([], {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch {
    return null;
  }
}

export default function ProfileScreen() {
  const router = useRouter();
  const { permits, firearmsProfile, homeState, addPermit, removePermit, setProfile, reset, subscriptionTier, customerInfo } = useUserStore();
  const locationStore = useLocationStore();
  const { openPaywall } = useSubscription();

  const [email, setEmail] = useState<string | null>(null);
  const [userId, setLocalUserId] = useState<string | null>(null);
  const [addPermitVisible, setAddPermitVisible] = useState(false);
  const [editFirearmVisible, setEditFirearmVisible] = useState(false);
  const [trackingEnabled, setTrackingEnabled] = useState(locationStore.isTracking);
  const [alertsEnabled, setAlertsEnabled] = useState(true);

  useEffect(() => {
    getSession().then(({ data }) => {
      setEmail(data.session?.user?.email ?? null);
      setLocalUserId(data.session?.user?.id ?? null);
    });
  }, []);

  // ── Permit actions ─────────────────────────────────────────────────────────

  const handleAddPermit = useCallback(async (
    stateCode: string,
    permitType: 'resident' | 'non-resident',
    expiryDate: string
  ) => {
    if (!userId) return;
    const { data, error } = await insertPermit({
      user_id: userId,
      state_code: stateCode,
      permit_type: permitType,
      expiry_date: expiryDate || null,
    });
    if (error) { Alert.alert('Error', error.message); return; }
    if (data) {
      addPermit({ id: data.id, stateCode: data.state_code, permitType: data.permit_type, expiryDate: data.expiry_date });
    }
  }, [userId, addPermit]);

  const handleDeletePermit = useCallback((permit: Permit) => {
    const stateName = STATES.find(s => s.code === permit.stateCode)?.name ?? permit.stateCode;
    Alert.alert(
      'Remove Permit',
      `Remove your ${permit.permitType} permit for ${stateName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: async () => {
          await deletePermit(permit.id);
          removePermit(permit.id);
        }},
      ]
    );
  }, [removePermit]);

  // ── Firearm profile ────────────────────────────────────────────────────────

  const handleSaveFirearm = useCallback(async (p: FirearmsProfile) => {
    if (!userId) return;
    await upsertUserProfile({
      id: userId,
      home_state: homeState,
      carry_purpose: p.carryPurpose,
      firearm_type: p.firearmsType,
      mag_capacity: p.magCapacity,
      has_suppressor: p.hasSuppressor,
    });
    setProfile(homeState ?? '', p);
  }, [userId, homeState, setProfile]);

  // ── Tracking toggle ────────────────────────────────────────────────────────

  async function handleTrackingToggle(val: boolean) {
    setTrackingEnabled(val);
    if (val) { await startTracking(); locationStore.setTracking(true); }
    else { stopTracking(); }
  }

  // ── Sign out ───────────────────────────────────────────────────────────────

  function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => {
        stopTracking();
        await signOut();
        reset();
        locationStore.setCurrentState(null);
        locationStore.setTracking(false);
        router.replace('/(auth)/welcome');
      }},
    ]);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Permits */}
        <SectionHeader title="Permits" />
        {permits.length === 0 && <Text style={styles.emptyText}>No permits added yet.</Text>}
        {permits.map(permit => {
          const stateName = STATES.find(s => s.code === permit.stateCode)?.name ?? permit.stateCode;
          const expiring = permit.expiryDate ? daysUntil(permit.expiryDate) <= 30 : false;
          return (
            <View key={permit.id} style={styles.permitCard}>
              <View style={styles.permitInfo}>
                <View style={styles.permitTop}>
                  <Text style={styles.permitState}>{stateName}</Text>
                  {expiring && (
                    <View style={styles.expiryBadge}>
                      <Text style={styles.expiryBadgeText}>Expiring soon</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.permitType}>{permit.permitType}</Text>
                {permit.expiryDate && (
                  <Text style={styles.permitExpiry}>Expires {formatExpiry(permit.expiryDate)}</Text>
                )}
              </View>
              <TouchableOpacity onPress={() => handleDeletePermit(permit)} style={styles.deleteButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.deleteIcon}>✕</Text>
              </TouchableOpacity>
            </View>
          );
        })}
        <TouchableOpacity style={styles.addButton} onPress={() => setAddPermitVisible(true)}>
          <Text style={styles.addButtonText}>+ Add Permit</Text>
        </TouchableOpacity>

        {/* Firearm Profile */}
        <SectionHeader title="Firearm Profile" />
        <View style={styles.profileCard}>
          {[
            { label: 'Firearm type',      value: firearmsProfile.firearmsType },
            { label: 'Carry purpose',     value: firearmsProfile.carryPurpose },
            { label: 'Magazine capacity', value: firearmsProfile.magCapacity },
            { label: 'Suppressor',        value: firearmsProfile.hasSuppressor ? 'Yes' : 'No' },
          ].map((row, i, arr) => (
            <View key={row.label} style={[styles.profileRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
              <Text style={styles.profileLabel}>{row.label}</Text>
              <Text style={styles.profileValue}>{row.value != null ? String(row.value) : '—'}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity style={styles.editButton} onPress={() => setEditFirearmVisible(true)}>
          <Text style={styles.editButtonText}>Edit Firearm Profile</Text>
        </TouchableOpacity>

        {/* Notifications */}
        <SectionHeader title="Notifications" />
        <View style={styles.toggleCard}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Background tracking</Text>
              <Text style={styles.toggleSub}>Required for state-crossing detection</Text>
            </View>
            <Switch value={trackingEnabled} onValueChange={handleTrackingToggle} trackColor={{ true: colors.sky, false: colors.border }} thumbColor={colors.white} />
          </View>
          <View style={[styles.toggleRow, { borderBottomWidth: 0 }]}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Crossing alerts</Text>
              <Text style={styles.toggleSub}>Notify when you enter a new state</Text>
            </View>
            <Switch value={alertsEnabled} onValueChange={setAlertsEnabled} trackColor={{ true: colors.sky, false: colors.border }} thumbColor={colors.white} />
          </View>
        </View>

        {/* Subscription */}
        <SectionHeader title="Subscription" />
        <View style={styles.subCard}>
          <View style={styles.subCardLeft}>
            <View style={styles.subTierBadge}>
              <Text style={styles.subTierText}>
                {subscriptionTier === 'free' ? 'Free' :
                 subscriptionTier === 'pro' ? 'Pro' : 'Pro+'}
              </Text>
            </View>
            <View>
              <Text style={styles.subTitle}>
                {subscriptionTier === 'free' ? 'Crossline Free' :
                 subscriptionTier === 'pro' ? 'Crossline Pro' : 'Crossline Pro+'}
              </Text>
              {subscriptionTier !== 'free' && renewalDate(customerInfo) ? (
                <Text style={styles.subRenewal}>Renews {renewalDate(customerInfo)}</Text>
              ) : subscriptionTier === 'free' ? (
                <Text style={styles.subRenewal}>3 crossing alerts/month</Text>
              ) : null}
            </View>
          </View>
          <TouchableOpacity
            style={[styles.subManageBtn, subscriptionTier === 'free' && styles.subUpgradeBtn]}
            onPress={openPaywall}
            activeOpacity={0.8}
          >
            <Text style={[styles.subManageText, subscriptionTier === 'free' && styles.subUpgradeText]}>
              {subscriptionTier === 'free' ? 'Upgrade' : 'Manage'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Account */}
        <SectionHeader title="Account" />
        <View style={styles.accountCard}>
          <Text style={styles.accountLabel}>Signed in as</Text>
          <Text style={styles.accountEmail}>{email ?? '—'}</Text>
        </View>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>

      <AddPermitSheet visible={addPermitVisible} onClose={() => setAddPermitVisible(false)} onAdd={handleAddPermit} />
      <EditFirearmModal visible={editFirearmVisible} profile={firearmsProfile} onClose={() => setEditFirearmVisible(false)} onSave={handleSaveFirearm} />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title: { fontFamily: typography.h1.fontFamily, fontSize: typography.h1.fontSize, color: colors.white },
  scroll: { paddingHorizontal: 20, paddingBottom: 48 },
  emptyText: { fontFamily: typography.body.fontFamily, fontSize: typography.body.fontSize, color: colors.silver, marginBottom: 10 },

  permitCard: { backgroundColor: colors.steel, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center' },
  permitInfo: { flex: 1 },
  permitTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  permitState: { fontFamily: typography.h2.fontFamily, fontSize: typography.body.fontSize, color: colors.white },
  expiryBadge: { backgroundColor: colors.warning + '33', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: colors.warning },
  expiryBadgeText: { fontFamily: typography.caption.fontFamily, fontSize: 10, color: colors.warning },
  permitType: { fontFamily: typography.caption.fontFamily, fontSize: typography.caption.fontSize, color: colors.silver, textTransform: 'capitalize' },
  permitExpiry: { fontFamily: typography.caption.fontFamily, fontSize: typography.caption.fontSize, color: colors.slate, marginTop: 2 },
  deleteButton: { padding: 4 },
  deleteIcon: { color: colors.silver, fontSize: 16 },

  addButton: { borderWidth: 1, borderColor: colors.sky, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginBottom: 8 },
  addButtonText: { fontFamily: typography.body.fontFamily, fontSize: typography.body.fontSize, color: colors.sky },

  profileCard: { backgroundColor: colors.steel, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 8 },
  profileRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border + '55' },
  profileLabel: { fontFamily: typography.body.fontFamily, fontSize: typography.body.fontSize, color: colors.silver },
  profileValue: { fontFamily: typography.body.fontFamily, fontSize: typography.body.fontSize, color: colors.white, textTransform: 'capitalize' },
  editButton: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginBottom: 8 },
  editButtonText: { fontFamily: typography.body.fontFamily, fontSize: typography.body.fontSize, color: colors.silver },

  toggleCard: { backgroundColor: colors.steel, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 8 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border + '55' },
  toggleInfo: { flex: 1, paddingRight: 12 },
  toggleLabel: { fontFamily: typography.body.fontFamily, fontSize: typography.body.fontSize, color: colors.white },
  toggleSub: { fontFamily: typography.caption.fontFamily, fontSize: typography.caption.fontSize, color: colors.silver, marginTop: 2 },

  subCard: { backgroundColor: colors.steel, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
  subCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  subTierBadge: { backgroundColor: colors.sky + '33', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: colors.sky + '66' },
  subTierText: { fontFamily: typography.mono.fontFamily, fontSize: 12, color: colors.sky, fontWeight: '700' },
  subTitle: { fontFamily: typography.h2.fontFamily, fontSize: typography.body.fontSize, color: colors.white },
  subRenewal: { fontFamily: typography.caption.fontFamily, fontSize: typography.caption.fontSize, color: colors.silver, marginTop: 2 },
  subManageBtn: { backgroundColor: colors.steel, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: colors.border },
  subManageText: { fontFamily: typography.caption.fontFamily, fontSize: typography.caption.fontSize, color: colors.silver, fontWeight: '600' },
  subUpgradeBtn: { backgroundColor: colors.sky, borderColor: colors.sky },
  subUpgradeText: { color: colors.white },

  accountCard: { backgroundColor: colors.steel, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 8 },
  accountLabel: { fontFamily: typography.caption.fontFamily, fontSize: typography.caption.fontSize, color: colors.silver, marginBottom: 4 },
  accountEmail: { fontFamily: typography.body.fontFamily, fontSize: typography.body.fontSize, color: colors.white },

  signOutButton: { backgroundColor: colors.danger + '22', borderRadius: 10, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.danger + '66', marginBottom: 8 },
  signOutText: { fontFamily: typography.h2.fontFamily, fontSize: typography.body.fontSize, color: colors.danger },
});

const sectionStyle = StyleSheet.create({
  header: { fontFamily: typography.h2.fontFamily, fontSize: 11, color: colors.silver, letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 24, marginBottom: 10 },
});

const editStyle = StyleSheet.create({
  label: { fontFamily: typography.caption.fontFamily, fontSize: typography.caption.fontSize, color: colors.silver, marginBottom: 6, marginTop: 4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
});

const addSheet = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
  container: { backgroundColor: colors.navy, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40, gap: 10, borderTopWidth: 1, borderTopColor: colors.border },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 8 },
  title: { fontFamily: typography.h2.fontFamily, fontSize: typography.h2.fontSize, color: colors.white, marginBottom: 4 },
  input: { backgroundColor: colors.steel, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontFamily: typography.body.fontFamily, fontSize: typography.body.fontSize, color: colors.white, borderWidth: 1, borderColor: colors.border },
  dropdown: { backgroundColor: colors.steel, borderRadius: 8, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  dropdownRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border + '44' },
  dropdownCode: { fontFamily: typography.mono.fontFamily, fontSize: typography.mono.fontSize, color: colors.silver, width: 28 },
  dropdownName: { fontFamily: typography.body.fontFamily, fontSize: typography.body.fontSize, color: colors.white },
  toggleRow: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.sky, borderColor: colors.sky },
  chipText: { fontFamily: typography.caption.fontFamily, fontSize: typography.caption.fontSize, color: colors.silver },
  chipTextActive: { color: colors.white },
  cta: { backgroundColor: colors.sky, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  ctaDisabled: { opacity: 0.4 },
  ctaText: { fontFamily: typography.h2.fontFamily, fontSize: typography.h2.fontSize, color: colors.white },
});
