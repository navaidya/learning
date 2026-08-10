import type { LearningDebt, ProgressResult, TopicMetadata } from './types';

export function calculateLearningDebt(topic: TopicMetadata, progress: ProgressResult, asOf: Date): LearningDebt {
  let score = 0; const reasons: string[] = [];
  if (progress.score < 60) { score += 20; reasons.push(`Only ${progress.score}% complete`); }
  const age = topic.last_reviewed ? Math.floor((asOf.getTime() - new Date(topic.last_reviewed).getTime()) / 86400000) : undefined;
  if (age === undefined || age > 30) { score += 20; reasons.push(age === undefined ? 'Never reviewed' : `Not reviewed in ${age} days`); }
  if ((topic.confidence ?? 5) < 3) { score += 15; reasons.push('Confidence is below 3/5'); }
  if ((progress.quizPerformance ?? 100) < 70) { score += 15; reasons.push(`Quiz performance is ${Math.round(progress.quizPerformance!)}%`); }
  if ((topic.labs_required ?? 0) > (topic.labs_completed ?? 0)) { score += 15; reasons.push('Practical labs are incomplete'); }
  if (topic.importance === 'critical') { score += 20; reasons.push('Critical topic'); } else if (topic.importance === 'high') { score += 10; reasons.push('High-priority topic'); }
  if (topic.status === 'mastered' && age !== undefined && age <= 30) score = Math.min(score, 24);
  const severity = score >= 75 ? 'critical' : score >= 50 ? 'high' : score >= 25 ? 'medium' : score > 0 ? 'low' : 'none';
  return { score: Math.min(100, score), severity, reasons };
}
