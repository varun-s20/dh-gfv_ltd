"use client";

import { clsx } from "clsx";
import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { useEffect, useState } from "react";

type Tone = "ok" | "error" | "info";
type ToastItem = { id: number; message: string; tone: Tone };

const listeners = new Set<(t: ToastItem) => void>();
let seq = 0;

/** Fire-and-forget confirmation: toast("Offer sent"). */
export function toast(message: string, tone: Tone = "ok") {
  const item = { id: ++seq, message, tone };
  for (const listener of listeners) listener(item);
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const listener = (item: ToastItem) => {
      setItems((current) => [...current.slice(-2), item]);
      const timer = setTimeout(() => {
        setItems((current) => current.filter((t) => t.id !== item.id));
        timers.delete(timer);
      }, item.tone === "error" ? 8000 : 4500);
      timers.add(timer);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      for (const t of timers) clearTimeout(t);
    };
  }, []);

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[70] flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6"
    >
      {items.map((t) => (
        <div
          key={t.id}
          role={t.tone === "error" ? "alert" : "status"}
          className={clsx(
            "pointer-events-auto flex w-full max-w-sm animate-[rise_0.45s_var(--ease-out-quint)_both] items-start gap-3 rounded-xl px-4 py-3 text-sm shadow-[0_18px_40px_-18px_rgb(6_21_15/0.6)] ring-1",
            t.tone === "error" ? "bg-white text-ink ring-signal/30" : "bg-field text-ivory ring-white/10",
          )}
        >
          <span className={clsx("mt-0.5 shrink-0 [&_svg]:size-4", t.tone === "error" ? "text-signal" : t.tone === "info" ? "text-brass" : "text-mint")}>
            {t.tone === "error" ? <CircleAlert aria-hidden /> : t.tone === "info" ? <Info aria-hidden /> : <CircleCheck aria-hidden />}
          </span>
          <p className="min-w-0 flex-1 leading-snug">{t.message}</p>
          <button
            type="button"
            onClick={() => setItems((current) => current.filter((i) => i.id !== t.id))}
            className={clsx("-m-1 grid size-6 shrink-0 place-items-center rounded-md [&_svg]:size-3.5", t.tone === "error" ? "text-slate hover:text-ink" : "text-ivory/60 hover:text-ivory")}
            aria-label="Dismiss"
          >
            <X aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}
