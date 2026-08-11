import type { NewsImportance } from './types.ts';

export interface ScoreImportanceInput {
  sourcePriority: number;
  title: string;
  architectureShift: boolean;
  releaseRelated: boolean;
  domain?: string;
}

const highPriorityDomains = ['kubernetes', 'opentelemetry', 'prometheus', 'aiops', 'agentic-operations', 'mcp'];
const generallyAvailablePattern = /generally available|\bga\b/i;
const securityPattern = /security|vulnerability|\bcve\b|breaking change|deprecat/i;

export function scoreImportance(input: ScoreImportanceInput): NewsImportance {
  let score = input.sourcePriority <= 1 ? 15 : input.sourcePriority === 2 ? 8 : 3;

  if (generallyAvailablePattern.test(input.title)) score += 30;
  else if (input.releaseRelated) score += 15;

  if (input.architectureShift) score += 30;
  if (securityPattern.test(input.title)) score += 25;
  if (input.domain && highPriorityDomains.includes(input.domain)) score += 10;

  if (score >= 70) return 'critical';
  if (score >= 40) return 'high';
  if (score >= 15) return 'medium';
  return 'low';
}
