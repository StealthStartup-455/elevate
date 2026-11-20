import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

function deriveKey(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, KEY_LENGTH, (error, key) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(key);
    });
  });
}

export async function hashDemoPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = await deriveKey(password, salt);
  return `${salt}:${hash.toString("hex")}`;
}

export async function verifyDemoPassword(password: string, stored: string): Promise<boolean> {
  const [salt, expectedHash] = stored.split(":");
  if (!salt || !expectedHash) return false;

  const expected = Buffer.from(expectedHash, "hex");
  if (expected.length !== KEY_LENGTH) return false;

  const actual = await deriveKey(password, salt);
  return timingSafeEqual(actual, expected);
}

export function signDemoDeskSession(
  owner: { id: string; demoPasswordHash: string },
  now = Date.now(),
): string {
  const payload = `${owner.id}.${now + 30 * 24 * 60 * 60 * 1000}`;
  const signature = createHmac("sha256", owner.demoPasswordHash).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

export function verifyDemoDeskSession(token: string, passwordHash: string, now = Date.now()): boolean {
  const [id, expires, signature, extra] = token.split(".");
  if (!id || !expires || !signature || extra || !/^[0-9a-f]{64}$/.test(signature)) return false;
  if (!Number.isSafeInteger(Number(expires)) || Number(expires) <= now) return false;
  const expected = createHmac("sha256", passwordHash).update(`${id}.${expires}`).digest();
  return timingSafeEqual(Buffer.from(signature, "hex"), expected);
}
