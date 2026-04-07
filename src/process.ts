import PQueue from "p-queue";
import type { Args } from "./cli";
import { tracker } from "./cli";
import { load } from "./schema";
import { client, call } from "./api";
import { read, write, select, render, pending } from "./csv";

const ERR = "_error";

export async function run(args: Args) {
  const { schema, keys } = await load(args.schema);
  const sheet = await read(args.src, args.dest, args.inPlace, keys);
  const selected = select(sheet.headers, keys, args.cols);
  const { tasks, skipped } = pending(sheet);

  if (tasks.length === 0) {
    console.log(`All ${sheet.rows.length} rows already processed. Nothing to do.`);
    return;
  }

  console.log(`Processing ${tasks.length} rows (${skipped} skipped, ${sheet.rows.length} total)`);

  const api = client(args.key);
  const queue = new PQueue({ concurrency: args.parallel, interval: 1000, intervalCap: args.rps });
  const progress = tracker(tasks.length);
  let done = 0;

  for (const idx of tasks) {
    queue.add(async () => {
      const row = sheet.rows[idx]!;
      let ok = true;

      try {
        const prompt = render(row, sheet.headers, selected, args.prompt);
        const result = await call(api, args.model, prompt, schema, args.retries);
        for (const k of keys) {
          row[sheet.colmap[k]!] = String(result[k] ?? "");
        }
        row[sheet.colmap[ERR]!] = "";
      } catch (e: unknown) {
        row[sheet.colmap[ERR]!] = e instanceof Error ? e.message : String(e);
        ok = false;
      }

      progress.tick(ok);
      if (++done % 25 === 0) await write(args.dest, sheet);
    });
  }

  await queue.onIdle();
  await write(args.dest, sheet);

  console.log(`\n→ ${args.dest}`);
  progress.summary(skipped);
}
