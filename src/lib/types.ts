export const learningStatuses = ['not_started', 'learning', 'practicing', 'review', 'mastered'] as const;
export type LearningStatus = (typeof learningStatuses)[number];
export type DebtSeverity = 'critical' | 'high' | 'medium' | 'low' | 'none';

export interface TopicMetadata { title?: string; domain?: string; topic?: string; status?: LearningStatus; importance?: 'low' | 'medium' | 'high' | 'critical'; confidence?: number; coverage?: number; last_reviewed?: string; next_review?: string; labs_completed?: number; labs_required?: number; questions_correct?: number; questions_attempted?: number; prerequisites?: string[]; tags?: string[]; }
export interface ProgressResult { score: number; coverage?: number; confidence?: number; quizPerformance?: number; practicalExperience?: number; recency?: number; availableMetrics: string[]; }
export interface TopicProgress { topic: TopicMetadata; progress: ProgressResult; debt?: LearningDebt; }
export interface LearningDebt { score: number; severity: DebtSeverity; reasons: string[]; }
export interface RecommendedTopic { topic: TopicMetadata; priority: number; reason: string; }
export interface ActivityEntry { date: string; type: 'learning' | 'lab' | 'review' | string; domain?: string; topic?: string; minutes?: number; }
export interface DomainDefinition { slug: string; name: string; description?: string; }

export function statusLabel(status: LearningStatus = 'not_started'): string {
  return ({ not_started: 'Not Started', learning: 'Learning', practicing: 'Practicing', review: 'Needs Review', mastered: 'Mastered' } as Record<LearningStatus, string>)[status];
}
