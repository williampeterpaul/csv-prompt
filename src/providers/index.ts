import { xai } from "./xai";
import { groq } from "./groq";
import type { Provider } from "./types";

export type { Tools, Provider, Usage } from "./types";

const providers = { xai, groq } as const;

export function pick(name: string): Provider {
  const p = providers[name as keyof typeof providers];
  if (!p) throw new Error(`Unknown provider "${name}" (expected: ${Object.keys(providers).join(", ")})`);
  return p;
}
