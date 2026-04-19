import OpenAI from "openai";
import type { Provider } from "./types";
import { withRetry } from "./retry";

export const groq: Provider = {
  name: "groq",
  envVar: "GROQ_API_KEY",

  client(key) {
    return new OpenAI({ apiKey: key, baseURL: "https://api.groq.com/openai/v1" });
  },

  call(api, model, prompt, schema, retries) {
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

      const body = res.choices[0]?.message?.content;
      if (!body) throw new Error("Empty response from API");
      const parsed = JSON.parse(body);
      const out: Record<string, string> = {};
      for (const k of keys) out[k] = String(parsed[k] ?? "");
      return out;
    }, retries);
  },
};
