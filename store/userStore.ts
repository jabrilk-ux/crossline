import { create } from 'zustand';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Permit {
  id: string;
  stateCode: string;
  permitType: 'resident' | 'non-resident';
  expiryDate: string | null; // ISO date string
}

export interface FirearmsProfile {
  firearmsType: 'handgun' | 'rifle' | 'shotgun' | 'all' | null;
  magCapacity: number | null;
  hasSuppressor: boolean;
  carryPurpose: 'ccw' | 'transport' | 'hunting' | null;
}

export type SubscriptionTier = 'free' | 'pro' | 'pro_plus';

interface UserState {
  userId: string | null;
  homeState: string | null;
  permits: Permit[];
  firearmsProfile: FirearmsProfile;
  isOnboarded: boolean;

  // Subscription
  subscriptionTier: SubscriptionTier;
  customerInfo: Record<string, unknown> | null; // CustomerInfo from react-native-purchases

  // Crossing alert quota (free tier: 3/month)
  monthlyAlertCount: number;
  alertCountResetMonth: string; // 'YYYY-MM'

  // Actions
  setUserId: (id: string | null) => void;
  setProfile: (homeState: string, firearmsProfile: FirearmsProfile) => void;
  addPermit: (permit: Permit) => void;
  removePermit: (permitId: string) => void;
  setOnboarded: (value: boolean) => void;
  setSubscriptionTier: (tier: SubscriptionTier) => void;
  setCustomerInfo: (info: Record<string, unknown> | null) => void;
  incrementAlertCount: () => void;
  resetAlertCount: () => void;
  setAlertCountResetMonth: (month: string) => void;
  reset: () => void;
}

// ─── Default values ───────────────────────────────────────────────────────────

const defaultFirearmsProfile: FirearmsProfile = {
  firearmsType: null,
  magCapacity: null,
  hasSuppressor: false,
  carryPurpose: null,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useUserStore = create<UserState>((set) => ({
  userId: null,
  homeState: null,
  permits: [],
  firearmsProfile: defaultFirearmsProfile,
  isOnboarded: false,
  subscriptionTier: 'free',
  customerInfo: null,
  monthlyAlertCount: 0,
  alertCountResetMonth: '',

  setUserId: (id) => set({ userId: id }),

  setProfile: (homeState, firearmsProfile) =>
    set({ homeState, firearmsProfile }),

  addPermit: (permit) =>
    set((state) => ({ permits: [...state.permits, permit] })),

  removePermit: (permitId) =>
    set((state) => ({ permits: state.permits.filter((p) => p.id !== permitId) })),

  setOnboarded: (value) => set({ isOnboarded: value }),

  setSubscriptionTier: (tier) => set({ subscriptionTier: tier }),

  setCustomerInfo: (info) => set({ customerInfo: info }),

  incrementAlertCount: () =>
    set((state) => ({ monthlyAlertCount: state.monthlyAlertCount + 1 })),

  resetAlertCount: () => set({ monthlyAlertCount: 0 }),

  setAlertCountResetMonth: (month) => set({ alertCountResetMonth: month }),

  reset: () =>
    set({
      userId: null,
      homeState: null,
      permits: [],
      firearmsProfile: defaultFirearmsProfile,
      isOnboarded: false,
      subscriptionTier: 'free',
      customerInfo: null,
      monthlyAlertCount: 0,
      alertCountResetMonth: '',
    }),
}));
