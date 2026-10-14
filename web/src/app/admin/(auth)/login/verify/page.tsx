import { ShieldCheck } from "lucide-react";
import type { Metadata, Route } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { VerifyForm } from "@/components/admin/auth-forms";
import { btn } from "@/components/admin/styles";
import { Skeleton } from "@/components/admin/ui";
import { safeNextPath } from "@/lib/admin/next-path";
import { signOut } from "@/lib/admin/session-actions";
import { currentSession } from "@/lib/admin/guard";

export const metadata: Metadata = { title: "Two-step verification" };

type Search = Promise<Record<string, string | string[] | undefined>>;

export default function VerifyPage({ searchParams }: { searchParams: Search }) {
  return (
    <>
      <div className="mb-8 space-y-2">
        <span className="mb-4 grid size-11 place-items-center rounded-full bg-racing text-brass">
          <ShieldCheck aria-hidden className="size-5" strokeWidth={1.7} />
        </span>
        <h1 className="display text-[2.6rem] leading-none">Enter your code</h1>
        <p className="text-[0.95rem] text-slate">Open your authenticator app and type the 6-digit code for Green Future.</p>
      </div>
      <Suspense fallback={<Skeleton className="h-40" />}>
        <VerifyGate searchParams={searchParams} />
      </Suspense>
      <form action={signOut} className="mt-6">
        <button type="submit" className={btn("ghost", "sm", "-ml-3 text-slate")}>
          Use a different account
        </button>
      </form>
    </>
  );
}

async function VerifyGate({ searchParams }: { searchParams: Search }) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : undefined);
  const session = await currentSession();
  if (!session) redirect("/admin/login");
  if (!session.user.totpEnabled || session.mfaPassed) redirect(next as Route);
  return <VerifyForm next={next} />;
}
