# csv-prompt

Process CSV rows through an AI model to extract structured data. Supports concurrent requests, rate limiting, and automatic resume.

## Example

Given `examples/sample.csv`:

```
company,website
Stripe,https://stripe.com
Vercel,https://vercel.com
Linear,https://linear.app
Supabase,https://supabase.com
Retool,https://retool.com
```

Define the output fields in a JSON schema (`examples/schema.json`):

```json
{
  "title": "The exact page title from the company website",
  "tagline": "The main hero or tagline text visible on the homepage",
  "reasoning": "Brief explanation of how you determined the tagline"
}
```

Each key becomes an output column; the value tells the model what to extract.

Run with `--search` so the model visits each company's website:

```bash
bun run src/index.ts examples/sample.csv \
  --schema examples/schema.json \
  --search
```

You can override the default prompt:

```bash
bun run src/index.ts examples/sample.csv \
  --schema examples/schema.json \
  --prompt "Visit this company's website and extract the page title and main tagline" \
  --search
```

Zod schemas (`.ts` files) are also supported for advanced types:

```ts
import { z } from "zod";

export default z.object({
  title: z.string().describe("The exact page title from the company website"),
  tagline: z.string().describe("The main hero or tagline text visible on the homepage"),
  reasoning: z.string().describe("Brief explanation of how you determined the tagline"),
});
```

Output in `examples/sample.out.csv`:

```
company,website,title,tagline,reasoning,_error
Stripe,https://stripe.com,Stripe | Financial Infrastructure for the Internet,Financial infrastructure for the internet,The hero heading on stripe.com's homepage,
...
```

## Options

| Flag                  | Short | Default                       | Description                                                     |
| --------------------- | ----- | ----------------------------- | --------------------------------------------------------------- |
| `--schema <path>`     | `-s`  | —                             | Path to `.json` or `.ts` schema file (required)                 |
| `--prompt <text>`     | `-p`  | (see below)                   | Prompt sent to the model for each row                           |
| `--api-key <key>`     |       | `$XAI_API_KEY`                | xAI API key                                                     |
| `--model <id>`        | `-m`  | `grok-4-1-fast-non-reasoning` | Model ID                                                        |
| `--columns <indexes>` | `-c`  | all                           | Comma-separated 0-based column indexes to include in the prompt |
| `--concurrency <n>`   |       | `5`                           | Max parallel API calls                                          |
| `--rate-limit <n>`    |       | `20`                          | Max requests per second                                         |
| `--max-retries <n>`   |       | `5`                           | Max retries per row on failure                                  |
| `--search`            |       | `false`                       | Enable web search (model can browse the web per row)            |
| `--x-search`          |       | `false`                       | Enable X/Twitter search per row                                 |
| `--in-place`          |       | `false`                       | Overwrite input CSV instead of writing to `<name>.out.csv`      |
| `--output <path>`     | `-o`  | `<name>.out.csv`              | Explicit output file path                                       |
| `--help`              | `-h`  |                               | Show help                                                       |

Re-running the same command resumes from where it left off, skipping rows that already have results.
