import { ScrollTrigger } from "@/lib/motion";

const VARS = ["--word-top", "--car-c", "--car-max-h"] as const;

/**
 * Phones and tablets: a hero's backdrop word and vehicle sit in the room its
 * headline and registration form leave between them (the "band"), measured
 * live, so nothing collides on a short screen. The word heads the group and the
 * vehicle overlaps its lower half; when the band is tight the vehicle is capped
 * in height instead of spilling over the copy. Desktop keeps its CSS layout.
 *
 * Reads the `band`, `word` and `car` parts (data-s) inside `root` and writes
 * `--word-top`, `--car-c` (the vehicle's centre) and `--car-max-h` onto it, all
 * in px from the top of the stage. Returns a cleanup function.
 */
export function trackHeroBand(root: HTMLElement, overlap = 0.55) {
  const part = (name: string) => root.querySelector<HTMLElement>(`[data-s="${name}"]`);
  const band = part("band");
  const word = part("word");
  const car = part("car");
  if (!band || !word || !car) return;
  let last = "";
  /** Returns true when the placement changed. */
  const place = () => {
    if (window.innerWidth >= 1024) {
      VARS.forEach((v) => root.style.removeProperty(v));
      const changed = last !== "";
      last = "";
      return changed;
    }
    // The band and the stage both start at the top of the section, so offsets line up.
    const top = band.offsetTop;
    const wordH = word.offsetHeight;
    const maxH = Math.max(band.offsetHeight - wordH * overlap, window.innerHeight * 0.22);
    root.style.setProperty("--car-max-h", `${maxH}px`);
    const h = car.offsetHeight;
    // Spare room goes mostly below the group, so it reads as one unit under the headline.
    const groupTop = top + Math.max(0, maxH - h) * 0.4;
    const centre = groupTop + wordH * overlap + h / 2;
    root.style.setProperty("--word-top", `${groupTop}px`);
    root.style.setProperty("--car-c", `${centre}px`);
    const key = `${Math.round(groupTop)}|${Math.round(centre)}|${Math.round(maxH)}`;
    const changed = key !== last;
    last = key;
    return changed;
  };
  place();
  // Re-measure when the copy or the word reflows (web fonts arriving, rotation). The car's resting
  // place moves with it, so scroll positions measured from the old one are recalculated too.
  let queued = 0;
  const ro = new ResizeObserver(() => {
    if (place() && !queued) {
      queued = requestAnimationFrame(() => {
        queued = 0;
        ScrollTrigger.refresh();
      });
    }
  });
  ro.observe(band);
  ro.observe(word);
  // A refresh triggered elsewhere (a resize) re-measures first; it's already recalculating.
  const onRefreshInit = () => void place();
  ScrollTrigger.addEventListener("refreshInit", onRefreshInit);
  return () => {
    ro.disconnect();
    cancelAnimationFrame(queued);
    ScrollTrigger.removeEventListener("refreshInit", onRefreshInit);
  };
}

/**
 * Phones and tablets: where a pinned vehicle rises to (offset from its resting
 * centre, and scale) to sit in the room between the nav and a block of copy
 * that rests 6rem above the bottom of the screen. When there's barely any room
 * it fades away instead of squeezing under the nav.
 */
export function fitAbove(block: HTMLElement, car: HTMLElement, restCentre: number, maxScale: number) {
  const top = 84;
  const room = Math.max(0, window.innerHeight - 96 - block.offsetHeight - top);
  const scale = Math.min(maxScale, (room * 0.9) / car.offsetHeight);
  return { y: top + room / 2 - restCentre, scale: Math.max(scale, 0.38), opacity: scale < 0.38 ? 0 : 1 };
}
