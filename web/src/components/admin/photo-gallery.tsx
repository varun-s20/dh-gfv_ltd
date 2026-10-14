"use client";

import { clsx } from "clsx";
import { ChevronLeft, ChevronRight, Download, ImageOff, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export type GalleryPhoto = { id: string; label: string; width: number | null; height: number | null };

const src = (id: string) => `/api/admin/photos/${id}`;

/**
 * Seller photos with a keyboard-accessible lightbox built on <dialog>:
 * focus is trapped while open, Escape closes, ← / → step through, and focus
 * returns to the thumbnail that opened it. Images come from the authenticated
 * photo route, never from a public URL.
 */
export function PhotoGallery({ photos }: { photos: GalleryPhoto[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const triggers = useRef<Array<HTMLButtonElement | null>>([]);
  const [index, setIndex] = useState<number | null>(null);
  const [broken, setBroken] = useState<Record<string, boolean>>({});

  const open = (i: number) => {
    setIndex(i);
    dialog.current?.showModal();
  };
  const close = useCallback(() => dialog.current?.close(), []);
  const step = useCallback((delta: number) => setIndex((i) => (i === null ? i : (i + delta + photos.length) % photos.length)), [photos.length]);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    const onClose = () => {
      setIndex((i) => {
        if (i !== null) requestAnimationFrame(() => triggers.current[i]?.focus());
        return null;
      });
    };
    el.addEventListener("close", onClose);
    return () => el.removeEventListener("close", onClose);
  }, []);

  const current = index !== null ? photos[index] : undefined;

  return (
    <>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
        {photos.map((photo, i) => (
          <li key={photo.id}>
            <button
              ref={(el) => {
                triggers.current[i] = el;
              }}
              type="button"
              onClick={() => open(i)}
              className="group relative block aspect-[4/3] w-full overflow-hidden rounded-xl bg-ink/[0.06] ring-1 ring-ink/[0.08] focus-visible:ring-4 focus-visible:ring-racing/30"
            >
              {broken[photo.id] ? (
                <span className="absolute inset-0 grid place-items-center text-slate">
                  <ImageOff aria-hidden className="size-6" />
                </span>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- private, authenticated image route
                <img
                  src={src(photo.id)}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  onError={() => setBroken((b) => ({ ...b, [photo.id]: true }))}
                  className="size-full object-cover transition-transform duration-500 ease-[var(--ease-out-quint)] group-hover:scale-[1.03] motion-reduce:transition-none"
                />
              )}
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-field/80 to-transparent px-2.5 pt-6 pb-2 text-left text-[0.75rem] font-medium text-ivory">
                {photo.label}
              </span>
              <span className="sr-only">
                Open photo {i + 1} of {photos.length}: {photo.label}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialog}
        aria-label={current ? `Photo ${index! + 1} of ${photos.length}: ${current.label}` : "Photo"}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") {
            e.preventDefault();
            step(1);
          } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            step(-1);
          }
        }}
        onClick={(e) => {
          if (e.target === dialog.current) close();
        }}
        className="m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 text-ivory backdrop:bg-field/90 backdrop:backdrop-blur-sm open:flex open:flex-col"
      >
        {current ? (
          <>
            <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
              <p className="text-sm">
                <span className="font-medium">{current.label}</span>
                <span className="ml-2 font-mono text-ivory/60 tabular-nums">
                  {index! + 1} / {photos.length}
                </span>
              </p>
              <div className="flex items-center gap-1">
                <a href={`${src(current.id)}?download=1`} className="grid size-10 place-items-center rounded-full hover:bg-white/10" title="Download original">
                  <Download aria-hidden className="size-5" strokeWidth={1.7} />
                  <span className="sr-only">Download original</span>
                </a>
                <button type="button" onClick={close} className="grid size-10 place-items-center rounded-full hover:bg-white/10" autoFocus>
                  <X aria-hidden className="size-5" strokeWidth={1.7} />
                  <span className="sr-only">Close</span>
                </button>
              </div>
            </div>
            <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-4 sm:px-16" onClick={(e) => e.target === e.currentTarget && close()}>
              {broken[current.id] ? (
                <div className="flex flex-col items-center gap-3 text-center text-ivory/80">
                  <ImageOff aria-hidden className="size-8" />
                  <p className="max-w-xs text-sm">This photo can&apos;t be shown in the browser (often an iPhone HEIC file). Download it to view.</p>
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- private, authenticated image route
                <img
                  key={current.id}
                  src={src(current.id)}
                  alt={current.label}
                  width={current.width ?? undefined}
                  height={current.height ?? undefined}
                  onError={() => setBroken((b) => ({ ...b, [current.id]: true }))}
                  className="max-h-full max-w-full rounded-lg object-contain shadow-[0_30px_80px_-30px_rgb(0_0_0/0.8)]"
                />
              )}
              {photos.length > 1 ? (
                <>
                  <NavButton side="left" onClick={() => step(-1)} label="Previous photo" />
                  <NavButton side="right" onClick={() => step(1)} label="Next photo" />
                </>
              ) : null}
            </div>
          </>
        ) : null}
      </dialog>
    </>
  );
}

function NavButton({ side, onClick, label }: { side: "left" | "right"; onClick: () => void; label: string }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "absolute top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-field/60 text-ivory ring-1 ring-white/15 backdrop-blur hover:bg-field/90",
        side === "left" ? "left-2 sm:left-4" : "right-2 sm:right-4",
      )}
    >
      <Icon aria-hidden className="size-5" strokeWidth={1.7} />
      <span className="sr-only">{label}</span>
    </button>
  );
}
