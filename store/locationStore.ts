import { create } from 'zustand';

interface CrossingRecord {
  fromState: string | null;
  toState: string;
  crossedAt: string; // ISO timestamp
}

interface LocationState {
  currentState: string | null;
  crossingHistory: CrossingRecord[];
  isTracking: boolean;

  // Actions
  setCurrentState: (state: string | null) => void;
  recordCrossing: (fromState: string | null, toState: string) => void;
  setTracking: (tracking: boolean) => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  currentState: null,
  crossingHistory: [],
  isTracking: false,

  setCurrentState: (state) => set({ currentState: state }),

  recordCrossing: (fromState, toState) =>
    set((s) => ({
      currentState: toState,
      crossingHistory: [
        { fromState, toState, crossedAt: new Date().toISOString() },
        ...s.crossingHistory,
      ].slice(0, 50), // keep last 50 crossings
    })),

  setTracking: (tracking) => set({ isTracking: tracking }),
}));
