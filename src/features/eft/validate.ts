import type { BankAccountField, BankAccountInput } from "./types";

// Canadian account details, as printed on a cheque: transit (branch) number
// 5 digits, institution (bank) number 3 digits, account number 7 to 12 digits.
// Spaces and dashes people copy from a void cheque are allowed and dropped.

export type CleanBankAccount = {
  holderName: string;
  transitNumber: string;
  institutionNumber: string;
  accountNumber: string;
};

export type Validation =
  | { ok: true; value: CleanBankAccount }
  | { ok: false; errors: Partial<Record<BankAccountField, string>> };

const MAX_NAME = 100;
const digits = (v: unknown) => String(v ?? "").replace(/[\s-]/g, "");

export function validateBankAccount(input: BankAccountInput): Validation {
  const errors: Partial<Record<BankAccountField, string>> = {};
  const holderName = String(input?.holderName ?? "").trim().replace(/\s+/g, " ");
  const transitNumber = digits(input?.transitNumber);
  const institutionNumber = digits(input?.institutionNumber);
  const accountNumber = digits(input?.accountNumber);

  if (holderName === "") errors.holderName = "Enter the name on the account.";
  else if (holderName.length > MAX_NAME) errors.holderName = `Keep the name under ${MAX_NAME} characters.`;
  if (!/^\d{5}$/.test(transitNumber)) errors.transitNumber = "Enter the 5-digit transit number, like 01234.";
  if (!/^\d{3}$/.test(institutionNumber)) {
    errors.institutionNumber = "Enter the 3-digit institution number, like 003.";
  }
  if (!/^\d{7,12}$/.test(accountNumber)) errors.accountNumber = "Enter the account number, 7 to 12 digits.";
  if (input?.authorized !== true) errors.authorized = "Agree to the pre-authorized debit to save the account.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { holderName, transitNumber, institutionNumber, accountNumber } };
}
