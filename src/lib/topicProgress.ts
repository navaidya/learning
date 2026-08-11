import { calculateLearningDebt } from './learningDebt';
import { calculateTopicProgress } from './progress';
import type { TopicMetadata, TopicProgress } from './types';

export const sampleTopics: TopicMetadata[] = [
  { title: 'Kubernetes Architecture', domain: 'kubernetes', coverage: 72, confidence: 4, status: 'learning', importance: 'high', last_reviewed: '2026-08-08' },
  { title: 'Kubernetes Troubleshooting', domain: 'kubernetes', coverage: 55, confidence: 3, status: 'practicing', importance: 'high', labs_completed: 1, labs_required: 3 },
  { title: 'OpenTelemetry Collector', domain: 'opentelemetry', coverage: 35, confidence: 2, status: 'learning', importance: 'critical' },
  { title: 'SLO and Error Budgets', domain: 'sre', coverage: 40, confidence: 2, status: 'review', importance: 'high', questions_correct: 5, questions_attempted: 10 },
  { title: 'AI-assisted Kubernetes Troubleshooting', domain: 'aiops', coverage: 45, confidence: 3, status: 'learning', importance: 'medium' },
];

export function getTopicProgress(asOf: Date): TopicProgress[] {
  return sampleTopics.map((topic): TopicProgress => {
    const progress = calculateTopicProgress(topic, asOf);
    return { topic, progress, debt: calculateLearningDebt(topic, progress, asOf) };
  });
}
