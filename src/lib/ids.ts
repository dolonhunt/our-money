/** Deterministic ids enable idempotent writes (notifications, recurring instances). */

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no confusing chars (0/O, 1/I/L)

export function randomCode(length = 6): string {
  let out = "";
  const cryptoObj = typeof crypto !== "undefined" ? crypto : undefined;
  if (cryptoObj?.getRandomValues) {
    const buf = new Uint32Array(length);
    cryptoObj.getRandomValues(buf);
    for (let i = 0; i < length; i++) out += ALPHABET[buf[i] % ALPHABET.length];
  } else {
    for (let i = 0; i < length; i++) out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

export function deterministicId(...parts: (string | number)[]): string {
  return parts.join("__").replace(/[^A-Za-z0-9_\-]/g, "_");
}
