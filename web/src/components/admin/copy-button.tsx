"use client";

import { clsx } from "clsx";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "./toast";

export function CopyButton({ value, label, className, tone = "light" }: { value: string; label: string; className?: string; tone?: "light" | "dark" }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          toast("Copied");
          setTimeout(() => setCopied(false), 1600);
        } catch {
          toast("Couldn't copy. Select the text instead.", "error");
        }
      }}
      className={clsx(
        "inline-grid size-7 shrink-0 place-items-center rounded-md transition-colors [&_svg]:size-3.5",
        tone === "light" ? "text-slate hover:bg-ink/[0.06] hover:text-ink" : "text-ivory/70 hover:bg-white/10 hover:text-ivory",
        className,
      )}
    >
      {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
      <span className="sr-only">{label}</span>
    </button>
  );
}
