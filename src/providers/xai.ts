import OpenAI from "openai";
import type { Provider, Tools, Usage } from "./types";
import { withRetry } from "./retry";

// grok-4-1-fast-non-reasoning: $0.20/M in, $0.50/M out
const INPUT = 0.20 / 1e6;
const OUTPUT = 0.50 / 1e6;

export const xai: Provider = {
  name: "xai",
  envVar: "XAI_API_KEY",

  client(key) {
    return new OpenAI({ apiKey: key, baseURL: "https://api.x.ai/v1" });
  },

  usage(): Usage {
    const u: Usage = {
      input: 0,
      output: 0,
      cost: () => u.input * INPUT + u.output * OUTPUT,
      log: () => {
        console.log(`  Tokens:  ${u.input} in / ${u.output} out`);
        console.log(`  Cost:    ~$${u.cost().toFixed(4)}`);
      },
    };
    return u;
  },

  call(api, model, prompt, schema, retries, tools: Tools = {}, usage) {
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

      if (res.usage) {
        usage.input += res.usage.input_tokens ?? 0;
        usage.output += res.usage.output_tokens ?? 0;
      }

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
