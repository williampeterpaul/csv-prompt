import OpenAI from "openai";
import type { Provider, Usage } from "./types";
import { withRetry } from "./retry";

// compound routes to GPT-OSS-120B ($0.15/$0.60) or Llama 4 Scout ($0.11/$0.34); using 120B as upper bound
const INPUT = 0.15 / 1e6;
const OUTPUT = 0.60 / 1e6;

export const groq: Provider = {
  name: "groq",
  envVar: "GROQ_API_KEY",

  client(key) {
    return new OpenAI({ apiKey: key, baseURL: "https://api.groq.com/openai/v1" });
  },

  usage(): Usage {
    const u: Usage = {
      input: 0,
      output: 0,
      cost: () => u.input * INPUT + u.output * OUTPUT,
      log: () => {
        console.log(`  Tokens:  ${u.input} in / ${u.output} out`);
        console.log(`  Cost:    ~$${u.cost().toFixed(4)} (upper bound)`);
      },
    };
    return u;
  },

  call(api, model, prompt, schema, retries, _tools, usage) {
    const keys = Object.keys(schema.properties as Record<string, unknown>);
    const schemaBlock = JSON.stringify(schema, null, 2);

    return withRetry(async () => {
      const res = await api.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content: `Extract structured data from the provided information.\nRespond with ONLY a JSON object matching this schema:\n${schemaBlock}`,
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      });

      if (res.usage) {
        usage.input += res.usage.prompt_tokens;
        usage.output += res.usage.completion_tokens;
      }

      const body = res.choices[0]?.message?.content;
      if (!body) throw new Error("Empty response from API");
      const parsed = JSON.parse(body);
      const out: Record<string, string> = {};
      for (const k of keys) out[k] = String(parsed[k] ?? "");
      return out;
    }, retries);
  },
};
