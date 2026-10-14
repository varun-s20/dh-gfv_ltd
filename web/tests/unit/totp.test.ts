import { describe, expect, it } from "vitest";
import { __test, generateTotpSecret, verifyTotp } from "@/lib/auth/totp";

describe("TOTP", () => {
  // RFC 6238 appendix B test secret "12345678901234567890" (ASCII) in base32.
  const rfcSecret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

  it("matches the RFC 6238 SHA-1 test vectors", () => {
    const key = __test.base32Decode(rfcSecret);
    expect(__test.hotp(key, Math.floor(59 / 30))).toBe("287082");
    expect(__test.hotp(key, Math.floor(1111111109 / 30))).toBe("081804");
    expect(__test.hotp(key, Math.floor(1234567890 / 30))).toBe("005924");
  });

  it("verifies the current code and tolerates one step of drift", () => {
    const now = 1_700_000_000_000;
    const key = __test.base32Decode(rfcSecret);
    const code = __test.hotp(key, Math.floor(now / 1000 / 30) - 1);
    expect(verifyTotp(rfcSecret, code, now)).toBe(true);
    expect(verifyTotp(rfcSecret, "000000", now)).toBe(false);
    expect(verifyTotp(rfcSecret, "abc", now)).toBe(false);
  });

  it("generates base32 secrets", () => {
    expect(generateTotpSecret()).toMatch(/^[A-Z2-7]{32}$/);
  });
});
