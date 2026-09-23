export interface CrossingState { current: string | null; candidate: string | null; candidateSince: number; lastTimestamp: number }
export const initialCrossing: CrossingState = { current: null, candidate: null, candidateSince: 0, lastTimestamp: 0 };
export function advanceCrossing(previous: CrossingState, state: string | null, timestamp: number, accuracy: number | null) {
  if (!state || accuracy === null || accuracy > 100 || timestamp <= previous.lastTimestamp) return { state: previous, crossed: false };
  const next = { ...previous, lastTimestamp: timestamp };
  if (!previous.current) return { state: { ...next, current: state }, crossed: false };
  if (state === previous.current) return { state: { ...next, candidate: null, candidateSince: 0 }, crossed: false };
  if (state !== previous.candidate) return { state: { ...next, candidate: state, candidateSince: timestamp }, crossed: false };
  if (timestamp - previous.candidateSince < 20000) return { state: next, crossed: false };
  return { state: { ...next, current: state, candidate: null, candidateSince: 0 }, crossed: true };
}
