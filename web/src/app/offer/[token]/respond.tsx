"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { CtaButton } from "@/components/ui/primitives";
import { respondAction, type OfferActionState } from "./actions";

function Submit({ children, variant }: { children: React.ReactNode; variant: "ion" | "chalk" }) {
  const { pending } = useFormStatus();
  return (
    <CtaButton type="submit" variant={variant} size="lg" disabled={pending} className="w-full sm:w-auto">
      {pending ? "Sending…" : children}
    </CtaButton>
  );
}

/** Accept needs a deliberate second tap; decline can carry an optional reason. */
export function RespondPanel({ token, amount, reg }: { token: string; amount: string; reg: string }) {
  const [mode, setMode] = useState<"idle" | "accept" | "decline">("idle");
  const [state, action] = useActionState<OfferActionState, FormData>(respondAction, {});

  return (
    <div className="space-y-4">
      {state.error ? (
        <p role="alert" className="rounded-2xl bg-alert/10 px-4 py-3 text-sm font-medium text-alert ring-1 ring-alert/30">
          {state.error}
        </p>
      ) : null}

      {mode === "idle" ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <CtaButton type="button" variant="ion" size="lg" onClick={() => setMode("accept")} className="w-full sm:w-auto">
            Accept {amount}
          </CtaButton>
          <CtaButton type="button" variant="ghost" size="lg" onClick={() => setMode("decline")} className="w-full sm:w-auto">
            Decline
          </CtaButton>
        </div>
      ) : null}

      {mode === "accept" ? (
        <form action={action} className="space-y-4 rounded-2xl bg-ion/[0.08] p-5 ring-1 ring-ion/30">
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="response" value="accept" />
          <p className="font-display text-[1.15rem] font-medium tracking-[-0.015em]">
            Accept {amount} for {reg}?
          </p>
          <p className="text-sm text-chalk-2">We&apos;ll contact you to arrange collection. You can still change your mind before we collect.</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Submit variant="ion">Yes, accept the offer</Submit>
            <CtaButton type="button" variant="ghost" size="lg" onClick={() => setMode("idle")} className="w-full sm:w-auto">
              Not yet
            </CtaButton>
          </div>
        </form>
      ) : null}

      {mode === "decline" ? (
        <form action={action} className="space-y-4 rounded-2xl bg-chalk/[0.04] p-5 ring-1 ring-chalk/10">
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="response" value="decline" />
          <label htmlFor="reason" className="block font-display font-medium">
            Mind telling us why? <span className="font-normal text-chalk-3">(optional)</span>
          </label>
          <textarea
            id="reason"
            name="reason"
            maxLength={500}
            placeholder="For example: I've had a higher offer, or I've decided to keep it."
            className="block min-h-24 w-full rounded-2xl bg-night-850 px-4 py-3 text-chalk ring-1 ring-chalk/12 placeholder:text-chalk-3 focus:ring-2 focus:ring-ion focus:outline-none"
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Submit variant="chalk">Decline the offer</Submit>
            <CtaButton type="button" variant="ghost" size="lg" onClick={() => setMode("idle")} className="w-full sm:w-auto">
              Back
            </CtaButton>
          </div>
        </form>
      ) : null}
    </div>
  );
}
