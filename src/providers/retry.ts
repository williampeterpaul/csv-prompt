import OpenAI from "openai";

export async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number
): Promise<T> {
  let last: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (e: unknown) {
      last = e;

      if (e instanceof OpenAI.APIError && e.status !== undefined) {
        if (e.status >= 400 && e.status < 500 && e.status !== 429) throw e;
      }

      if (attempt < retries) await sleep(delay(attempt, e));
    }
  }

  throw last;
}

function delay(attempt: number, e: unknown): number {
  if (e instanceof OpenAI.APIError && e.status === 429) {
    const after = e.headers?.["retry-after"];
    if (after) {
      const sec = parseInt(after, 10);
      if (!isNaN(sec)) return sec * 1000;
    }
  }
  return Math.min(60_000, 1000 * Math.pow(2, attempt) + Math.random() * 1000);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
