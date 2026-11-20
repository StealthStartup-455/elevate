import { describe, expect, it } from "vitest";
import { hashDemoPassword, signDemoDeskSession, verifyDemoDeskSession, verifyDemoPassword } from "./demo-credentials";

describe("demo owner credentials", () => {
  it("verifies the password that created the credential", async () => {
    const credential = await hashDemoPassword("any password");

    await expect(verifyDemoPassword("any password", credential)).resolves.toBe(true);
    await expect(verifyDemoPassword("another password", credential)).resolves.toBe(false);
  });

  describe("demo owner desk session", () => {
    const owner = { id: "staff-one", demoPasswordHash: "server-only-credential" };
    const now = new Date("2026-11-18").getTime();

    it("checks the owner, expiry and credential and rejects edited cookies", () => {
      const token = signDemoDeskSession(owner, now);
      expect(verifyDemoDeskSession(token, owner.demoPasswordHash, now)).toBe(true);
      expect(verifyDemoDeskSession(token.replace("staff-one", "staff-two"), owner.demoPasswordHash, now)).toBe(false);
      expect(verifyDemoDeskSession(token, "changed-password", now)).toBe(false);
      expect(verifyDemoDeskSession(token, owner.demoPasswordHash, now + 31 * 86400000)).toBe(false);
      expect(verifyDemoDeskSession("gym-id", owner.demoPasswordHash, now)).toBe(false);
      expect(verifyDemoDeskSession(`${token}.extra`, owner.demoPasswordHash, now)).toBe(false);
    });
  });

  it("rejects malformed credentials", async () => {
    await expect(verifyDemoPassword("password", "not-a-credential")).resolves.toBe(false);
  });
});
