import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, statusColors } from '../constants/theme';
import { useUserStore } from '../store/userStore';
import {
  getOfferings, getOfferingById, purchasePackage, restorePurchases,
  getTierFromCustomerInfo,
  type PurchasesOffering, type PurchasesPackage,
} from '../services/revenuecat';

// ─── Feature table ─────────────────────────────────────────────────────────────

const FEATURES: {
  label: string;
  free: string;
  pro: string;
  proPlus: string;
}[] = [
  { label: 'State law library',    free: '✓',    pro: '✓',    proPlus: '✓' },
  { label: 'Crossing alerts',      free: '3/mo', pro: '∞',    proPlus: '∞' },
  { label: 'Reciprocity map',      free: '✓',    pro: '✓',    proPlus: '✓' },
  { label: 'AI legal assistant',   free: '✗',    pro: '✓',    proPlus: '✓' },
  { label: 'Trip planner',         free: '✗',    pro: '✓',    proPlus: '✓' },
  { label: 'Law change alerts',    free: '✗',    pro: '✓',    proPlus: '✓' },
  { label: 'Attorney referrals',   free: '✗',    pro: '✗',    proPlus: '✓' },
  { label: 'Trip reports (PDF)',   free: '✗',    pro: '✗',    proPlus: '✓' },
];

// ─── Static pricing (shown before offering loads / as fallback) ───────────────

const PRICES = {
  pro:     { monthly: '$4.99', annual: '$34.99' },
  proPlus: { monthly: '$9.99', annual: '$69.99' },
};

// ─── Package lookup helpers ───────────────────────────────────────────────────

function findPackage(
  offering: PurchasesOffering | null,
  period: 'monthly' | 'annual',
): PurchasesPackage | null {
  if (!offering) return null;
  return offering.availablePackages.find(p =>
    period === 'monthly'
      ? p.packageType === 'MONTHLY'
      : p.packageType === 'ANNUAL'
  ) ?? null;
}

function formatPrice(pkg: PurchasesPackage | null, fallback: string): string {
  return pkg?.product.priceString ?? fallback;
}

// ─── Paywall Screen ───────────────────────────────────────────────────────────

export default function PaywallScreen() {
  const router = useRouter();
  const { setSubscriptionTier, setCustomerInfo } = useUserStore();

  const [selectedTier, setSelectedTier] = useState<'pro' | 'pro_plus'>('pro');
  const [selectedPeriod, setSelectedPeriod] = useState<'monthly' | 'annual'>('annual');
  const [proOffering, setProOffering] = useState<PurchasesOffering | null>(null);
  const [proPlusOffering, setProPlusOffering] = useState<PurchasesOffering | null>(null);
  const [loadingOfferings, setLoadingOfferings] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Load offerings
  useEffect(() => {
    Promise.all([
      getOfferings(),
      getOfferingById('pro_plus'),
    ]).then(([pro, proPlus]) => {
      setProOffering(pro);
      setProPlusOffering(proPlus);
      setLoadingOfferings(false);
    });
  }, []);

  // Derived packages
  const activeOffering = selectedTier === 'pro' ? proOffering : proPlusOffering;
  const activePackage = findPackage(activeOffering, selectedPeriod);

  // Price display
  const proMonthlyPrice = formatPrice(findPackage(proOffering, 'monthly'), PRICES.pro.monthly);
  const proAnnualPrice = formatPrice(findPackage(proOffering, 'annual'), PRICES.pro.annual);
  const proPlusMonthlyPrice = formatPrice(findPackage(proPlusOffering, 'monthly'), PRICES.proPlus.monthly);
  const proPlusAnnualPrice = formatPrice(findPackage(proPlusOffering, 'annual'), PRICES.proPlus.annual);

  const displayPrice = selectedTier === 'pro'
    ? (selectedPeriod === 'monthly' ? proMonthlyPrice : proAnnualPrice)
    : (selectedPeriod === 'monthly' ? proPlusMonthlyPrice : proPlusAnnualPrice);

  const tierLabel = selectedTier === 'pro' ? 'Pro' : 'Pro+';
  const periodLabel = selectedPeriod === 'monthly' ? '/mo' : '/yr';

  // ── Purchase ───────────────────────────────────────────────────────────────

  const handlePurchase = useCallback(async () => {
    if (!activePackage) {
      Alert.alert(
        'Products Not Configured',
        'In-app products have not yet been set up in App Store Connect / Google Play. This will be available in the next build.',
      );
      return;
    }
    setPurchasing(true);
    const result = await purchasePackage(activePackage);
    setPurchasing(false);

    if (result.success && result.customerInfo) {
      const info = result.customerInfo as unknown as Record<string, unknown>;
      setCustomerInfo(info);
      setSubscriptionTier(getTierFromCustomerInfo(result.customerInfo));
      router.back();
      // Small delay so the screen dismisses before the alert appears
      setTimeout(() => {
        Alert.alert('Welcome to Crossline ' + tierLabel + '!', 'Your subscription is now active.');
      }, 400);
    } else if (result.error && result.error !== 'cancelled') {
      Alert.alert('Purchase Failed', result.error);
    }
  }, [activePackage, selectedTier, tierLabel, setSubscriptionTier, setCustomerInfo, router]);

  // ── Restore ────────────────────────────────────────────────────────────────

  const handleRestore = useCallback(async () => {
    setRestoring(true);
    const result = await restorePurchases();
    setRestoring(false);

    if (result.success && result.customerInfo) {
      const info = result.customerInfo as unknown as Record<string, unknown>;
      setCustomerInfo(info);
      const tier = getTierFromCustomerInfo(result.customerInfo);
      setSubscriptionTier(tier);
      if (tier !== 'free') {
        router.back();
        setTimeout(() => {
          Alert.alert('Purchases Restored', `Your ${tier === 'pro_plus' ? 'Pro+' : 'Pro'} subscription has been restored.`);
        }, 400);
      } else {
        Alert.alert('No Active Subscription', 'No previous subscription found for this Apple ID.');
      }
    } else {
      Alert.alert('Restore Failed', 'Could not restore purchases. Please try again.');
    }
  }, [setSubscriptionTier, setCustomerInfo, router]);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      {/* Close button */}
      <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.wordmark}>CROSSLINE</Text>
          <Text style={styles.headline}>Go Pro</Text>
          <Text style={styles.subheadline}>Unlock the full legal briefing suite for safer travels.</Text>
        </View>

        {/* Feature table */}
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableCell, styles.tableFeatureHeader]} />
            <Text style={[styles.tableColHeader, styles.tableFreeCol]}>Free</Text>
            <Text style={[styles.tableColHeader, styles.tableProCol]}>Pro</Text>
            <Text style={[styles.tableColHeader, styles.tableProPlusCol]}>Pro+</Text>
          </View>
          {FEATURES.map((f, i) => (
            <View
              key={f.label}
              style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}
            >
              <Text style={[styles.tableCell, styles.tableFeatureLabel]}>{f.label}</Text>
              <Text style={[styles.tableCell, styles.tableFreeCol, styles.tableCellValue, f.free === '✗' && styles.tableNo]}>{f.free}</Text>
              <Text style={[styles.tableCell, styles.tableProCol, styles.tableCellValue, f.pro === '✗' && styles.tableNo]}>{f.pro}</Text>
              <Text style={[styles.tableCell, styles.tableProPlusCol, styles.tableCellValue, f.proPlus === '✗' && styles.tableNo]}>{f.proPlus}</Text>
            </View>
          ))}
        </View>

        {/* Billing period toggle */}
        <View style={styles.periodToggle}>
          {(['monthly', 'annual'] as const).map(period => (
            <TouchableOpacity
              key={period}
              style={[styles.periodBtn, selectedPeriod === period && styles.periodBtnActive]}
              onPress={() => setSelectedPeriod(period)}
              activeOpacity={0.8}
            >
              <Text style={[styles.periodBtnText, selectedPeriod === period && styles.periodBtnTextActive]}>
                {period === 'monthly' ? 'Monthly' : 'Annual'}
              </Text>
              {period === 'annual' && (
                <View style={styles.saveBadge}>
                  <Text style={styles.saveBadgeText}>Save 42%</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Subscription cards */}
        <View style={styles.cards}>
          {/* Pro card */}
          <TouchableOpacity
            style={[styles.card, selectedTier === 'pro' && styles.cardActive]}
            onPress={() => setSelectedTier('pro')}
            activeOpacity={0.85}
          >
            <View style={styles.cardTop}>
              <Text style={styles.cardTier}>Pro</Text>
              <View style={styles.popularBadge}>
                <Text style={styles.popularText}>Most Popular</Text>
              </View>
            </View>
            <Text style={styles.cardPrice}>
              {selectedPeriod === 'monthly' ? proMonthlyPrice : proAnnualPrice}
              <Text style={styles.cardPeriod}>{periodLabel}</Text>
            </Text>
            <View style={styles.cardFeatures}>
              <Text style={styles.cardFeatureLine}>✓  Unlimited crossing alerts</Text>
              <Text style={styles.cardFeatureLine}>✓  AI legal assistant</Text>
              <Text style={styles.cardFeatureLine}>✓  Trip planner</Text>
            </View>
          </TouchableOpacity>

          {/* Pro+ card */}
          <TouchableOpacity
            style={[styles.card, selectedTier === 'pro_plus' && styles.cardActive]}
            onPress={() => setSelectedTier('pro_plus')}
            activeOpacity={0.85}
          >
            <View style={styles.cardTop}>
              <Text style={styles.cardTier}>Pro+</Text>
            </View>
            <Text style={styles.cardPrice}>
              {selectedPeriod === 'monthly' ? proPlusMonthlyPrice : proPlusAnnualPrice}
              <Text style={styles.cardPeriod}>{periodLabel}</Text>
            </Text>
            <View style={styles.cardFeatures}>
              <Text style={styles.cardFeatureLine}>✓  Everything in Pro</Text>
              <Text style={styles.cardFeatureLine}>✓  Attorney referrals</Text>
              <Text style={styles.cardFeatureLine}>✓  Trip reports (PDF)</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* CTA button */}
        <TouchableOpacity
          style={[styles.ctaBtn, purchasing && styles.ctaBtnDisabled]}
          onPress={handlePurchase}
          disabled={purchasing || loadingOfferings}
          activeOpacity={0.85}
        >
          {purchasing ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.ctaText}>
              Start {tierLabel} — {displayPrice}{periodLabel}
            </Text>
          )}
        </TouchableOpacity>

        {/* Restore */}
        <TouchableOpacity
          style={styles.restoreBtn}
          onPress={handleRestore}
          disabled={restoring}
          activeOpacity={0.7}
        >
          {restoring ? (
            <ActivityIndicator color={colors.silver} size="small" />
          ) : (
            <Text style={styles.restoreText}>Restore Purchases</Text>
          )}
        </TouchableOpacity>

        {/* Legal footer */}
        <Text style={styles.legal}>
          Subscription auto-renews. Cancel anytime in{' '}
          {Platform.OS === 'ios' ? 'App Store' : 'Google Play'} settings.
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy },

  closeBtn: {
    position: 'absolute',
    top: 56,
    right: 20,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.steel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: colors.silver, fontSize: 14, fontWeight: '600' },

  scroll: { paddingHorizontal: 20, paddingTop: 32, paddingBottom: 48 },

  header: { alignItems: 'center', gap: 6, marginBottom: 28, paddingTop: 24 },
  wordmark: {
    fontFamily: typography.display.fontFamily,
    fontSize: 14,
    color: colors.sky,
    letterSpacing: 4,
  },
  headline: {
    fontFamily: typography.display.fontFamily,
    fontSize: 36,
    color: colors.white,
    lineHeight: 42,
  },
  subheadline: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    color: colors.silver,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },

  // Feature table
  table: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border + '44',
    marginBottom: 24,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: colors.steel,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  tableRowAlt: { backgroundColor: colors.steel + '55' },
  tableCell: { flex: 2 },
  tableFeatureHeader: {},
  tableColHeader: {
    flex: 1,
    fontFamily: typography.caption.fontFamily,
    fontSize: 11,
    color: colors.silver,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableProCol: { color: colors.sky },
  tableProPlusCol: { color: colors.skyLight },
  tableFreeCol: {},
  tableFeatureLabel: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 12,
    color: colors.white,
    flex: 2.5,
  },
  tableCellValue: {
    flex: 1,
    fontFamily: typography.mono.fontFamily,
    fontSize: 12,
    color: colors.success,
    textAlign: 'center',
  },
  tableNo: { color: colors.slate },

  // Period toggle
  periodToggle: {
    flexDirection: 'row',
    backgroundColor: colors.steel,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  periodBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 9,
    gap: 6,
  },
  periodBtnActive: { backgroundColor: colors.navy },
  periodBtnText: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    color: colors.silver,
  },
  periodBtnTextActive: { color: colors.white, fontWeight: '600' },
  saveBadge: {
    backgroundColor: colors.success + '33',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.success + '66',
  },
  saveBadgeText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 10,
    color: colors.success,
    fontWeight: '600',
  },

  // Subscription cards
  cards: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  card: {
    flex: 1,
    backgroundColor: colors.steel,
    borderRadius: 14,
    padding: 14,
    borderWidth: 2,
    borderColor: colors.border + '44',
    gap: 8,
  },
  cardActive: { borderColor: colors.sky },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  cardTier: {
    fontFamily: typography.h2.fontFamily,
    fontSize: typography.h2.fontSize,
    color: colors.white,
  },
  popularBadge: {
    backgroundColor: colors.sky + '33',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.sky + '66',
  },
  popularText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 9,
    color: colors.sky,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  cardPrice: {
    fontFamily: typography.display.fontFamily,
    fontSize: 22,
    color: colors.white,
    lineHeight: 28,
  },
  cardPeriod: {
    fontFamily: typography.body.fontFamily,
    fontSize: 14,
    color: colors.silver,
  },
  cardFeatures: { gap: 4 },
  cardFeatureLine: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 12,
    color: colors.silver,
    lineHeight: 18,
  },

  // CTA
  ctaBtn: {
    backgroundColor: colors.sky,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  ctaBtnDisabled: { opacity: 0.5 },
  ctaText: {
    fontFamily: typography.h2.fontFamily,
    fontSize: typography.h2.fontSize,
    color: colors.white,
  },

  // Restore + legal
  restoreBtn: { alignItems: 'center', paddingVertical: 8, marginBottom: 16 },
  restoreText: {
    fontFamily: typography.body.fontFamily,
    fontSize: 14,
    color: colors.skyLight,
    textDecorationLine: 'underline',
  },
  legal: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 11,
    color: colors.slate,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 12,
  },
});
