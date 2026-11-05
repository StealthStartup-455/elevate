import { describe, expect, it } from "vitest";
import { hashDemoPassword, verifyDemoPassword } from "./demo-credentials";

describe("demo owner credentials", () => {
  it("verifies the password that created the credential", async () => {
    const credential = await hashDemoPassword("any password");

    await expect(verifyDemoPassword("any password", credential)).resolves.toBe(true);
    await expect(verifyDemoPassword("another password", credential)).resolves.toBe(false);
  });

  it("rejects malformed credentials", async () => {
    await expect(verifyDemoPassword("password", "not-a-credential")).resolves.toBe(false);
  });
});
