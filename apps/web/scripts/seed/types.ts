export interface Counts {
  read: number;
  inserted: number;
  updated: number;
  skipped: number;
}

export const newCounts = (): Counts => ({ read: 0, inserted: 0, updated: 0, skipped: 0 });
