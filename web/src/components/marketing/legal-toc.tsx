"use client";

import { clsx } from "clsx";
import { useEffect, useState } from "react";

type Entry = { id: string; text: string };

const slug = (t: string) =>
  t
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** A sticky contents list built from the document's own headings, tracking the one in view. */
export function LegalToc({ target }: { target: string }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const root = document.getElementById(target);
    if (!root) return;
    const heads = Array.from(root.querySelectorAll<HTMLHeadingElement>("h2"));
    const list = heads.map((h) => {
      if (!h.id) h.id = slug(h.textContent ?? "");
      return { id: h.id, text: h.textContent ?? "" };
    });
    // One-off read of headings the server already rendered.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEntries(list);
    const io = new IntersectionObserver(
      (items) => {
        const visible = items.filter((i) => i.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -65% 0px" },
    );
    heads.forEach((h) => io.observe(h));
    return () => io.disconnect();
  }, [target]);

  if (!entries.length) return null;
  return (
    <nav aria-label="On this page" className="hidden lg:block">
      <p className="eyebrow text-carbon-3">On this page</p>
      <ol className="mt-4 space-y-1 border-l border-carbon/12">
        {entries.map((e) => (
          <li key={e.id}>
            <a
              href={`#${e.id}`}
              className={clsx(
                "-ml-px block border-l-2 py-1.5 pl-4 text-[0.9rem] transition-colors duration-300",
                active === e.id ? "border-carbon text-carbon" : "border-transparent text-carbon-3 hover:text-carbon",
              )}
            >
              {e.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
