import { logger } from "./logger";

const DEFAULT_BASE_URL = "https://api.consumet.org";
const CACHE_TTL_MS = 30_000;

type CacheEntry = {
  expiresAt: number;
  data: unknown;
};

const cache = new Map<string, CacheEntry>();

function getBaseUrl() {
  return (process.env.CONSUMET_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
}

export class ConsumetError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 502,
  ) {
    super(message);
    this.name = "ConsumetError";
  }
}

export async function consume(path: string, query?: Record<string, string>) {
  const url = new URL(`${getBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value) url.searchParams.set(key, value);
  }

  const cacheKey = url.toString();
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;
  cache.delete(cacheKey);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
    const body = (await response.json().catch(() => null)) as
      | { message?: string; error?: string }
      | unknown;

    if (!response.ok) {
      const message =
        typeof body === "object" &&
        body !== null &&
        ("message" in body || "error" in body)
          ? String(("message" in body ? body.message : body.error) ?? "Provider request failed")
          : `Provider returned HTTP ${response.status}`;
      throw new ConsumetError(message, response.status === 404 ? 404 : 502);
    }

    cache.set(cacheKey, { data: body, expiresAt: Date.now() + CACHE_TTL_MS });
    return body;
  } catch (error) {
    if (error instanceof ConsumetError) throw error;
    const message = error instanceof Error && error.name === "AbortError"
      ? "Consumet provider timed out"
      : "Unable to reach the Consumet provider";
    logger.warn({ err: error, url: url.toString() }, message);
    throw new ConsumetError(message);
  } finally {
    clearTimeout(timeout);
  }
}