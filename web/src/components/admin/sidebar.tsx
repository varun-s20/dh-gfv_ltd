import { ExternalLink, LogOut } from "lucide-react";
import { requireAdminPage } from "@/lib/admin/guard";
import { getNavCounts } from "@/lib/admin/queries";
import { signOut } from "@/lib/admin/session-actions";
import { NavList } from "./nav-list";
import { LiveNav } from "./shell";

/** Session-dependent sidebar pieces. Each sits inside its own Suspense boundary in the console layout. */

export async function SidebarNav() {
  await requireAdminPage();
  const counts = await getNavCounts();
  return <LiveNav counts={counts} />;
}

export function SidebarNavFallback() {
  return <NavList pathname={null} />;
}

export async function MenuBadge() {
  await requireAdminPage();
  const counts = await getNavCounts();
  if (!counts.fresh) return null;
  return (
    <span className="absolute top-1.5 right-1.5 size-2.5 rounded-full bg-plate ring-2 ring-field">
      <span className="sr-only">, {counts.fresh} new leads</span>
    </span>
  );
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

export async function SidebarUser() {
  const user = await requireAdminPage();
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3 rounded-lg px-2 py-2">
        <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-moss font-mono text-[0.75rem] text-brass-soft ring-1 ring-brass/30">
          {initials(user.name)}
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-sm font-medium text-ivory">{user.name}</span>
          <span className="block truncate text-xs text-sage">{user.role === "owner" ? "Owner" : "Staff"} · {user.email}</span>
        </span>
      </div>
      <div className="flex gap-1">
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="flex h-9 flex-1 items-center gap-2 rounded-lg px-2.5 text-[0.82rem] text-ivory/70 hover:bg-white/[0.05] hover:text-ivory"
        >
          <ExternalLink aria-hidden className="size-3.5" />
          View site
          <span className="sr-only">(opens in a new tab)</span>
        </a>
        <form action={signOut} className="flex-1">
          <button type="submit" className="flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-[0.82rem] text-ivory/70 hover:bg-white/[0.05] hover:text-ivory">
            <LogOut aria-hidden className="size-3.5" />
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}

export function SidebarUserFallback() {
  return (
    <div className="flex items-center gap-3 px-2 py-2" aria-hidden>
      <span className="size-9 rounded-full bg-white/[0.06]" />
      <span className="flex-1 space-y-1.5">
        <span className="block h-3 w-24 rounded bg-white/[0.08]" />
        <span className="block h-2.5 w-32 rounded bg-white/[0.05]" />
      </span>
    </div>
  );
}
