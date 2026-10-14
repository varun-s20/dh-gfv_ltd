"use client";

import { clsx } from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import { prepareImage } from "@/lib/image-compress";
import { MAX_PHOTOS, PHOTO_SLOTS } from "@/lib/leads/form-schema";

export type UploadedPhoto = { id: string; receipt: string; slot?: string };

type Item = {
  key: string;
  slot?: string;
  preview?: string;
  status: "preparing" | "uploading" | "done" | "error";
  progress: number;
  error?: string;
  file?: File;
  result?: UploadedPhoto;
};

const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif";

function upload(blob: Blob, name: string, dims: { width?: number; height?: number }, onProgress: (p: number) => void) {
  return new Promise<UploadedPhoto>((resolve, reject) => {
    const form = new FormData();
    form.append("file", blob, name);
    if (dims.width) form.append("width", String(dims.width));
    if (dims.height) form.append("height", String(dims.height));
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/uploads");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      let json: { id?: string; receipt?: string; error?: string } = {};
      try {
        json = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300 && json.id && json.receipt) resolve({ id: json.id, receipt: json.receipt });
      else reject(new Error(json.error ?? "Upload failed. Please try again."));
    };
    xhr.onerror = () => reject(new Error("Connection lost. Check your signal and try again."));
    xhr.send(form);
  });
}

/**
 * Guided photo capture: five named shots that cover what a buyer needs, plus
 * extras. Each photo is compressed in the browser and uploaded straight away,
 * so the final submit is instant.
 */
export function PhotoUploader({ value, onChange }: { value: UploadedPhoto[]; onChange: (photos: UploadedPhoto[]) => void }) {
  const [items, setItems] = useState<Item[]>(() =>
    value.map((p) => ({ key: p.id, slot: p.slot, status: "done" as const, progress: 1, result: p })),
  );
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Report finished uploads to the form whenever the set changes.
  useEffect(() => {
    const done = items.filter((i) => i.status === "done" && i.result).map((i) => ({ ...i.result!, slot: i.slot }));
    const same = done.length === value.length && done.every((d, idx) => d.id === value[idx]?.id && d.slot === value[idx]?.slot);
    if (!same) onChange(done);
  }, [items, onChange, value]);

  useEffect(() => () => itemsRef.current.forEach((i) => i.preview && URL.revokeObjectURL(i.preview)), []);

  const patch = (key: string, next: Partial<Item>) => setItems((list) => list.map((i) => (i.key === key ? { ...i, ...next } : i)));

  const start = useCallback(async (key: string, file: File) => {
    patch(key, { status: "preparing", error: undefined, progress: 0 });
    try {
      const prepared = await prepareImage(file);
      if (prepared.blob.size > 8 * 1024 * 1024) throw new Error("That photo is over 8 MB. Try a screenshot of it, or a smaller photo.");
      patch(key, { status: "uploading" });
      const result = await upload(prepared.blob, prepared.name, prepared, (p) => patch(key, { progress: p }));
      patch(key, { status: "done", progress: 1, result });
    } catch (error) {
      patch(key, { status: "error", error: error instanceof Error ? error.message : "Upload failed." });
    }
  }, []);

  const add = (files: FileList | File[], slot?: string) => {
    const room = MAX_PHOTOS - itemsRef.current.length + (slot ? itemsRef.current.filter((i) => i.slot === slot).length : 0);
    const chosen = Array.from(files).slice(0, Math.max(0, room));
    const fresh: Item[] = chosen.map((file, idx) => ({
      key: `${Date.now()}-${idx}-${file.name}`,
      slot: idx === 0 ? slot : undefined,
      preview: URL.createObjectURL(file),
      status: "preparing",
      progress: 0,
      file,
    }));
    setItems((list) => {
      const kept = slot ? list.filter((i) => i.slot !== slot) : list;
      return [...kept, ...fresh];
    });
    fresh.forEach((item) => void start(item.key, item.file!));
  };

  const remove = (key: string) =>
    setItems((list) => {
      const target = list.find((i) => i.key === key);
      if (target?.preview) URL.revokeObjectURL(target.preview);
      return list.filter((i) => i.key !== key);
    });

  const bySlot = (slot: string) => items.find((i) => i.slot === slot);
  const extras = items.filter((i) => !i.slot || !PHOTO_SLOTS.some((s) => s.id === i.slot));
  const full = items.length >= MAX_PHOTOS;

  const done = items.filter((i) => i.status === "done").length;
  const busy = items.some((i) => i.status === "uploading" || i.status === "preparing");

  return (
    <div className="space-y-6">
      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {PHOTO_SLOTS.map((slot, i) => (
          <li key={slot.id}>
            <Tile index={i + 1} item={bySlot(slot.id)} label={slot.label} hint={slot.hint} onPick={(f) => add(f, slot.id)} onRemove={remove} onRetry={start} />
          </li>
        ))}
        <li>
          <Tile
            label="More photos"
            hint={full ? `That's the maximum of ${MAX_PHOTOS}.` : "Wheels, tyres, boot, service record, battery screen."}
            multiple
            disabled={full}
            onPick={(f) => add(f)}
            onRemove={remove}
            onRetry={start}
          />
        </li>
      </ul>
      {extras.length ? (
        <div>
          <p className="label text-carbon-3">Extra photos ({extras.length})</p>
          <ul className="mt-3 grid grid-cols-3 gap-2.5 sm:grid-cols-5">
            {extras.map((item) => (
              <li key={item.key}>
                <Thumb item={item} onRemove={remove} onRetry={start} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="flex items-center gap-3" aria-live="polite">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-carbon/10">
          <div className="h-full origin-left rounded-full bg-ion-deep transition-transform duration-500 ease-glide" style={{ transform: `scaleX(${done / MAX_PHOTOS})` }} />
        </div>
        <p className="text-[0.82rem] text-carbon-3 tabular-nums">
          {done} of {MAX_PHOTOS} photos
          {busy ? " · uploading" : ""}
        </p>
      </div>
    </div>
  );
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-[1.1rem]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h1.8l1.2-2h5l1.2 2h1.8A1.5 1.5 0 0 1 17 7.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 14.5v-7Z" />
      <circle cx="10" cy="11" r="3" />
    </svg>
  );
}

function Tile({
  index,
  item,
  label,
  hint,
  multiple,
  disabled,
  onPick,
  onRemove,
  onRetry,
}: {
  index?: number;
  item?: Item;
  label: string;
  hint: string;
  multiple?: boolean;
  disabled?: boolean;
  onPick: (files: FileList) => void;
  onRemove: (key: string) => void;
  onRetry: (key: string, file: File) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  if (item) return <Thumb item={item} label={label} onRemove={onRemove} onRetry={onRetry} />;
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        if (e.dataTransfer.files.length && !disabled) onPick(e.dataTransfer.files);
      }}
      className={clsx(
        "group relative flex aspect-[4/3] flex-col justify-between rounded-2xl p-3.5 text-carbon ring-1 transition-[box-shadow,background-color] duration-300",
        drag ? "bg-ion/15 ring-2 ring-ion-deep" : "bg-pearl-50 ring-carbon/12 hover:ring-carbon/35",
        disabled && "opacity-50",
      )}
    >
      <span className="flex items-center justify-between">
        <span aria-hidden className="grid size-9 place-items-center rounded-xl bg-carbon text-pearl-50 transition-transform duration-500 ease-glide group-hover:scale-105">
          <CameraIcon />
        </span>
        <span className="font-mono text-[0.7rem] text-carbon-3">{index ? `0${index}` : "+"}</span>
      </span>
      <span>
        <span className="block text-[0.9rem] leading-tight font-semibold">{label}</span>
        <span className="mt-1 block text-[0.75rem] leading-snug text-carbon-3">{hint}</span>
      </span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => input.current?.click()}
        className="absolute inset-0 rounded-2xl focus-visible:ring-2 focus-visible:ring-ion-deep focus-visible:outline-none"
        aria-label={`Add photo: ${label}`}
      />
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        multiple={multiple}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          if (e.target.files?.length) onPick(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function Thumb({ item, label, onRemove, onRetry }: { item: Item; label?: string; onRemove: (key: string) => void; onRetry: (key: string, file: File) => void }) {
  return (
    <figure className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-night-800 text-chalk">
      {item.preview ? (
        // Object-URL preview of the seller's own file; next/image is not appropriate here.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.preview} alt={label ?? "Uploaded photo"} className="size-full object-cover" />
      ) : (
        <div className="grid size-full place-items-center text-xs text-chalk-3">Photo saved</div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-night-950/90 to-transparent p-2.5 pt-8">
        {label ? <p className="truncate text-[0.78rem] font-semibold">{label}</p> : null}
        {item.status === "uploading" || item.status === "preparing" ? (
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/20" role="progressbar" aria-valuenow={Math.round(item.progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Upload progress">
            <div className="h-full origin-left bg-ion transition-transform duration-200 ease-out" style={{ transform: `scaleX(${Math.max(0.06, item.progress)})` }} />
          </div>
        ) : item.status === "error" ? (
          <p className="mt-1 text-[0.72rem] leading-snug text-alert">{item.error}</p>
        ) : (
          <p className="mt-0.5 flex items-center gap-1 text-[0.72rem] text-ion">
            <svg viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M2.5 6.5l2.2 2.2L9.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Uploaded
          </p>
        )}
      </div>
      <div className="absolute top-2 right-2 flex gap-1.5">
        {item.status === "error" && item.file ? (
          <button type="button" onClick={() => onRetry(item.key, item.file!)} className="rounded-full bg-night-950/80 px-2.5 py-1 text-xs backdrop-blur transition-colors duration-150 hover:bg-night-950">
            Retry
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onRemove(item.key)}
          className="grid size-7 place-items-center rounded-full bg-night-950/80 backdrop-blur transition-[background-color,transform] duration-200 hover:bg-night-950 active:scale-[0.94]"
          aria-label={`Remove ${label ?? "photo"}`}
        >
          <svg viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
            <path d="M3 3l6 6M9 3l-6 6" />
          </svg>
        </button>
      </div>
    </figure>
  );
}
