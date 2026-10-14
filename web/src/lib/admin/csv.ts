/**
 * RFC 4180 CSV with spreadsheet formula-injection protection.
 *
 * - Fields containing a comma, double quote, CR or LF are wrapped in double
 *   quotes, and embedded quotes are doubled.
 * - Records end with CRLF.
 * - Text that a spreadsheet would treat as a formula (starting with = + - @,
 *   or a tab / carriage return) is prefixed with a single quote, so a seller
 *   who types "=HYPERLINK(...)" into the form can't run anything on the
 *   machine of whoever opens the export (OWASP "CSV injection").
 *   Real numbers are left alone: -5 stays a number.
 */

export type CsvValue = string | number | boolean | Date | null | undefined;

const FORMULA_START = /^[=+\-@\t\r]/;
const NEEDS_QUOTES = /[",\r\n]/;

/** Neutralise a leading formula trigger. Exported for tests and for callers building custom rows. */
export function neutraliseFormula(text: string): string {
  return FORMULA_START.test(text) ? `'${text}` : text;
}

export function csvCell(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  let text: string;
  if (typeof value === "number") text = Number.isFinite(value) ? String(value) : "";
  else if (typeof value === "boolean") text = value ? "yes" : "no";
  else if (value instanceof Date) text = Number.isNaN(value.getTime()) ? "" : value.toISOString();
  else text = neutraliseFormula(value);
  return NEEDS_QUOTES.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function csvRow(values: CsvValue[]): string {
  return values.map(csvCell).join(",");
}

/**
 * Build a whole document. `bom` prepends a UTF-8 byte-order mark so Excel
 * opens "£" and accented names correctly; Google's uploader doesn't want one.
 */
export function toCsv(header: string[], rows: CsvValue[][], opts: { bom?: boolean } = {}): string {
  const lines = [csvRow(header), ...rows.map(csvRow)];
  return `${opts.bom ? "﻿" : ""}${lines.join("\r\n")}\r\n`;
}

/** A safe download filename: letters, digits, dot, dash and underscore only. */
export function csvFilename(stem: string, date: string) {
  return `${stem}-${date}.csv`.replace(/[^A-Za-z0-9._-]/g, "-");
}
