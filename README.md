# csv-prompt

Process CSV rows through an AI model to extract structured data using Zod schemas. Supports concurrent requests, rate limiting, and automatic resume.

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

And a Zod schema in `examples/schema.ts`:

```ts
import { z } from "zod";

export default z.object({
  title: z.string().describe("The exact page title from the company website"),
  tagline: z.string().describe("The main hero or tagline text visible on the homepage"),
  reasoning: z.string().describe("Brief explanation of how you determined the tagline"),
});
```

Run with `--search` so the model visits each company's website:

```bash
bun run src/index.ts examples/sample.csv \
  --schema examples/schema.ts \
  --prompt "Visit this company's website and extract the page title and main tagline" \
  --search
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
| `--schema <path>`     | `-s`  | —                             | Path to `.ts` file exporting a Zod schema (required)            |
| `--prompt <text>`     | `-p`  | —                             | Prompt sent to the model for each row (required)                |
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
