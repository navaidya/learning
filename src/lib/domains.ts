import type { DomainDefinition } from './types';

/**
 * The skill-map domains. Kept free of `astro:content` imports so pure logic and
 * tests can consume the list without the Astro content runtime.
 */
export const domains: DomainDefinition[] = [
  ['foundations','Foundations'], ['containers','Containers'], ['kubernetes','Kubernetes'], ['oke','OKE'], ['helm','Helm'], ['terraform','Terraform'], ['gitops','GitOps'], ['prometheus','Prometheus'], ['grafana','Grafana'], ['opentelemetry','OpenTelemetry'], ['logging','Logging'], ['tracing','Tracing'], ['ebpf-cilium','eBPF / Cilium'], ['sre','SRE'], ['platform-engineering','Platform Engineering'], ['aiops','AIOps'], ['mcp','MCP'], ['agentic-operations','Agentic Operations'],
].map(([slug, name]) => ({ slug, name }));
