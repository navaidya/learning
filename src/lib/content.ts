import { getCollection } from 'astro:content';
import { calculateStreak, getRecentActivity } from './activity';
import { calculateLearningDebt } from './learningDebt';
import { recommendTopics } from './recommendations';
import { calculateDomainProgress, calculateTopicProgress } from './progress';
import type { DomainDefinition, TopicMetadata, TopicProgress } from './types';

export const domains: DomainDefinition[] = [
  ['foundations','Foundations'], ['containers','Containers'], ['kubernetes','Kubernetes'], ['oke','OKE'], ['helm','Helm'], ['terraform','Terraform'], ['gitops','GitOps'], ['prometheus','Prometheus'], ['grafana','Grafana'], ['opentelemetry','OpenTelemetry'], ['logging','Logging'], ['tracing','Tracing'], ['ebpf-cilium','eBPF / Cilium'], ['sre','SRE'], ['platform-engineering','Platform Engineering'], ['aiops','AIOps'], ['mcp','MCP'], ['agentic-operations','Agentic Operations'],
].map(([slug, name]) => ({ slug, name }));

const sampleTopics: TopicMetadata[] = [
  { title: 'Kubernetes Architecture', domain: 'kubernetes', coverage: 72, confidence: 4, status: 'learning', importance: 'high', last_reviewed: '2026-08-08' },
  { title: 'Kubernetes Troubleshooting', domain: 'kubernetes', coverage: 55, confidence: 3, status: 'practicing', importance: 'high', labs_completed: 1, labs_required: 3 },
  { title: 'OpenTelemetry Collector', domain: 'opentelemetry', coverage: 35, confidence: 2, status: 'learning', importance: 'critical' },
  { title: 'SLO and Error Budgets', domain: 'sre', coverage: 40, confidence: 2, status: 'review', importance: 'high', questions_correct: 5, questions_attempted: 10 },
  { title: 'AI-assisted Kubernetes Troubleshooting', domain: 'aiops', coverage: 45, confidence: 3, status: 'learning', importance: 'medium' },
];

export async function getDashboardModel(asOf = new Date()) {
  const activity = [{ date: '2026-08-10', type: 'learning', domain: 'opentelemetry', topic: 'collector', minutes: 45 }, { date: '2026-08-09', type: 'lab', domain: 'kubernetes', topic: 'troubleshooting', minutes: 60 }];
  const topics = sampleTopics.map((topic): TopicProgress => { const progress = calculateTopicProgress(topic, asOf); return { topic, progress, debt: calculateLearningDebt(topic, progress, asOf) }; });
  return { topics, overallProgress: calculateDomainProgress(topics), streak: calculateStreak(activity, asOf), activity: getRecentActivity(activity), recommendations: recommendTopics(sampleTopics, asOf), debts: topics.filter((item) => item.debt?.severity !== 'none'), domains: domains.map((domain) => ({ ...domain, topics: topics.filter((item) => item.topic.domain === domain.slug), progress: calculateDomainProgress(topics.filter((item) => item.topic.domain === domain.slug)) })), activeProjects: [{ title: 'AIOps Lab', progress: 80 }, { title: 'Kubernetes MCP Agent', progress: 30 }], inboxCount: 1 };
}

export async function getDomainModel(slug: string, asOf = new Date()) { const model = await getDashboardModel(asOf); const domain = model.domains.find((item) => item.slug === slug); return domain ? { ...domain, recommendations: recommendTopics(domain.topics.map((item) => item.topic), asOf) } : undefined; }
export async function getBookEntries() { return getCollection('book'); }
