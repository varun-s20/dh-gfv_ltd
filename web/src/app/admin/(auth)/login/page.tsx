import type { Metadata, Route } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "@/components/admin/auth-forms";
import { Skeleton } from "@/components/admin/ui";
import { safeNextPath } from "@/lib/admin/next-path";
import { currentSession } from "@/lib/admin/guard";

export const metadata: Metadata = { title: "Sign in" };

type Search = Promise<Record<string, string | string[] | undefined>>;

const NOTICES: Record<string, string> = {
  locked: "Too many wrong codes. Sign in again to get a fresh start.",
  expired: "Your session ended. Sign in again to carry on.",
};

export default function LoginPage({ searchParams }: { searchParams: Search }) {
  return (
    <>
      <div className="mb-8 space-y-2">
        <p className="eyebrow text-brass-deep">Admin</p>
        <h1 className="display text-[2.6rem] leading-none">Sign in</h1>
        <p className="text-[0.95rem] text-slate">Use the email address your account was set up with.</p>
      </div>
      <Suspense fallback={<FormSkeleton />}>
        <LoginGate searchParams={searchParams} />
      </Suspense>
      <p className="mt-8 text-[0.82rem] leading-relaxed text-slate">
        Locked out or lost your phone? Ask the account owner to reset your password from Settings › Team.
      </p>
    </>
  );
}

async function LoginGate({ searchParams }: { searchParams: Search }) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : undefined);
  const session = await currentSession();
  if (session) {
    if (session.user.totpEnabled && !session.mfaPassed) redirect(`/admin/login/verify?next=${encodeURIComponent(next)}` as Route);
    redirect(next as Route);
  }
  const reason = typeof params.reason === "string" ? params.reason : "";
  return <LoginForm next={next} notice={NOTICES[reason]} />;
}

function FormSkeleton() {
  return (
    <div className="space-y-5" aria-hidden>
      <Skeleton className="h-[4.6rem]" />
      <Skeleton className="h-[4.6rem]" />
      <Skeleton className="h-12 rounded-full" />
    </div>
  );
}
