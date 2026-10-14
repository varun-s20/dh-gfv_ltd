import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { hubSignature, nextMessageStatus, parseWebhook, verifyHubSignature } from "@/lib/admin/whatsapp";

const secret = "test-app-secret";
const body = JSON.stringify({ object: "whatsapp_business_account", entry: [] });
const sign = (raw: string, key = secret) => `sha256=${createHmac("sha256", key).update(raw).digest("hex")}`;

describe("X-Hub-Signature-256 verification", () => {
  it("accepts a correct signature over the raw body", () => {
    expect(verifyHubSignature(body, sign(body), secret)).toBe(true);
    expect(hubSignature(body, secret)).toBe(sign(body));
  });

  it("accepts upper-case hex", () => {
    const header = `sha256=${sign(body).slice(7).toUpperCase()}`;
    expect(verifyHubSignature(body, header, secret)).toBe(true);
  });

  it("rejects a tampered body", () => {
    expect(verifyHubSignature(`${body} `, sign(body), secret)).toBe(false);
  });

  it("rejects the wrong secret", () => {
    expect(verifyHubSignature(body, sign(body, "other"), secret)).toBe(false);
  });

  it("rejects missing or malformed headers and a missing secret", () => {
    expect(verifyHubSignature(body, null, secret)).toBe(false);
    expect(verifyHubSignature(body, "sha1=abc", secret)).toBe(false);
    expect(verifyHubSignature(body, "sha256=xyz", secret)).toBe(false);
    expect(verifyHubSignature(body, `${sign(body)}00`, secret)).toBe(false);
    expect(verifyHubSignature(body, sign(body), undefined)).toBe(false);
    expect(verifyHubSignature(body, sign(body), "")).toBe(false);
  });

  it("works on raw bytes", () => {
    const bytes = new TextEncoder().encode(body);
    expect(verifyHubSignature(bytes, sign(body), secret)).toBe(true);
  });
});

describe("webhook payload parsing", () => {
  const payload = {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "WABA",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              statuses: [
                { id: "wamid.1", status: "delivered", timestamp: "1760000000", recipient_id: "447700900123" },
                { id: "wamid.2", status: "failed", errors: [{ code: 131026, title: "Message undeliverable" }] },
                { id: "wamid.3", status: "deleted" },
              ],
              contacts: [{ wa_id: "447700900123", profile: { name: "Test Seller" } }],
              messages: [
                { id: "wamid.in1", from: "447700900123", timestamp: "1760000100", type: "text", text: { body: "Is the offer still open?" } },
                { id: "wamid.in2", from: "447700900123", type: "image" },
              ],
            },
          },
        ],
      },
    ],
  };

  it("extracts delivery statuses we track and ignores others", () => {
    const { statuses } = parseWebhook(payload);
    expect(statuses.map((s) => [s.providerId, s.status])).toEqual([
      ["wamid.1", "delivered"],
      ["wamid.2", "failed"],
    ]);
    expect(statuses[0]?.at?.toISOString()).toBe("2025-10-09T08:53:20.000Z");
    expect(statuses[1]?.error).toBe("131026 Message undeliverable");
  });

  it("extracts inbound messages with the sender's name", () => {
    const { inbound } = parseWebhook(payload);
    expect(inbound).toHaveLength(2);
    expect(inbound[0]).toMatchObject({ from: "447700900123", name: "Test Seller", text: "Is the offer still open?" });
    expect(inbound[1]?.text).toBe("[image message]");
  });

  it("ignores junk", () => {
    expect(parseWebhook(null)).toEqual({ statuses: [], inbound: [] });
    expect(parseWebhook({ entry: "nope" })).toEqual({ statuses: [], inbound: [] });
  });

  it("only moves delivery status forward", () => {
    expect(nextMessageStatus("sent", "delivered")).toBe("delivered");
    expect(nextMessageStatus("read", "delivered")).toBe("read");
    expect(nextMessageStatus("delivered", "failed")).toBe("failed");
    expect(nextMessageStatus("failed", "read")).toBe("failed");
    expect(nextMessageStatus("queued", "sent")).toBe("sent");
  });
});
