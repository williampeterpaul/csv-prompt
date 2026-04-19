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
    return withRetry(async () => {
      const res = await api.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content: "Extract structured data from the provided information.",
          },
          { role: "user", content: prompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "output", schema, strict: true },
        } as any,
      });

      const body = res.choices[0]?.message?.content;
      if (!body) throw new Error("Empty response from API");
      return JSON.parse(body);
    }, retries);
  },
};
