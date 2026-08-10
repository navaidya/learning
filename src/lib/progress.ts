import type { ProgressResult, TopicMetadata, TopicProgress } from './types';

const weights = { coverage: 0.3, quizPerformance: 0.2, practicalExperience: 0.25, confidence: 0.15, recency: 0.1 } as const;
const clamp = (value: number) => Math.max(0, Math.min(100, value));

export function calculateTopicProgress(topic: TopicMetadata, asOf: Date): ProgressResult {
  const metrics: Record<string, number> = {};
  if (topic.coverage !== undefined) metrics.coverage = clamp(topic.coverage);
  if ((topic.questions_attempted ?? 0) > 0 && topic.questions_correct !== undefined) metrics.quizPerformance = clamp((topic.questions_correct / topic.questions_attempted!) * 100);
  if ((topic.labs_required ?? 0) > 0 && topic.labs_completed !== undefined) metrics.practicalExperience = clamp((topic.labs_completed / topic.labs_required!) * 100);
  if (topic.confidence !== undefined) metrics.confidence = clamp((topic.confidence / 5) * 100);
  if (topic.last_reviewed) { const age = Math.max(0, (asOf.getTime() - new Date(topic.last_reviewed).getTime()) / 86400000); metrics.recency = clamp(100 - (age / 60) * 100); }
  const names = Object.keys(metrics);
  const totalWeight = names.reduce((sum, name) => sum + (weights as Record<string, number>)[name], 0);
  const score = totalWeight ? Math.round(names.reduce((sum, name) => sum + metrics[name] * (weights as Record<string, number>)[name], 0) / totalWeight) : 0;
  return { score, availableMetrics: names, coverage: metrics.coverage, confidence: metrics.confidence, quizPerformance: metrics.quizPerformance, practicalExperience: metrics.practicalExperience, recency: metrics.recency };
}

export function calculateDomainProgress(topics: TopicProgress[]): number { return topics.length ? Math.round(topics.reduce((sum, item) => sum + item.progress.score, 0) / topics.length) : 0; }
