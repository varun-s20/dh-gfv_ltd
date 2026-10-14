import { randomUUID } from "node:crypto";
import { getDb, schema } from "@/lib/db/client";
import { uploadReceipt } from "@/lib/leads/service";
import { assertSameOrigin, rateLimit, requestContext } from "@/lib/security";
import { sniffImage, storage } from "@/lib/storage";

/** 8 MB after browser compression; HEIC originals are usually 1.5–4 MB. */
const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Seller photo upload. Files are stored privately under pending/ and a signed
 * receipt is returned; only receipts we issued can be attached to a lead.
 */
export async function POST(request: Request) {
  try {
    await assertSameOrigin();
  } catch (response) {
    return response as Response;
  }
  const { ipHash } = await requestContext();
  if (!(await rateLimit(`upload:${ipHash}`, 80, 60 * 60))) {
    return Response.json({ error: "Too many uploads. Please wait a few minutes and try again." }, { status: 429 });
  }

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BYTES + 64 * 1024) return Response.json({ error: "That photo is too large (8 MB maximum)." }, { status: 413 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Upload failed. Please try again." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "No photo received." }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "That photo is too large (8 MB maximum)." }, { status: 413 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffImage(bytes);
  if (!kind) return Response.json({ error: "Please upload a JPG, PNG, WebP or HEIC photo." }, { status: 415 });

  const width = Number(form.get("width")) || null;
  const height = Number(form.get("height")) || null;
  const id = randomUUID();
  const day = new Date().toISOString().slice(0, 10);
  const key = `pending/${day}/${id}.${kind.ext}`;

  try {
    await storage().put(key, bytes, kind.contentType);
    const db = await getDb();
    await db.insert(schema.pendingUploads).values({
      id,
      storageKey: key,
      contentType: kind.contentType,
      bytes: bytes.byteLength,
      width: width && width < 20000 ? width : null,
      height: height && height < 20000 ? height : null,
      ipHash,
    });
  } catch (error) {
    console.error("[uploads] store failed", error);
    return Response.json({ error: "We couldn't save that photo. Please try again." }, { status: 500 });
  }

  return Response.json({ id, receipt: uploadReceipt(id, key) }, { status: 201 });
}
