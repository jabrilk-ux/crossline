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

interface UserState {
  userId: string | null;
  homeState: string | null;
  permits: Permit[];
  firearmsProfile: FirearmsProfile;
  isOnboarded: boolean;

  // Actions
  setUserId: (id: string | null) => void;
  setProfile: (homeState: string, firearmsProfile: FirearmsProfile) => void;
  addPermit: (permit: Permit) => void;
  removePermit: (permitId: string) => void;
  setOnboarded: (value: boolean) => void;
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

  setUserId: (id) => set({ userId: id }),

  setProfile: (homeState, firearmsProfile) =>
    set({ homeState, firearmsProfile }),

  addPermit: (permit) =>
    set((state) => ({ permits: [...state.permits, permit] })),

  removePermit: (permitId) =>
    set((state) => ({ permits: state.permits.filter((p) => p.id !== permitId) })),

  setOnboarded: (value) => set({ isOnboarded: value }),

  reset: () =>
    set({
      userId: null,
      homeState: null,
      permits: [],
      firearmsProfile: defaultFirearmsProfile,
      isOnboarded: false,
    }),
}));
