import { describe, expect, it } from "vitest";
import { DEMO_ACCOUNTS } from "@/features/climbers/demo-accounts";
import { getTestLogins } from "./demo-logins";

const groups = getTestLogins();
const all = groups.flatMap((g) => g.logins);
const real = all.filter((l) => l.username.includes("@"));
const demo = all.filter((l) => !l.username.includes("@"));

describe("getTestLogins", () => {
  it("lists the front desk first, with the password the demo login expects", () => {
    expect(groups[0].title).toContain("Front desk");
    expect(groups[0].logins).toEqual([expect.objectContaining({ username: "desk", password: "desk" })]);
  });

  it("lists every demo climber by waiver and membership", () => {
    const listed = groups.find((g) => g.title.startsWith("Climbers by waiver"))!.logins.map((l) => l.username);
    expect(listed).toEqual(DEMO_ACCOUNTS.map((d) => d.username));
  });

  it("uses the username as the password for every demo login, as demo mode does", () => {
    for (const l of demo) expect(l.password).toBe(l.username);
  });

  it("names climbers as first.last, lowercase", () => {
    const named = groups.find((g) => g.title === "Climbers by name")!.logins;
    expect(named.length).toBeGreaterThan(0);
    for (const l of named) expect(l.username).toMatch(/^[a-z]+\.[a-z]+$/);
  });

  it("never writes down the real logins' password, only where it comes from", () => {
    expect(real.map((l) => l.username)).toEqual(["desk@elevate.test", "climber@elevate.test"]);
    for (const l of real) expect(l.password).toBe("SEED_LOGIN_PASSWORD");
  });

  it("gives every login a username, password and note", () => {
    for (const l of all) {
      expect(l.username).not.toBe("");
      expect(l.password).not.toBe("");
      expect(l.note).not.toBe("");
    }
  });
});
