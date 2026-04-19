import { parseArgs } from "node:util";
import { resolve, basename, extname, dirname, join } from "node:path";

export interface Args {
  src: string;
  schema: string;
  prompt: string;
  dest: string;
  key: string;
  model: string;
  parallel: number;
  rps: number;
  retries: number;
  cols: number[] | null;
  inPlace: boolean;
  search: boolean;
}

export async function parse(): Promise<Args> {
  const { values: opts, positionals: pos } = parseArgs({
    args: Bun.argv.slice(2),
    allowPositionals: true,
    options: {
      schema: { type: "string", short: "s" },
      prompt: { type: "string", short: "p" },
      columns: { type: "string", short: "c" },
      concurrency: { type: "string", default: "5" },
      "rate-limit": { type: "string", default: "20" },
      "api-key": { type: "string" },
      "in-place": { type: "boolean", default: false },
      output: { type: "string", short: "o" },
      model: { type: "string", short: "m", default: "grok-4-1-fast-non-reasoning" },
      "max-retries": { type: "string", default: "5" },
      search: { type: "boolean", default: false },
      help: { type: "boolean", short: "h" },
    },
  });

  if (opts.help || pos.length === 0) {
    console.log(`
csv-prompt — Process CSV rows through an AI model with structured output

Usage:
  csv-prompt <csv-file> [options]

Options:
  -s, --schema <path>       Path to .json or .ts schema file (required)
  -p, --prompt <text>       Prompt for each row (default: "Fill in each field as described in the schema.")
  -c, --columns <indexes>   Comma-separated 0-based column indexes (default: all)
  --concurrency <n>         Max parallel API calls (default: 5)
  --rate-limit <n>          Max requests per second (default: 20)
  --api-key <key>           xAI API key (fallback: XAI_API_KEY env var)
  --in-place                Overwrite input CSV (default: write to <name>.out.csv)
  -o, --output <path>       Explicit output file path
  -m, --model <id>          Model ID (default: grok-4-1-fast-non-reasoning)
  --max-retries <n>         Max retries per row (default: 5)
  --search                  Enable web search (model browses the web per row)
  -h, --help                Show this help
`);
    process.exit(0);
  }

  const src = resolve(pos[0]!);
  if (!(await Bun.file(src).exists())) fail(`CSV file not found: ${src}`);
  if (!opts.schema) fail("--schema is required");

  const schema = resolve(opts.schema!);
  if (!(await Bun.file(schema).exists()))
    fail(`Schema file not found: ${schema}`);

  const key = opts["api-key"] ?? process.env.XAI_API_KEY;
  if (!key) fail("Provide --api-key or set XAI_API_KEY env var");

  const inPlace = opts["in-place"] ?? false;
  let dest: string;
  if (inPlace) dest = src;
  else if (opts.output) dest = resolve(opts.output);
  else {
    const ext = extname(src);
    dest = join(dirname(src), `${basename(src, ext)}.out${ext}`);
  }

  return {
    src,
    schema,
    prompt: opts.prompt ?? "Fill in each field as described in the schema.",
    dest,
    key: key!,
    model: opts.model!,
    parallel: parseInt(opts.concurrency!, 10),
    rps: parseInt(opts["rate-limit"]!, 10),
    retries: parseInt(opts["max-retries"]!, 10),
    cols: opts.columns
      ? opts.columns.split(",").map((s) => parseInt(s.trim(), 10))
      : null,
    inPlace,
    search: opts.search ?? false,
  };
}

function fail(msg: string): never {
  console.error(`Error: ${msg}`);
  process.exit(1);
}

// ── Progress bar ────────────────────────────────────────────────────────────

export function tracker(total: number) {
  const WIDTH = 30;
  const start = Date.now();
  let ok = 0;
  let err = 0;
  let done = 0;

  function tick(success: boolean) {
    success ? ok++ : err++;
    done++;

    const fill = Math.round((done / total) * WIDTH);
    const bar = "█".repeat(fill) + "░".repeat(WIDTH - fill);

    let eta = "";
    if (done > 0) {
      const rem = ((Date.now() - start) / 1000 / done) * (total - done);
      eta =
        rem < 60
          ? `${Math.ceil(rem)}s`
          : `${Math.floor(rem / 60)}m${Math.ceil(rem % 60)}s`;
    }

    process.stdout.write(
      `\r  ${bar} ${done}/${total}  ✓ ${ok}  ✗ ${err}  ${
        eta ? `ETA ${eta}` : ""
      }   `
    );
  }

  function summary(skipped: number) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`\n\nDone in ${elapsed}s`);
    console.log(`  Total:   ${total + skipped}`);
    console.log(`  Success: ${ok}`);
    console.log(`  Failed:  ${err}`);
    console.log(`  Skipped: ${skipped}`);
  }

  return { tick, summary };
}
