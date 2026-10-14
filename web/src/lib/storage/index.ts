import "server-only";

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { AwsClient } from "aws4fetch";

/**
 * Private object storage for seller photos.
 * - STORAGE_DRIVER=s3 → any S3-compatible bucket (AWS S3, Cloudflare R2, Supabase Storage S3).
 * - otherwise        → local disk under .data/uploads (development only).
 * Objects are never public; the admin views them through an authenticated route.
 */
export interface Storage {
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<{ body: Uint8Array; contentType: string } | null>;
  remove(key: string): Promise<void>;
  /** Short-lived URL for direct download, when the driver supports it. */
  signedUrl?(key: string, expiresSeconds?: number): Promise<string>;
}

const contentTypeByExt: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
};

function safeKey(key: string) {
  if (!/^[a-z0-9/_.-]+$/i.test(key) || key.includes("..")) throw new Error("Invalid storage key");
  return key;
}

class LocalStorage implements Storage {
  private root = path.join(process.cwd(), ".data", "uploads");
  private file(key: string) {
    return path.join(this.root, ...safeKey(key).split("/"));
  }
  async put(key: string, body: Uint8Array) {
    const file = this.file(key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body);
  }
  async get(key: string) {
    try {
      const body = await readFile(this.file(key));
      const ext = key.split(".").pop()?.toLowerCase() ?? "";
      return { body: new Uint8Array(body), contentType: contentTypeByExt[ext] ?? "application/octet-stream" };
    } catch {
      return null;
    }
  }
  async remove(key: string) {
    await rm(this.file(key), { force: true });
  }
}

class S3Storage implements Storage {
  private client: AwsClient;
  private base: string;
  constructor() {
    const endpoint = required("S3_ENDPOINT").replace(/\/$/, "");
    const bucket = required("S3_BUCKET");
    this.client = new AwsClient({
      accessKeyId: required("S3_ACCESS_KEY_ID"),
      secretAccessKey: required("S3_SECRET_ACCESS_KEY"),
      region: process.env.S3_REGION ?? "auto",
      service: "s3",
    });
    this.base = `${endpoint}/${bucket}`;
  }
  private url(key: string) {
    return `${this.base}/${safeKey(key)}`;
  }
  async put(key: string, body: Uint8Array, contentType: string) {
    const res = await this.client.fetch(this.url(key), {
      method: "PUT",
      body: body as BodyInit,
      headers: { "content-type": contentType, "cache-control": "private, max-age=0" },
    });
    if (!res.ok) throw new Error(`Storage upload failed (${res.status})`);
  }
  async get(key: string) {
    const res = await this.client.fetch(this.url(key));
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Storage read failed (${res.status})`);
    return {
      body: new Uint8Array(await res.arrayBuffer()),
      contentType: res.headers.get("content-type") ?? "application/octet-stream",
    };
  }
  async remove(key: string) {
    await this.client.fetch(this.url(key), { method: "DELETE" });
  }
  async signedUrl(key: string, expiresSeconds = 300) {
    const url = new URL(this.url(key));
    url.searchParams.set("X-Amz-Expires", String(expiresSeconds));
    const signed = await this.client.sign(url.toString(), { method: "GET", aws: { signQuery: true } });
    return signed.url;
  }
}

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required when STORAGE_DRIVER=s3`);
  return value;
}

let instance: Storage | undefined;
export function storage(): Storage {
  instance ??= process.env.STORAGE_DRIVER === "s3" ? new S3Storage() : new LocalStorage();
  return instance;
}

/** Identify an image from its first bytes; never trust the browser's type or name. */
export function sniffImage(bytes: Uint8Array): { contentType: string; ext: string } | null {
  const b = bytes;
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { contentType: "image/jpeg", ext: "jpg" };
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { contentType: "image/png", ext: "png" };
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return { contentType: "image/webp", ext: "webp" };
  if (ascii(4, 8) === "ftyp") {
    const brand = ascii(8, 12);
    if (["heic", "heix", "hevc", "hevx", "heim", "heis"].includes(brand)) return { contentType: "image/heic", ext: "heic" };
    if (["mif1", "msf1", "avif"].includes(brand)) return { contentType: "image/heif", ext: "heif" };
  }
  return null;
}
