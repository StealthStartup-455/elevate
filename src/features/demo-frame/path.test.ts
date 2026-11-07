import { describe, expect, it } from "vitest";
import { appPath } from "./path";

describe("appPath", () => {
  it("opens the home page when no path is given", () => {
    expect(appPath(undefined)).toBe("/");
    expect(appPath([])).toBe("/");
  });

  it("joins the segments into an app path", () => {
    expect(appPath(["me"])).toBe("/me");
    expect(appPath(["me", "classes"])).toBe("/me/classes");
    expect(appPath(["desk", "customers", "abc-123"])).toBe("/desk/customers/abc-123");
  });

  it("keeps the query string", () => {
    expect(appPath(["me", "classes"], { view: "events" })).toBe("/me/classes?view=events");
    expect(appPath(["me"], { a: ["1", "2"], b: undefined })).toBe("/me?a=1&a=2");
  });

  it("refuses anything that could leave the site", () => {
    expect(appPath(["..", "etc"])).toBe("/");
    expect(appPath(["", "evil.com"])).toBe("/");
    expect(appPath(["%2F%2Fevil.com"])).toBe("/");
    expect(appPath(["a%5Cb"])).toBe("/");
    expect(appPath(["%E0%A4%A"])).toBe("/");
  });

  it("does not put a frame inside a frame", () => {
    expect(appPath(["demo", "me"])).toBe("/");
    expect(appPath(["demo-phone"])).toBe("/");
    expect(appPath(["Demo-Phone", "me"])).toBe("/");
  });
});
