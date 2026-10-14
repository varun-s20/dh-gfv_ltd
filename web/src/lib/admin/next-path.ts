/**
 * Where to send someone after signing in. Only same-site admin paths are
 * honoured, so ?next= can't be used as an open redirect.
 */
export function safeNextPath(value: string | null | undefined): string {
  if (!value || value.length > 500) return "/admin";
  if (!/^\/admin(?:[/?#]|$)/.test(value)) return "/admin";
  if (/[\\\u0000-\u001f]/.test(value) || value.startsWith("//")) return "/admin";
  if (/^\/admin\/login(?:[/?#]|$)/.test(value)) return "/admin";
  return value;
}
