import crypto from "node:crypto";

const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

export function newId(prefix = ""): string {
  const bytes = crypto.randomBytes(12);
  let s = "";
  for (const b of bytes) s += ALPHABET[b % ALPHABET.length];
  return prefix ? `${prefix}_${s}` : s;
}
