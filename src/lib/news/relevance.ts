import type { DebtSeverity, LearningStatus, TopicProgress } from '../types';
import type { NewsImportance, NewsItem } from './types';

const importanceBase: Record<NewsImportance, number> = { critical: 40, high: 30, medium: 15, low: 5 };
const importanceLevelBonus: Record<'low' | 'medium' | 'high' | 'critical', number> = { critical: 15, high: 10, medium: 5, low: 0 };
const importanceRank: Record<'low' | 'medium' | 'high' | 'critical', number> = { low: 0, medium: 1, high: 2, critical: 3 };
const debtBonus: Record<DebtSeverity, number> = { critical: 25, high: 18, medium: 10, low: 5, none: 0 };
const debtRank: Record<DebtSeverity, number> = { none: 0, low: 1, medium: 2, high: 3, critical: 4 };
const activeStatuses: LearningStatus[] = ['learning', 'practicing'];
const clamp = (value: number) => Math.max(0, Math.min(100, value));

export function scoreLearningRelevance(item: NewsItem, topics: TopicProgress[]): number {
  const matches = topics.filter((entry) => entry.topic.domain === item.domain);
  let score = importanceBase[item.importance];
  if (matches.length === 0) return clamp(score);

  const lowestProgress = Math.min(...matches.map((entry) => entry.progress.score));
  score += (100 - lowestProgress) * 0.3;

  const worstDebt = matches.reduce<DebtSeverity>((worst, entry) => {
    const severity = entry.debt?.severity ?? 'none';
    return debtRank[severity] > debtRank[worst] ? severity : worst;
  }, 'none');
  score += debtBonus[worstDebt];

  const highestImportance = matches.reduce<'low' | 'medium' | 'high' | 'critical'>((highest, entry) => {
    const importance = entry.topic.importance ?? 'medium';
    return importanceRank[importance] > importanceRank[highest] ? importance : highest;
  }, 'low');
  score += importanceLevelBonus[highestImportance];

  if (matches.some((entry) => activeStatuses.includes(entry.topic.status ?? 'not_started'))) score += 10;

  return clamp(score);
}
