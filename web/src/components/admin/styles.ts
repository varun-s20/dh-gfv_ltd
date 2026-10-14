import { clsx } from "clsx";

/**
 * Class recipes shared by server and client admin components (a plain module,
 * so Server Components can call these too).
 */

const field =
  "block w-full rounded-lg border border-ink/15 bg-white text-[0.95rem] text-ink shadow-[0_1px_0_rgb(13_19_17/0.04)] transition-[border-color,box-shadow] duration-150 placeholder:text-slate/50 hover:border-ink/30 focus:border-racing focus:outline-none focus:ring-4 focus:ring-racing/12 disabled:cursor-not-allowed disabled:bg-paper disabled:text-slate aria-[invalid=true]:border-signal aria-[invalid=true]:focus:ring-signal/15";

export const inputClass = (className?: string) => clsx(field, "h-10 px-3", className);
export const textareaClass = (className?: string) => clsx(field, "min-h-24 px-3 py-2.5 leading-relaxed", className);
export const selectClass = (className?: string) =>
  clsx(
    field,
    "h-10 cursor-pointer appearance-none bg-[length:16px] bg-[right_0.6rem_center] bg-no-repeat pr-9 pl-3",
    "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='%234f5b56' stroke-width='1.6'%3E%3Cpath d='M4 6l4 4 4-4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")]",
    className,
  );

export const labelClass = "block text-sm font-medium text-ink";
export const hintClass = "mt-1 text-xs leading-relaxed text-slate";

type Variant = "primary" | "plate" | "secondary" | "ghost" | "danger" | "dark-ghost";
type Size = "xs" | "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-racing text-ivory hover:bg-moss shadow-[0_1px_0_rgb(255_255_255/0.08)_inset]",
  plate:
    "bg-plate text-ink shadow-[inset_0_0_0_1.5px_rgb(13_19_17/0.9)] hover:bg-plate-deep hover:shadow-[inset_0_0_0_1.5px_rgb(13_19_17/1),0_0_0_4px_rgb(255_210_31/0.22)]",
  secondary: "bg-white text-ink shadow-[inset_0_0_0_1px_rgb(13_19_17/0.16)] hover:bg-bone hover:shadow-[inset_0_0_0_1px_rgb(13_19_17/0.4)]",
  ghost: "text-ink hover:bg-ink/[0.05]",
  danger: "bg-white text-signal shadow-[inset_0_0_0_1px_rgb(180_35_24/0.3)] hover:bg-signal-soft",
  "dark-ghost": "text-ivory/85 hover:bg-white/[0.07] hover:text-ivory",
};

const sizes: Record<Size, string> = {
  xs: "h-7 gap-1.5 px-2.5 text-xs",
  sm: "h-8 gap-1.5 px-3 text-[0.82rem]",
  md: "h-10 gap-2 px-4 text-sm",
  lg: "h-12 gap-2.5 px-6 text-[0.95rem]",
};

export function btn(variant: Variant = "secondary", size: Size = "md", className?: string) {
  return clsx(
    "inline-flex shrink-0 items-center justify-center rounded-full font-medium whitespace-nowrap transition-[background-color,color,box-shadow,transform] duration-150 select-none active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
    variants[variant],
    sizes[size],
    className,
  );
}

export const cardClass = (className?: string) =>
  clsx("rounded-2xl border border-ink/[0.09] bg-bone shadow-[0_1px_2px_rgb(13_19_17/0.04),0_10px_30px_-22px_rgb(13_19_17/0.35)]", className);

export const pillBase = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.75rem] font-medium leading-5 whitespace-nowrap ring-1 ring-inset";

export const tableWrap = "-mx-px overflow-x-auto overscroll-x-contain [scrollbar-width:thin]";
export const th = "px-4 py-2.5 text-left font-mono text-[0.68rem] font-normal tracking-[0.12em] text-slate uppercase whitespace-nowrap";
export const td = "px-4 py-3 align-middle";
