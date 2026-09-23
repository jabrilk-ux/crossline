import { create } from 'zustand';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CrossingEvent {
  fromState: string | null;
  toState: string;
  crossedAt: string; // ISO timestamp
}

interface LocationState {
  browserLocation: { stateCode: string | null; timestamp: number; userId: string } | null;
  currentState: string | null;
  previousState: string | null;
  crossingHistory: CrossingEvent[];
  isTracking: boolean;
  trackingError: string | null;

  // Actions
  setCurrentState: (state: string | null) => void;
  recordCrossing: (fromState: string | null, toState: string) => void;
  setTracking: (tracking: boolean) => void;
  clearHistory: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useLocationStore = create<LocationState>((set) => ({
  browserLocation: null,
  currentState: null,
  previousState: null,
  crossingHistory: [],
  isTracking: false,
  trackingError: null,

  setCurrentState: (state) => set({ currentState: state }),

  recordCrossing: (fromState, toState) =>
    set((s) => ({
      previousState: s.currentState,
      currentState: toState,
      crossingHistory: [
        { fromState, toState, crossedAt: new Date().toISOString() },
        ...s.crossingHistory,
      ].slice(0, 50), // keep last 50 crossings
    })),

  setTracking: (tracking) => set({ isTracking: tracking }),

  clearHistory: () => set({ crossingHistory: [] }),
}));
