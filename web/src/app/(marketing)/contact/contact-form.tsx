"use client";

import { clsx } from "clsx";
import { useActionState } from "react";
import { CtaButton } from "@/components/ui/primitives";
import { sendEnquiry, type ContactState } from "./actions";

const field =
  "mt-2 block w-full rounded-2xl bg-pearl-50 px-4 text-[1rem] text-carbon ring-1 ring-carbon/15 transition-shadow duration-200 placeholder:text-carbon-3/70 focus:ring-2 focus:ring-ion-deep focus:outline-none aria-[invalid=true]:ring-alert-deep";

export function ContactForm() {
  const [state, action, pending] = useActionState<ContactState, FormData>(sendEnquiry, {});
  const e = state.errors ?? {};
  const v = state.values ?? {};

  if (state.ok) {
    return (
      <div role="status" className="rounded-[1.75rem] bg-pearl-50 p-8 ring-1 ring-carbon/10">
        <p className="flex items-center gap-2.5 font-display text-[1.5rem] font-medium tracking-[-0.025em]">
          <span className="ion-dot" /> Message sent
        </p>
        <p className="mt-3 text-carbon-2">Thanks. A specialist will reply during opening hours, usually within a few hours.</p>
      </div>
    );
  }

  return (
    <form action={action} noValidate className="space-y-5 rounded-[1.75rem] bg-pearl-50 p-6 ring-1 ring-carbon/10 sm:p-8">
      <div aria-hidden className="absolute -left-[9999px]">
        <label>
          Website <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="c-name" className="label text-carbon-2">
            Name
          </label>
          <input id="c-name" name="name" autoComplete="name" defaultValue={v.name} aria-invalid={e.name ? true : undefined} aria-describedby={e.name ? "c-name-err" : undefined} className={clsx(field, "h-13")} />
          {e.name ? (
            <p id="c-name-err" className="mt-1.5 text-sm text-alert-deep">
              {e.name}
            </p>
          ) : null}
        </div>
        <div>
          <label htmlFor="c-email" className="label text-carbon-2">
            Email
          </label>
          <input id="c-email" name="email" type="email" autoComplete="email" defaultValue={v.email} aria-invalid={e.email ? true : undefined} aria-describedby={e.email ? "c-email-err" : undefined} className={clsx(field, "h-13")} />
          {e.email ? (
            <p id="c-email-err" className="mt-1.5 text-sm text-alert-deep">
              {e.email}
            </p>
          ) : null}
        </div>
        <div>
          <label htmlFor="c-phone" className="label text-carbon-2">
            Phone <span className="text-carbon-3 normal-case">(optional)</span>
          </label>
          <input id="c-phone" name="phone" type="tel" autoComplete="tel" defaultValue={v.phone} className={clsx(field, "h-13")} />
        </div>
        <div>
          <label htmlFor="c-topic" className="label text-carbon-2">
            About
          </label>
          <select id="c-topic" name="topic" defaultValue={v.topic || "selling"} className={clsx(field, "h-13 appearance-none")}>
            <option value="selling">Selling a vehicle</option>
            <option value="existing-offer">An offer I&apos;ve received</option>
            <option value="fleet">Fleet or several vehicles</option>
            <option value="other">Something else</option>
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="c-message" className="label text-carbon-2">
          Message
        </label>
        <textarea
          id="c-message"
          name="message"
          rows={5}
          defaultValue={v.message}
          aria-invalid={e.message ? true : undefined}
          aria-describedby={e.message ? "c-message-err" : undefined}
          className={clsx(field, "min-h-36 py-3.5 leading-relaxed")}
        />
        {e.message ? (
          <p id="c-message-err" className="mt-1.5 text-sm text-alert-deep">
            {e.message}
          </p>
        ) : null}
      </div>
      {state.message ? (
        <p role="alert" className="rounded-xl bg-alert-deep/[0.07] px-4 py-3 text-sm text-alert-deep">
          {state.message}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-4">
        <CtaButton type="submit" variant="carbon" size="lg" disabled={pending}>
          {pending ? "Sending…" : "Send message"}
        </CtaButton>
        <p className="text-[0.85rem] text-carbon-3">We reply during opening hours.</p>
      </div>
    </form>
  );
}
