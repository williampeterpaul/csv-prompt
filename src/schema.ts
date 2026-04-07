import { resolve } from "node:path";
import { z } from "zod";

export async function load(path: string) {
  const mod = await import(resolve(path));
  const zod = mod.default ?? mod.schema;

  if (!zod || typeof zod.parse !== "function") {
    throw new Error(`Schema file must export a Zod schema as default or named "schema"`);
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
