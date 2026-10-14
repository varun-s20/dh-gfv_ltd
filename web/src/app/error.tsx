"use client";

import { useEffect } from "react";
import { Cta, CtaButton } from "@/components/ui/primitives";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="relative flex min-h-dvh flex-col justify-center overflow-hidden bg-night-950">
      <div className="spotlight absolute inset-0" />
      <div className="container-page relative flex flex-col items-center gap-5 py-20 text-center">
        <p className="eyebrow flex items-center gap-2.5 text-chalk-3">
          <span className="ion-dot" /> Something went wrong
        </p>
        <h1 className="display max-w-2xl text-d2">
          Sorry, that <em>didn&apos;t load.</em>
        </h1>
        <p className="max-w-md text-chalk-2">Please try again. If it keeps happening, call or WhatsApp us and we&apos;ll help straight away.</p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <CtaButton type="button" onClick={reset} size="lg">
            Try again
          </CtaButton>
          <Cta href="/" variant="ghost" size="lg">
            Home
          </Cta>
        </div>
        {error.digest ? <p className="mt-4 font-mono text-xs text-chalk-3">Reference {error.digest}</p> : null}
      </div>
    </main>
  );
}
