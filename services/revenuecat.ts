import Purchases, {
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
  LOG_LEVEL,
} from 'react-native-purchases';
import { Platform } from 'react-native';

export type { CustomerInfo, PurchasesOffering, PurchasesPackage };

const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '';

// ─── Initialization ───────────────────────────────────────────────────────────

/**
 * initializePurchases()
 * Configure RevenueCat once on app launch. Call before any other RC methods.
 */
export function initializePurchases(): void {
  const apiKey = Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY;
  if (!apiKey) {
    if (__DEV__) console.warn('[revenuecat] No API key configured — set EXPO_PUBLIC_REVENUECAT_IOS/ANDROID_KEY');
    return;
  }
  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }
  Purchases.configure({ apiKey });
  if (__DEV__) console.log('[revenuecat] Initialized');
}

// ─── Offerings ────────────────────────────────────────────────────────────────

/**
 * getOfferings()
 * Returns the current default offering or null if unavailable.
 */
export async function getOfferings(): Promise<PurchasesOffering | null> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current ?? null;
  } catch (err) {
    if (__DEV__) console.warn('[revenuecat] getOfferings error:', err);
    return null;
  }
}

/**
 * getOfferingById()
 * Returns an offering by identifier (e.g. 'pro_plus').
 */
export async function getOfferingById(id: string): Promise<PurchasesOffering | null> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.all[id] ?? null;
  } catch (err) {
    if (__DEV__) console.warn('[revenuecat] getOfferingById error:', err);
    return null;
  }
}

// ─── Purchases ────────────────────────────────────────────────────────────────

/**
 * purchasePackage()
 * Wraps Purchases.purchasePackage() with error handling.
 */
export async function purchasePackage(
  pkg: PurchasesPackage
): Promise<{ success: boolean; customerInfo?: CustomerInfo; error?: string }> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { success: true, customerInfo };
  } catch (err: any) {
    if (err.userCancelled) {
      return { success: false, error: 'cancelled' };
    }
    if (__DEV__) console.warn('[revenuecat] purchasePackage error:', err);
    return { success: false, error: err.message ?? 'Purchase failed. Please try again.' };
  }
}

// ─── Restore ─────────────────────────────────────────────────────────────────

/**
 * restorePurchases()
 * Restores any previously purchased subscriptions.
 */
export async function restorePurchases(): Promise<{ success: boolean; customerInfo?: CustomerInfo }> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    return { success: true, customerInfo };
  } catch (err: any) {
    if (__DEV__) console.warn('[revenuecat] restorePurchases error:', err);
    return { success: false };
  }
}

// ─── Customer info ────────────────────────────────────────────────────────────

/**
 * getCustomerInfo()
 * Returns the current CustomerInfo or null on error.
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    return await Purchases.getCustomerInfo();
  } catch (err) {
    if (__DEV__) console.warn('[revenuecat] getCustomerInfo error:', err);
    return null;
  }
}

// ─── Entitlement checks ───────────────────────────────────────────────────────

/**
 * isProUser()
 * True if the user has an active 'pro' or 'pro_plus' entitlement.
 */
export function isProUser(customerInfo: CustomerInfo): boolean {
  return (
    'pro' in customerInfo.entitlements.active ||
    'pro_plus' in customerInfo.entitlements.active
  );
}

/**
 * isProPlusUser()
 * True if the user has an active 'pro_plus' entitlement.
 */
export function isProPlusUser(customerInfo: CustomerInfo): boolean {
  return 'pro_plus' in customerInfo.entitlements.active;
}

/**
 * getTierFromCustomerInfo()
 * Derives the subscription tier from active entitlements.
 */
export function getTierFromCustomerInfo(
  customerInfo: CustomerInfo
): 'free' | 'pro' | 'pro_plus' {
  if (isProPlusUser(customerInfo)) return 'pro_plus';
  if (isProUser(customerInfo)) return 'pro';
  return 'free';
}
