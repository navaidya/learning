import { describe, expect, it } from 'vitest';

describe('classifyNews', () => {
  it('classifies OpenTelemetry items by keyword', async () => {
    const { classifyNews } = await import('../../src/lib/news/classifier');
    expect(classifyNews({ sourceId: 'otel', sourceTags: [], title: 'OpenTelemetry Collector 1.2 released' }).domain).toBe('opentelemetry');
  });

  it('classifies Cilium items and surfaces the eBPF topic', async () => {
    const { classifyNews } = await import('../../src/lib/news/classifier');
    expect(classifyNews({ sourceId: 'cilium', sourceTags: [], title: 'Cilium adds eBPF networking' }).topics).toContain('ebpf');
  });

  it('does not flag an architecture shift for unrelated content', async () => {
    const { classifyNews } = await import('../../src/lib/news/classifier');
    expect(classifyNews({ sourceId: 'blog', sourceTags: [], title: 'Team lunch photos' }).architectureShift).toBe(false);
  });

  it('flags an architecture shift when a signal and a known domain both match', async () => {
    const { classifyNews } = await import('../../src/lib/news/classifier');
    const result = classifyNews({ sourceId: 'kubernetes', sourceTags: [], title: 'Gateway API v1.6: TCPRoute and UDPRoute Graduate to Standard' });
    expect(result.domain).toBe('kubernetes');
    expect(result.architectureShift).toBe(true);
  });

  it('extracts release project and version when release wording and a version are present', async () => {
    const { classifyNews } = await import('../../src/lib/news/classifier');
    const result = classifyNews({ sourceId: 'prometheus', sourceTags: [], title: 'Prometheus 3.13.2 released' });
    expect(result.releaseRelated).toBe(true);
    expect(result.releaseProject).toBe('prometheus');
    expect(result.releaseVersion).toBe('3.13.2');
  });

  it('falls back to a known source tag when no keyword matches', async () => {
    const { classifyNews } = await import('../../src/lib/news/classifier');
    const result = classifyNews({ sourceId: 'oci-oke', sourceTags: ['infrastructure'], title: 'Quarterly roadmap update' });
    expect(result.domain).toBe('infrastructure');
  });

  it('falls back to the source default domain for a bare release title', async () => {
    const { classifyNews } = await import('../../src/lib/news/classifier');
    const result = classifyNews({ sourceId: 'backstage', sourceTags: ['backstage', 'developer-portal', 'idp'], title: 'v1.54.0-next.2' });
    expect(result.domain).toBe('platform-engineering');
  });

  it('ties releaseProject to the source, not the content-classified domain', async () => {
    const { classifyNews } = await import('../../src/lib/news/classifier');
    const result = classifyNews({
      sourceId: 'holmesgpt', sourceTags: ['holmesgpt', 'robusta', 'ai-sre'], title: '0.39.0',
      summary: 'Adds Atlassian Rovo MCP integration and OpenTelemetry tracing for investigations.',
    });
    expect(result.domain).not.toBe('holmesgpt');
    expect(result.releaseProject).toBe('holmesgpt');
  });

  it('extracts the version from the title even when the summary contains unrelated version-like numbers', async () => {
    const { classifyNews } = await import('../../src/lib/news/classifier');
    const result = classifyNews({
      sourceId: 'prometheus', sourceTags: [], title: '3.13.2 released',
      summary: 'Bumped golang.org/x/net to 0.313.9999 and fixed issue #3141.',
    });
    expect(result.releaseVersion).toBe('3.13.2');
  });
});
