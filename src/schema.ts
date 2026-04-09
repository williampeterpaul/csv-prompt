import { resolve, extname } from "node:path";
import { z } from "zod";

export async function load(path: string) {
  const abs = resolve(path);
  return extname(abs) === ".json" ? fromJSON(abs) : fromZod(abs);
}

async function fromJSON(path: string) {
  const raw = await Bun.file(path).json();

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("JSON schema must be an object mapping field names to descriptions");
  }

  const entries = Object.entries(raw as Record<string, unknown>);
  if (entries.length === 0) {
    throw new Error("JSON schema must have at least one field");
  }

  const props: Record<string, unknown> = {};
  for (const [k, v] of entries) {
    props[k] = { type: "string", description: String(v) };
  }

  const schema: Record<string, unknown> = {
    type: "object",
    properties: props,
    required: entries.map(([k]) => k),
    additionalProperties: false,
  };

  return { schema, keys: entries.map(([k]) => k) };
}

async function fromZod(path: string) {
  const mod = await import(path);
  const zod = mod.default ?? mod.schema;

  if (!zod || typeof zod.parse !== "function") {
    throw new Error("Schema file must export a Zod schema as default or named \"schema\"");
  }

  const schema = z.toJSONSchema(zod) as Record<string, unknown>;
  delete schema.$schema;

  if (schema.type === "object") {
    schema.additionalProperties = false;
  }

  const props = schema.properties as Record<string, unknown> | undefined;
  if (!props) {
    throw new Error("Schema must be a z.object() with at least one property");
  }

  return { schema, keys: Object.keys(props) };
}
