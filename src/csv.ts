import Papa from "papaparse";

const ERR = "_error";

export interface Sheet {
  headers: string[];
  rows: string[][];
  colmap: Record<string, number>;
  keys: string[];
}

/** Read CSV, merge output columns, pad rows. Resumes from dest if it exists. */
export async function read(
  src: string,
  dest: string,
  inPlace: boolean,
  keys: string[]
): Promise<Sheet> {
  const source = !inPlace && await Bun.file(dest).exists() ? dest : src;
  const raw = await Bun.file(source).text();
  const parsed = Papa.parse<string[]>(raw, { header: false, skipEmptyLines: true });

  if (parsed.errors.length > 0) {
    console.error("CSV parse errors:", parsed.errors);
    process.exit(1);
  }

  const [headers, ...rows] = parsed.data;
  if (!headers || rows.length === 0) {
    console.error("Error: CSV must have a header row and at least one data row");
    process.exit(1);
  }

  const outkeys = [...keys, ERR];
  const colmap: Record<string, number> = {};

  for (const k of outkeys) {
    const idx = headers.indexOf(k);
    colmap[k] = idx !== -1 ? idx : headers.length;
    if (idx === -1) headers.push(k);
  }

  for (const row of rows) {
    while (row.length < headers.length) row.push("");
  }

  return { headers, rows, colmap, keys };
}

/** Write CSV to disk. */
export async function write(path: string, sheet: Sheet) {
  const csv = Papa.unparse({ fields: sheet.headers, data: sheet.rows });
  await Bun.write(path, csv);
}

/** Resolve which input column indexes to include in prompts. */
export function select(
  headers: string[],
  keys: string[],
  cols: number[] | null
): number[] {
  const outkeys = [...keys, ERR];
  const inputs: number[] = [];
  for (let i = 0; i < headers.length; i++) {
    if (!outkeys.includes(headers[i]!)) inputs.push(i);
  }
  return cols
    ? cols.filter((i) => i >= 0 && i < inputs.length).map((i) => inputs[i]!)
    : inputs;
}

/** Build the prompt for a single row. */
export function render(
  row: string[],
  headers: string[],
  selected: number[],
  task: string
): string {
  const data = selected
    .map((i) => `${headers[i] ?? ""}: ${JSON.stringify(row[i] ?? "")}`)
    .join("\n");
  return `Here is the data for this row:\n\n${data}\n\nTask: ${task}`;
}

/** Find row indexes that need processing (resume-aware). */
export function pending(sheet: Sheet): { tasks: number[]; skipped: number } {
  const tasks: number[] = [];
  let skipped = 0;
  const errIdx = sheet.colmap[ERR]!;

  for (let i = 0; i < sheet.rows.length; i++) {
    const row = sheet.rows[i]!;
    const filled = sheet.keys.every((k) => (row[sheet.colmap[k]!] ?? "").trim() !== "");
    const clean = (row[errIdx] ?? "").trim() === "";

    if (filled && clean) {
      skipped++;
    } else {
      row[errIdx] = "";
      tasks.push(i);
    }
  }

  return { tasks, skipped };
}
