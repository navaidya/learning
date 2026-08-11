import { getCollection } from 'astro:content';
import { calculateStreak, getRecentActivity } from './activity';
import { recommendTopics } from './recommendations';
import { calculateDomainProgress } from './progress';
import { getRadarSummary } from './news/radar';
import { sampleTopics, getTopicProgress } from './topicProgress';
import { domains } from './domains';

export { domains };

export async function getDashboardModel(asOf = new Date()) {
  const activity = [{ date: '2026-08-10', type: 'learning', domain: 'opentelemetry', topic: 'collector', minutes: 45 }, { date: '2026-08-09', type: 'lab', domain: 'kubernetes', topic: 'troubleshooting', minutes: 60 }];
  const topics = getTopicProgress(asOf);
  const engineeringRadar = await getRadarSummary(asOf);
  return { topics, overallProgress: calculateDomainProgress(topics), streak: calculateStreak(activity, asOf), activity: getRecentActivity(activity), recommendations: recommendTopics(sampleTopics, asOf), debts: topics.filter((item) => item.debt?.severity !== 'none'), domains: domains.map((domain) => ({ ...domain, topics: topics.filter((item) => item.topic.domain === domain.slug), progress: calculateDomainProgress(topics.filter((item) => item.topic.domain === domain.slug)) })), activeProjects: [{ title: 'AIOps Lab', progress: 80 }, { title: 'Kubernetes MCP Agent', progress: 30 }], inboxCount: 1, engineeringRadar };
}

export async function getDomainModel(slug: string, asOf = new Date()) { const model = await getDashboardModel(asOf); const domain = model.domains.find((item) => item.slug === slug); return domain ? { ...domain, recommendations: recommendTopics(domain.topics.map((item) => item.topic), asOf) } : undefined; }
export async function getBookEntries() { return getCollection('book'); }
