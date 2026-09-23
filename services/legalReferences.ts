import records from '../data/legal-references.json';
export interface LegalReference {
  code: string;
  name: string;
  researchDate: string;
  summary: string;
  questions: string;
  retrieval: string;
  sources: { title: string; url: string }[];
}
export const legalReferences: readonly LegalReference[] = records;
export function getLegalReference(code: string): LegalReference | undefined {
  return legalReferences.find(entry => entry.code === code);
}
// A research date is not an effective date or an independent legal review.
export function referenceNeedsRefresh(entry: LegalReference, now = new Date()): boolean {
  const date = Date.parse(`${entry.researchDate}T00:00:00Z`);
  const today = Date.parse(`${now.toISOString().slice(0, 10)}T00:00:00Z`);
  return !Number.isFinite(date) || date > today || today - date >= 90 * 86400000;
}
