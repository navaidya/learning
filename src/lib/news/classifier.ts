export interface ClassifyNewsInput {
  sourceId: string;
  sourceTags: string[];
  title: string;
  summary?: string;
}

export interface ClassifyNewsResult {
  domain: string;
  topics: string[];
  architectureShift: boolean;
  releaseRelated: boolean;
  releaseProject?: string;
  releaseVersion?: string;
}

interface DomainRule {
  domain: string;
  pattern: RegExp;
  topicPatterns: { topic: string; pattern: RegExp }[];
}

// Ordered most-specific-first; the first matching rule wins.
const domainRules: DomainRule[] = [
  {
    domain: 'opentelemetry',
    pattern: /opentelemetry|\botel\b|otlp/i,
    topicPatterns: [
      { topic: 'otlp', pattern: /otlp/i },
      { topic: 'collector', pattern: /collector/i },
    ],
  },
  {
    domain: 'prometheus',
    pattern: /prometheus|promql/i,
    topicPatterns: [{ topic: 'promql', pattern: /promql/i }],
  },
  {
    domain: 'ebpf-cilium',
    pattern: /cilium|ebpf|hubble/i,
    topicPatterns: [
      { topic: 'ebpf', pattern: /ebpf/i },
      { topic: 'hubble', pattern: /hubble/i },
      { topic: 'cilium', pattern: /cilium/i },
    ],
  },
  {
    domain: 'terraform',
    pattern: /terraform|opentofu/i,
    topicPatterns: [{ topic: 'opentofu', pattern: /opentofu/i }],
  },
  {
    domain: 'gitops',
    pattern: /argo\s?cd|gitops/i,
    topicPatterns: [
      { topic: 'argo-cd', pattern: /argo\s?cd/i },
      { topic: 'gitops', pattern: /gitops/i },
    ],
  },
  {
    domain: 'platform-engineering',
    pattern: /backstage|developer portal|\bidp\b|golden path/i,
    topicPatterns: [
      { topic: 'backstage', pattern: /backstage/i },
      { topic: 'developer-portal', pattern: /developer portal/i },
    ],
  },
  {
    domain: 'aiops',
    pattern: /holmesgpt|k8sgpt|ai sre/i,
    topicPatterns: [
      { topic: 'holmesgpt', pattern: /holmesgpt/i },
      { topic: 'k8sgpt', pattern: /k8sgpt/i },
    ],
  },
  {
    domain: 'agentic-operations',
    pattern: /\bmcp\b|agentic operations|ai agent/i,
    topicPatterns: [
      { topic: 'mcp', pattern: /\bmcp\b/i },
      { topic: 'ai-agent', pattern: /ai agent/i },
    ],
  },
  {
    domain: 'containers',
    pattern: /containerd|\bruncs?\b|cri-o|oci image/i,
    topicPatterns: [
      { topic: 'containerd', pattern: /containerd/i },
      { topic: 'runtime', pattern: /runtime/i },
    ],
  },
  {
    domain: 'kubernetes',
    pattern: /kubernetes|\bk8s\b|gateway api|istio|service mesh/i,
    topicPatterns: [
      { topic: 'gateway-api', pattern: /gateway api/i },
      { topic: 'service-mesh', pattern: /istio|service mesh/i },
    ],
  },
  {
    domain: 'grafana',
    pattern: /grafana/i,
    topicPatterns: [{ topic: 'dashboards', pattern: /dashboard/i }],
  },
  {
    domain: 'logging',
    pattern: /\blogging\b|log aggregation|structured logs/i,
    topicPatterns: [],
  },
  {
    domain: 'tracing',
    pattern: /distributed tracing|\btracing\b|\bspans?\b/i,
    topicPatterns: [],
  },
];

const knownDomains = domainRules.map((rule) => rule.domain);

// Most configured sources are terse GitHub release feeds (e.g. "v1.2.0") with
// no keyword to match, so each source needs an explicit default domain to
// fall back to safely instead of collapsing everything into "infrastructure".
export const sourceDefaultDomains: Record<string, string> = {
  cncf: 'infrastructure',
  kubernetes: 'kubernetes',
  opentelemetry: 'opentelemetry',
  prometheus: 'prometheus',
  grafana: 'grafana',
  cilium: 'ebpf-cilium',
  terraform: 'terraform',
  opentofu: 'terraform',
  argo: 'gitops',
  backstage: 'platform-engineering',
  'oci-oke': 'infrastructure',
  holmesgpt: 'aiops',
  k8sgpt: 'aiops',
  openai: 'agentic-operations',
  'kubernetes-releases': 'kubernetes',
  'gateway-api': 'kubernetes',
  helm: 'helm',
  istio: 'kubernetes',
  containerd: 'containers',
  etcd: 'kubernetes',
  karpenter: 'kubernetes',
  kyverno: 'kubernetes',
  'opentelemetry-collector': 'opentelemetry',
  loki: 'logging',
  tempo: 'tracing',
  vector: 'logging',
  flux: 'gitops',
  crossplane: 'platform-engineering',
  hashicorp: 'terraform',
  pulumi: 'terraform',
  'mcp-spec': 'mcp',
  robusta: 'aiops',
};

const architectureSignalPattern = /gateway api|dynamic resource allocation|\bdra\b|opentelemetry pipeline|platform api|\bmcp\b|agent-assisted investigation|replaces|replacement|deprecat(ed|ion|es)?|new api|graduat(ed|es|ion)?|gpu scheduling|ai scheduling/i;
const releaseSignalPattern = /\brelease(d|s)?\b|generally available|\bga\b|\bv?\d+\.\d+(\.\d+)?\b/i;
// Anchored to a standalone token so it can't grab a version-looking fragment out of a long
// changelog body (summaries for release feeds are often the full release notes).
const versionPattern = /(?<![\w.-])v?\d+(?:\.\d+){1,3}(?:-[a-z0-9.]+)?(?![\w.-])/i;

export function classifyNews(input: ClassifyNewsInput): ClassifyNewsResult {
  const text = `${input.title} ${input.summary ?? ''}`;
  const matchedRule = domainRules.find((rule) => rule.pattern.test(text));
  const tagFallback = input.sourceTags.find((tag) => knownDomains.includes(tag));
  const fallbackDomain = tagFallback ?? sourceDefaultDomains[input.sourceId] ?? (knownDomains.includes(input.sourceId) ? input.sourceId : 'infrastructure');
  const domain = matchedRule?.domain ?? fallbackDomain;

  const topics = new Set<string>();
  if (matchedRule) {
    topics.add(matchedRule.domain);
    for (const topicRule of matchedRule.topicPatterns) if (topicRule.pattern.test(text)) topics.add(topicRule.topic);
  }
  for (const tag of input.sourceTags) topics.add(tag);

  const architectureShift = Boolean(matchedRule) && architectureSignalPattern.test(text);
  const releaseRelated = releaseSignalPattern.test(text);
  // The release's identity is the source that published it, not the content-classified
  // domain — a changelog mentioning "MCP" or "OpenTelemetry" shouldn't reassign which
  // project a release belongs to.
  const versionMatch = input.title.match(versionPattern) ?? text.match(versionPattern);

  return {
    domain,
    topics: Array.from(topics),
    architectureShift,
    releaseRelated,
    releaseProject: releaseRelated ? input.sourceId : undefined,
    releaseVersion: releaseRelated && versionMatch ? versionMatch[0] : undefined,
  };
}
