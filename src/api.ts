import OpenAI from "openai";

export interface Tools {
  search?: boolean;
  xSearch?: boolean;
}

export function client(key: string): OpenAI {
  return new OpenAI({ apiKey: key, baseURL: "https://api.x.ai/v1" });
}

export async function call(
  api: OpenAI,
  model: string,
  prompt: string,
  schema: Record<string, unknown>,
  retries: number,
  tools: Tools = {}
): Promise<Record<string, string>> {
  let last: unknown;

  const enabled: Record<string, unknown>[] = [];
  if (tools.search) enabled.push({ type: "web_search" });
  if (tools.xSearch) enabled.push({ type: "x_search" });

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res: any = await (api.responses as any).create({
        model,
        input: [
          {
            role: "system",
            content: "Extract structured data from the provided information.",
          },
          { role: "user", content: prompt },
        ],
        ...(enabled.length > 0 && { tools: enabled }),
        text: {
          format: {
            type: "json_schema" as const,
            name: "output",
            schema,
            strict: true,
          },
        },
      });

      if (res.model !== model) {
        console.warn(`Warning: requested ${model}, got ${res.model}`);
      }

      const msg = res.output.find((item: any) => item.type === "message");
      const body = msg?.content?.find(
        (c: any) => c.type === "output_text"
      )?.text;
      if (!body) throw new Error("Empty response from API");
      return JSON.parse(body);
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
