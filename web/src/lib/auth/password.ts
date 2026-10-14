import "server-only";

import { randomBytes } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";

// OWASP-recommended Argon2id parameters.
const ARGON = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export const hashPassword = (password: string) => hash(password, ARGON);
export const verifyPassword = (passwordHash: string, password: string) =>
  verify(passwordHash, password).catch(() => false);

/** Verify against a real throwaway hash so unknown emails take as long as wrong passwords. */
let dummyHash: Promise<string> | undefined;
export async function burnPasswordCheck(password: string) {
  dummyHash ??= hashPassword(randomBytes(16).toString("base64url"));
  await verifyPassword(await dummyHash, password);
  return false;
}
