import { eq } from "drizzle-orm";
import { z } from "zod";
import { apiAdmin, json } from "@/lib/admin/api";
import { getDb, schema } from "@/lib/db/client";
import { storage } from "@/lib/storage";

const INLINE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

/**
 * Seller photos, for signed-in admins only.
 *
 * Inline views stream the bytes from storage with `Cache-Control: private` so
 * nothing is cached by shared proxies. `?download=1` redirects to a short-lived
 * signed URL when the storage driver offers one (S3/R2), which avoids proxying
 * large originals; inline <img> requests are always streamed because the
 * site's Content-Security-Policy only allows images from this origin.
 */
export async function GET(request: Request, { params }: { params: Promise<{ photoId: string }> }) {
  const { response } = await apiAdmin();
  if (response) return response;

  const { photoId } = await params;
  if (!z.uuid().safeParse(photoId).success) return json({ error: "Not found" }, 404);

  const db = await getDb();
  const [photo] = await db.select().from(schema.leadPhotos).where(eq(schema.leadPhotos.id, photoId)).limit(1);
  if (!photo) return json({ error: "Not found" }, 404);

  const download = new URL(request.url).searchParams.get("download") === "1";
  const store = storage();
  const ext = photo.storageKey.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || "jpg";
  const filename = `${photo.slot ?? "photo"}-${photo.id.slice(0, 8)}.${ext}`;

  if (download && store.signedUrl) {
    try {
      const url = await store.signedUrl(photo.storageKey, 120);
      return new Response(null, { status: 302, headers: { Location: url, "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
    } catch (error) {
      console.error("[admin/photos] signing failed, streaming instead", error);
    }
  }

  const object = await store.get(photo.storageKey);
  if (!object) return json({ error: "The file is missing from storage." }, 404);

  const type = INLINE_TYPES.has(photo.contentType) ? photo.contentType : "application/octet-stream";
  return new Response(object.body as BodyInit, {
    headers: {
      "Content-Type": type,
      "Content-Length": String(object.body.byteLength),
      "Content-Disposition": `${download || type === "application/octet-stream" ? "attachment" : "inline"}; filename="${filename}"`,
      "Cache-Control": "private, max-age=600",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
