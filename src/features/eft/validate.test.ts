import { describe, expect, it } from "vitest";
import { accountLabel, bankName } from "./banks";
import { validateBankAccount } from "./validate";

const good = {
  holderName: "  Kim   Lee ",
  transitNumber: "01234",
  institutionNumber: "003",
  accountNumber: "1234-567 890",
  authorized: true,
};

describe("validateBankAccount", () => {
  it("cleans up a good account", () => {
    expect(validateBankAccount(good)).toEqual({
      ok: true,
      value: { holderName: "Kim Lee", transitNumber: "01234", institutionNumber: "003", accountNumber: "1234567890" },
    });
  });

  it("needs every field and the agreement", () => {
    const result = validateBankAccount({
      holderName: " ",
      transitNumber: "1234",
      institutionNumber: "03",
      accountNumber: "123456",
      authorized: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual(
        ["accountNumber", "authorized", "holderName", "institutionNumber", "transitNumber"].sort(),
      );
    }
  });

  it("refuses letters and over-long account numbers", () => {
    expect(validateBankAccount({ ...good, transitNumber: "0123a" }).ok).toBe(false);
    expect(validateBankAccount({ ...good, accountNumber: "1234567890123" }).ok).toBe(false);
  });

  it("only takes a real true for the agreement", () => {
    expect(validateBankAccount({ ...good, authorized: "true" as unknown as boolean }).ok).toBe(false);
  });

  it("survives a made-up request", () => {
    expect(validateBankAccount(null as never).ok).toBe(false);
  });
});

describe("accountLabel", () => {
  it("names known banks and shows only the last four", () => {
    expect(accountLabel("003", "7890")).toBe("RBC ••••7890");
    expect(bankName("999")).toBe("Bank 999");
  });
});
