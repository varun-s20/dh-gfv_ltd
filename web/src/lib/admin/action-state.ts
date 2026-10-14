import type { z } from "zod";

/**
 * The shape every admin Server Action returns to useActionState. `at` makes
 * each result unique so the client can react to repeated identical outcomes.
 */
export type ActionState<T = undefined> = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
  data?: T;
  at: number;
};

export const done = <T = undefined>(message?: string, data?: T): ActionState<T> => ({ ok: true, message, data, at: Date.now() });

export const fail = <T = undefined>(message: string, errors?: Record<string, string>): ActionState<T> => ({ ok: false, message, errors, at: Date.now() });

/** First message per field from a zod error, for inline display. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "form";
    out[key] ??= issue.message;
  }
  return out;
}

export const invalid = <T = undefined>(error: z.ZodError, message = "Check the highlighted fields."): ActionState<T> =>
  fail<T>(message, fieldErrors(error));

/** FormData → plain object of strings (multi-value keys become arrays). */
export function formObject(fd: FormData): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const [key, value] of fd.entries()) {
    if (key.startsWith("$ACTION")) continue;
    if (typeof value !== "string") continue;
    const prev = out[key];
    out[key] = prev === undefined ? value : Array.isArray(prev) ? [...prev, value] : [prev, value];
  }
  return out;
}
