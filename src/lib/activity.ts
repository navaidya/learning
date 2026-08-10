import type { ActivityEntry } from './types';

export function getRecentActivity(entries: ActivityEntry[], limit = 5): ActivityEntry[] { return [...entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit); }
export function calculateStreak(entries: ActivityEntry[], asOf: Date): number { const days = new Set(entries.map((entry) => entry.date.slice(0, 10))); let streak = 0; const cursor = new Date(asOf); while (days.has(cursor.toISOString().slice(0, 10))) { streak++; cursor.setUTCDate(cursor.getUTCDate() - 1); } return streak; }
