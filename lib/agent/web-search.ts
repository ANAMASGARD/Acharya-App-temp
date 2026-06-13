import { getWebSearchConfig, type WebSearchProvider } from "@/lib/ai-config";

/**
 * Unified web search + page reading for the chat agent. Lets the LLM fetch
 * current, official information (e.g. latest CBSE circulars/syllabus) instead
 * of relying on stale training data. Provider is whichever API key is set
 * (Tavily > Brave > Serper); all secrets stay server-side.
 */

export type WebSearchResult = Readonly<{
  title: string;
  url: string;
  snippet: string;
}>;

export type WebSearchResponse = Readonly<{
  provider: WebSearchProvider;
  answer: string | null;
  results: WebSearchResult[];
}>;

const DEFAULT_MAX_RESULTS = 5;
const SEARCH_TIMEOUT_MS = 12_000;
const PAGE_TIMEOUT_MS = 12_000;
const MAX_PAGE_BYTES = 800_000;
const MAX_PAGE_CHARS = 6_000;

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function applyDomainFilter(query: string, includeDomains?: readonly string[]): string {
  if (!includeDomains || includeDomains.length === 0) {
    return query;
  }
  const sites = includeDomains.map((domain) => `site:${domain}`).join(" OR ");
  return `${query} (${sites})`;
}

async function searchTavily(
  apiKey: string,
  query: string,
  maxResults: number,
  includeDomains?: readonly string[],
): Promise<WebSearchResponse> {
  const response = await fetchWithTimeout(
    "https://api.tavily.com/search",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: maxResults,
        include_answer: true,
        search_depth: "basic",
        ...(includeDomains && includeDomains.length > 0
          ? { include_domains: [...includeDomains] }
          : {}),
      }),
    },
    SEARCH_TIMEOUT_MS,
  );

  if (!response.ok) {
    throw new Error(`Tavily search failed (${response.status})`);
  }

  const payload = (await response.json()) as {
    answer?: string;
    results?: { title?: string; url?: string; content?: string }[];
  };

  return {
    provider: "tavily",
    answer: payload.answer?.trim() || null,
    results: (payload.results ?? []).map((item) => ({
      title: String(item.title ?? ""),
      url: String(item.url ?? ""),
      snippet: String(item.content ?? "").slice(0, 600),
    })),
  };
}

async function searchBrave(
  apiKey: string,
  query: string,
  maxResults: number,
): Promise<WebSearchResponse> {
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", String(maxResults));

  const response = await fetchWithTimeout(
    url.toString(),
    {
      method: "GET",
      headers: { Accept: "application/json", "X-Subscription-Token": apiKey },
    },
    SEARCH_TIMEOUT_MS,
  );

  if (!response.ok) {
    throw new Error(`Brave search failed (${response.status})`);
  }

  const payload = (await response.json()) as {
    web?: { results?: { title?: string; url?: string; description?: string }[] };
  };

  return {
    provider: "brave",
    answer: null,
    results: (payload.web?.results ?? []).slice(0, maxResults).map((item) => ({
      title: String(item.title ?? ""),
      url: String(item.url ?? ""),
      snippet: String(item.description ?? "").slice(0, 600),
    })),
  };
}

async function searchSerper(
  apiKey: string,
  query: string,
  maxResults: number,
): Promise<WebSearchResponse> {
  const response = await fetchWithTimeout(
    "https://google.serper.dev/search",
    {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, num: maxResults }),
    },
    SEARCH_TIMEOUT_MS,
  );

  if (!response.ok) {
    throw new Error(`Serper search failed (${response.status})`);
  }

  const payload = (await response.json()) as {
    answerBox?: { answer?: string; snippet?: string };
    organic?: { title?: string; link?: string; snippet?: string }[];
  };

  const answer = payload.answerBox?.answer ?? payload.answerBox?.snippet ?? null;

  return {
    provider: "serper",
    answer: answer ? String(answer).trim() : null,
    results: (payload.organic ?? []).slice(0, maxResults).map((item) => ({
      title: String(item.title ?? ""),
      url: String(item.link ?? ""),
      snippet: String(item.snippet ?? "").slice(0, 600),
    })),
  };
}

export function isWebSearchConfigured(): boolean {
  return getWebSearchConfig() !== null;
}

export async function webSearch(
  query: string,
  options: { maxResults?: number; includeDomains?: readonly string[] } = {},
): Promise<WebSearchResponse> {
  const config = getWebSearchConfig();

  if (!config) {
    throw new Error(
      "Web search is not configured. Add TAVILY_API_KEY, BRAVE_SEARCH_API_KEY, or SERPER_API_KEY to .env.",
    );
  }

  const maxResults = options.maxResults ?? DEFAULT_MAX_RESULTS;

  if (config.provider === "tavily") {
    return searchTavily(config.apiKey, query, maxResults, options.includeDomains);
  }

  // Brave/Serper have no native domain filter — fold it into the query.
  const scopedQuery = applyDomainFilter(query, options.includeDomains);

  return config.provider === "brave"
    ? searchBrave(config.apiKey, scopedQuery, maxResults)
    : searchSerper(config.apiKey, scopedQuery, maxResults);
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export type ReadWebPageResult = Readonly<{
  url: string;
  text: string;
  truncated: boolean;
}>;

/**
 * Fetch a single page (e.g. an official board page) and return readable text.
 * Guards against non-HTML responses, oversized bodies, and slow servers.
 */
export async function readWebPage(url: string): Promise<ReadWebPageResult> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid URL.");
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Only http(s) URLs are supported.");
  }

  const response = await fetchWithTimeout(
    parsed.toString(),
    { method: "GET", headers: { "User-Agent": "AcharyaBot/1.0 (+teaching assistant)" } },
    PAGE_TIMEOUT_MS,
  );

  if (!response.ok) {
    throw new Error(`Could not fetch page (${response.status}).`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("html") && !contentType.includes("text")) {
    throw new Error("Page is not readable text/HTML.");
  }

  const raw = await response.text();
  const text = htmlToText(raw.slice(0, MAX_PAGE_BYTES));
  const truncated = text.length > MAX_PAGE_CHARS;

  return {
    url: parsed.toString(),
    text: truncated ? `${text.slice(0, MAX_PAGE_CHARS)}…` : text,
    truncated,
  };
}
