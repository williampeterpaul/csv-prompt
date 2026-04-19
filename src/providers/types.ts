import type OpenAI from "openai";

export interface Tools {
  search?: boolean;
}

export interface Usage {
  input: number;
  output: number;
  cost(): number;
  log(): void;
}

export interface Provider {
  name: "xai" | "groq";
  envVar: "XAI_API_KEY" | "GROQ_API_KEY";
  client(key: string): OpenAI;
  usage(): Usage;
  call(
    api: OpenAI,
    model: string,
    prompt: string,
    schema: Record<string, unknown>,
    retries: number,
    tools: Tools,
    usage: Usage
  ): Promise<Record<string, string>>;
}
