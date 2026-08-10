import { calculateLearningDebt } from './learningDebt';
import { calculateTopicProgress } from './progress';
import type { RecommendedTopic, TopicMetadata } from './types';

export function recommendTopics(topics: TopicMetadata[], asOf: Date, limit = 5): RecommendedTopic[] {
  return topics.map((topic) => { const progress = calculateTopicProgress(topic, asOf); const debt = calculateLearningDebt(topic, progress, asOf); const priority = (topic.importance === 'critical' ? 40 : topic.importance === 'high' ? 25 : topic.importance === 'medium' ? 10 : 0) + debt.score + (topic.status === 'mastered' ? -20 : 0); return { topic, priority, reason: debt.reasons[0] ?? 'Continue building coverage' }; }).sort((a, b) => b.priority - a.priority).slice(0, limit);
}
