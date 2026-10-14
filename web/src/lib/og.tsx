import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const OG_SIZE = { width: 1200, height: 630 };

/** Fetch a Google font subset as TTF for ImageResponse; falls back to the default font. */
async function googleFont(family: string, text: string, axes = "") {
  try {
    const css = await (
      await fetch(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}${axes}&text=${encodeURIComponent(text)}`, {
        signal: AbortSignal.timeout(4000),
      })
    ).text();
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    return await (await fetch(url, { signal: AbortSignal.timeout(4000) })).arrayBuffer();
  } catch {
    return null;
  }
}

async function carCutout() {
  try {
    const png = await readFile(join(process.cwd(), "public/media/og/hero-side.png"));
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * Social card in the site's opening language: a giant word fading into the
 * dark, the car standing in front of it and the headline underneath, with any
 * *starred* words in the quieter tone.
 */
export async function ogImage({ title, word = "Electric" }: { title: string; word?: string }) {
  const words = title
    .split(/(\*[^*]+\*)/g)
    .filter(Boolean)
    .flatMap((part) => {
      const em = part.startsWith("*");
      return part
        .replace(/\*/g, "")
        .split(/\s+/)
        .filter(Boolean)
        .map((text) => ({ text, em }));
    });
  const plain = title.replace(/\*/g, "");
  const big = word.toUpperCase();
  const brand = site.brand.fullName.toUpperCase();
  const [display, heavy, car] = await Promise.all([
    googleFont("Archivo", `${plain} ${brand}`, ":wdth,wght@104,500"),
    googleFont("Archivo", big, ":wdth,wght@125,800"),
    carCutout(),
  ]);
  const fonts = [
    display && { name: "Archivo", data: display, style: "normal" as const, weight: 500 as const },
    heavy && { name: "ArchivoWide", data: heavy, style: "normal" as const, weight: 800 as const },
  ].filter(Boolean) as Array<{ name: string; data: ArrayBuffer; style: "normal"; weight: 500 | 800 }>;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "radial-gradient(60% 60% at 50% 0%, #1b1d20, #050607 75%)",
          color: "#efede8",
          fontFamily: "Archivo",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 36,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            fontFamily: "ArchivoWide",
            fontSize: big.length > 5 ? 190 : 260,
            fontWeight: 800,
            letterSpacing: -6,
            lineHeight: 0.85,
            color: "transparent",
            backgroundImage: "linear-gradient(180deg, rgba(239,237,232,0.95) 0%, rgba(239,237,232,0.5) 48%, rgba(239,237,232,0.04) 92%)",
            backgroundClip: "text",
          }}
        >
          {big}
        </div>
        {car ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={car} width={820} height={280} alt="" style={{ position: "absolute", top: 150, left: 190 }} />
        ) : null}
        <div style={{ position: "absolute", left: 64, right: 64, bottom: 54, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ maxWidth: 760, display: "flex", flexWrap: "wrap", fontSize: 52, fontWeight: 500, letterSpacing: -1.6, lineHeight: 1.05 }}>
            {words.map((w, i) => (
              <span key={i} style={{ color: w.em ? "#6f7379" : "#efede8", marginRight: i < words.length - 1 ? 13 : 0 }}>
                {w.text}
              </span>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", fontSize: 15, letterSpacing: 3, color: "#a7aaaf" }}>
            <div style={{ width: 10, height: 10, borderRadius: 10, background: "#9df0c4", marginRight: 12 }} />
            {brand}
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: fonts.length ? fonts : undefined },
  );
}
