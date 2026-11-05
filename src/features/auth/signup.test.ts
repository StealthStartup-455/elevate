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
  phone: "250-555-0100",
  email: "ALEX@example.com",
  password: "password1",
  dateOfBirth: "1998-06-15",
};

describe("customer sign-up validation", () => {
  it("keeps the complete customer profile for a future gym join", () => {
    expect(parseCustomerSignup(form(valid))).toEqual({
      email: "alex@example.com",
      password: "password1",
      profile: {
        firstName: "Alex",
        lastName: "Climber",
        phone: "+12505550100",
        email: "alex@example.com",
        dateOfBirth: "1998-06-15",
      },
    });
  });

  it("refuses a missing profile field", () => {
    expect(parseCustomerSignup(form({ ...valid, phone: "" }))).toBeNull();
  });

  it("accepts a non-empty password without a length rule", () => {
    expect(parseCustomerSignup(form({ ...valid, password: "x" }))).not.toBeNull();
  });
});
