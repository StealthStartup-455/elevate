import { describe, expect, it } from "vitest";
import { parseCustomerSignup } from "./signup";

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

const valid = {
  firstName: "Alex",
  lastName: "Climber",
  studentId: "V00123456",
  phone: "250-555-0100",
  email: "ALEX@example.com",
  password: "password1",
  dateOfBirth: "1998-06-15",
};

describe("customer sign-up validation", () => {
  it("keeps the complete customer profile for a future gym join", () => {
    expect(parseCustomerSignup(form(valid))).toEqual({
      ok: true,
      value: {
        email: "alex@example.com",
        password: "password1",
        profile: {
          firstName: "Alex",
          lastName: "Climber",
          studentId: "V00123456",
          phone: "+12505550100",
          email: "alex@example.com",
          dateOfBirth: "1998-06-15",
        },
      },
    });
  });

  it("refuses a missing profile field", () => {
    expect(parseCustomerSignup(form({ ...valid, phone: "" }))).toMatchObject({
      ok: false, errors: { phone: "Enter a phone number." },
    });
  });

  it("accepts a non-empty password without a length rule", () => {
    expect(parseCustomerSignup(form({ ...valid, password: "x" }))).toMatchObject({ ok: true });
  });

  it("reports phone, date, email, and password errors separately without echoing the password", () => {
    const result = parseCustomerSignup(form({
      ...valid, phone: "12", dateOfBirth: "2026-02-31", email: "invalid", password: "",
    }));
    expect(result).toMatchObject({
      ok: false,
      errors: {
        phone: expect.any(String), dateOfBirth: expect.any(String),
        email: expect.any(String), password: expect.any(String),
      },
    });
    expect(result).not.toHaveProperty("values.password");
  });
});
