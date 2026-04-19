import type OpenAI from "openai";

export interface Tools {
  search?: boolean;
}

export interface Provider {
  name: "xai" | "groq";
  envVar: "XAI_API_KEY" | "GROQ_API_KEY";
  client(key: string): OpenAI;
  call(
    api: OpenAI,
    model: string,
    prompt: string,
    schema: Record<string, unknown>,
    retries: number,
    tools: Tools
  ): Promise<Record<string, string>>;
}
