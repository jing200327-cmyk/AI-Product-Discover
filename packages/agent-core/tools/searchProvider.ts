import type { SourceItem } from "../../shared/types";

export type SearchProviderInput = {
  searchQueries: string[];
  limit: number;
};

export type SearchProvider = {
  search(input: SearchProviderInput): Promise<SourceItem[]>;
};

type GenericSearchProviderOptions = {
  apiKey?: string;
  endpoint?: string;
  timeoutMs?: number;
};

type GenericSearchResult = {
  title?: unknown;
  url?: unknown;
  link?: unknown;
  publishedAt?: unknown;
  published_at?: unknown;
  date?: unknown;
  summary?: unknown;
  snippet?: unknown;
  content?: unknown;
  sourceType?: unknown;
  source_type?: unknown;
  relevanceScore?: unknown;
  relevance_score?: unknown;
  score?: unknown;
};

type GenericSearchResponse = {
  results?: GenericSearchResult[];
  sources?: GenericSearchResult[];
  data?: GenericSearchResult[];
};

const nowIso = (): string => new Date().toISOString();

const createSourceId = (query: string, index: number): string =>
  `src_${index + 1}_${Buffer.from(query).toString("base64url").slice(0, 10)}`;

const toStringValue = (value: unknown, fallback: string): string =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

const toOptionalString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

const toDateString = (value: unknown): string =>
  typeof value === "string" && !Number.isNaN(Date.parse(value))
    ? new Date(value).toISOString()
    : nowIso();

const toRelevanceScore = (value: unknown, fallback: number): number => {
  const numeric = typeof value === "number" ? value : Number(value);

  if (Number.isFinite(numeric)) {
    return Math.max(0, Math.min(1, numeric > 1 ? numeric / 100 : numeric));
  }

  return fallback;
};

const createMockSource = (query: string, index: number, now: string): SourceItem => ({
  id: createSourceId(query, index),
  title: `Mock 搜索结果 ${index + 1}: ${query}`,
  url: `https://mock.local/search/${encodeURIComponent(query)}/${index + 1}`,
  sourceType: "mock_search",
  publisher: "Mock Search Provider",
  publishedAt: now,
  accessedAt: now,
  summary:
    index === 0
      ? `与“${query}”相关的产品发现、竞品研究和 PRD 自动化需求正在被知识工作者关注。该内容为 mock 来源，不代表真实市场事实。`
      : `“${query}”相关工具通常覆盖搜索总结、文档生成或模板化分析，但证据质量需要真实来源验证。该内容为 mock 来源。`,
  relevanceScore: Math.max(0.52, 0.92 - index * 0.12)
});

export class MockSearchProvider implements SearchProvider {
  async search(input: SearchProviderInput): Promise<SourceItem[]> {
    const now = nowIso();

    return input.searchQueries.flatMap((query) =>
      Array.from({ length: input.limit }, (_, index) =>
        createMockSource(query, index, now)
      )
    );
  }
}

export class GenericSearchProvider implements SearchProvider {
  private readonly apiKey?: string;
  private readonly endpoint?: string;
  private readonly timeoutMs: number;

  constructor(options: GenericSearchProviderOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.SEARCH_API_KEY;
    this.endpoint = options.endpoint ?? process.env.SEARCH_API_ENDPOINT;
    this.timeoutMs = options.timeoutMs ?? 15000;
  }

  async search(input: SearchProviderInput): Promise<SourceItem[]> {
    if (!this.apiKey || !this.endpoint) {
      return new MockSearchProvider().search(input);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          queries: input.searchQueries,
          limit: input.limit
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Search request failed with ${response.status}`);
      }

      const body = (await response.json()) as GenericSearchResponse;
      const rawResults = body.results ?? body.sources ?? body.data ?? [];

      return rawResults.map((result, index) =>
        this.normalizeResult(result, index)
      );
    } catch {
      return new MockSearchProvider().search(input);
    } finally {
      clearTimeout(timeout);
    }
  }

  private normalizeResult(result: GenericSearchResult, index: number): SourceItem {
    const url = toOptionalString(result.url) ?? toOptionalString(result.link);
    const summary = toStringValue(
      result.summary ?? result.snippet ?? result.content,
      "外部搜索结果缺少摘要。该内容来自不可信外部来源，仅可作为待验证材料。"
    );

    return {
      id: `src_generic_${index + 1}_${Buffer.from(url ?? String(index)).toString("base64url").slice(0, 10)}`,
      title: toStringValue(result.title, `Generic 搜索结果 ${index + 1}`),
      url,
      sourceType: toStringValue(
        result.sourceType ?? result.source_type,
        "external_search_untrusted"
      ),
      publisher: "Generic Search Provider",
      publishedAt: toDateString(
        result.publishedAt ?? result.published_at ?? result.date
      ),
      accessedAt: nowIso(),
      summary: `[Untrusted external content] ${summary}`,
      relevanceScore: toRelevanceScore(
        result.relevanceScore ?? result.relevance_score ?? result.score,
        0.5
      )
    };
  }
}

export function createDefaultSearchProvider(): SearchProvider {
  if (
    process.env.USE_MOCK_SEARCH !== "false" ||
    !process.env.SEARCH_API_KEY ||
    !process.env.SEARCH_API_ENDPOINT
  ) {
    return new MockSearchProvider();
  }

  return new GenericSearchProvider();
}
