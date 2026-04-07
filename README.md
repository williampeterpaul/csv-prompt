# csv-prompt

Process CSV rows through an AI model to extract structured data using Zod schemas. Supports concurrent requests, rate limiting, and automatic resume.

## Example

Given `examples/sample.csv`:

```
company,website,location
Stripe,https://stripe.com,"San Francisco, CA"
Figma,https://figma.com,"San Francisco, CA"
...
```

And a Zod schema in `examples/schema-industry.ts`:

```ts
import { z } from "zod";

export default z.object({
  industry: z.string().describe("The primary industry of the company"),
  sub_industry: z
    .string()
    .describe("A more specific sub-industry classification"),
  confidence: z
    .enum(["high", "medium", "low"])
    .describe("Confidence in the classification"),
});
```

Run:

```bash
bun run src/index.ts examples/sample.csv \
  --schema examples/schema-industry.ts \
  --prompt "Classify this company by industry" \
  --api-key "$XAI_API_KEY"
```

Output in `examples/sample.out.csv`:

```
company,website,location,industry,sub_industry,confidence,_error
Stripe,https://stripe.com,"San Francisco, CA",Financial Technology,Payment Processing,high,
Figma,https://figma.com,"San Francisco, CA",Technology,Design Software,high,
...
```

## Options

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--schema <path>` | `-s` | — | Path to `.ts` file exporting a Zod schema (required) |
| `--prompt <text>` | `-p` | — | Prompt sent to the model for each row (required) |
| `--api-key <key>` | | `$XAI_API_KEY` | xAI API key |
| `--model <id>` | `-m` | `grok-3-fast` | Model ID |
| `--columns <indexes>` | `-c` | all | Comma-separated 0-based column indexes to include in the prompt |
| `--concurrency <n>` | | `5` | Max parallel API calls |
| `--rate-limit <n>` | | `20` | Max requests per second |
| `--max-retries <n>` | | `5` | Max retries per row on failure |
| `--in-place` | | `false` | Overwrite input CSV instead of writing to `<name>.out.csv` |
| `--output <path>` | `-o` | `<name>.out.csv` | Explicit output file path |
| `--help` | `-h` | | Show help |

Re-running the same command resumes from where it left off, skipping rows that already have results.
