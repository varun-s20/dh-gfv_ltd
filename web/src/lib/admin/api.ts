import "server-only";

import { adminForApi } from "@/lib/auth/session";

/**
 * Route-handler guard: 401 when there's no (fully verified) admin session,
 * 403 when the role isn't enough. Never redirects, so fetches and downloads
 * get a clear status instead of an HTML sign-in page.
 */
export async function apiAdmin(opts: { role?: "owner" } = {}) {
  const user = await adminForApi();
  if (!user) return { user: null, response: json({ error: "Sign in to continue." }, 401) } as const;
  if (opts.role === "owner" && user.role !== "owner") return { user: null, response: json({ error: "Only an owner can do that." }, 403) } as const;
  return { user, response: null } as const;
}

export function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export function csvResponse(body: string, filename: string) {
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
