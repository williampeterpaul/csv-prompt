import OpenAI from "openai";
import type { Provider, Tools } from "./types";
import { withRetry } from "./retry";

// ~$0.00065/row with search (~2700 input + ~220 output tokens), ~$0.00009/row without (grok-4-1-fast-non-reasoning)
export const xai: Provider = {
  name: "xai",
  envVar: "XAI_API_KEY",

  client(key) {
    return new OpenAI({ apiKey: key, baseURL: "https://api.x.ai/v1" });
  },

  call(api, model, prompt, schema, retries, tools: Tools = {}) {
    const enabled: Record<string, unknown>[] = [];
    if (tools.search) enabled.push({ type: "web_search" });

    return withRetry(async () => {
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
    }, retries);
  },
};
