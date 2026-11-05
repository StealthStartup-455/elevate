import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

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
