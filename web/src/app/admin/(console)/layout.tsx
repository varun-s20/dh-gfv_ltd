import { Suspense } from "react";
import { AdminShell } from "@/components/admin/shell";
import { MenuBadge, SidebarNav, SidebarNavFallback, SidebarUser, SidebarUserFallback } from "@/components/admin/sidebar";

/**
 * The console frame is static so it prerenders into the shell. The session is
 * never read at the layout's top level: the sidebar's counts and user block
 * stream in behind their own boundaries, and each page authorises itself.
 */
export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminShell
      nav={
        <Suspense fallback={<SidebarNavFallback />}>
          <SidebarNav />
        </Suspense>
      }
      user={
        <Suspense fallback={<SidebarUserFallback />}>
          <SidebarUser />
        </Suspense>
      }
      menuBadge={
        <Suspense fallback={null}>
          <MenuBadge />
        </Suspense>
      }
    >
      {children}
    </AdminShell>
  );
}
