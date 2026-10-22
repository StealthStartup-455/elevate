import { afterEach, describe, expect, it, vi } from "vitest";
import { errorFields, logError, logEvent, logWarning } from "./log";

const NOW = new Date("2026-10-20T18:00:00.000Z");

afterEach(() => vi.restoreAllMocks());

function captured(spy: ReturnType<typeof vi.spyOn>) {
  expect(spy).toHaveBeenCalledTimes(1);
  return JSON.parse(String(spy.mock.calls[0][0]));
}

describe("log", () => {
  it("writes one JSON line per event with level, event and time", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    logEvent("check_in_saved", { climberId: "c1", method: "FRONT_DESK" }, NOW);
    expect(captured(spy)).toEqual({
      level: "info",
      event: "check_in_saved",
      time: "2026-10-20T18:00:00.000Z",
      climberId: "c1",
      method: "FRONT_DESK",
    });
  });

  it("leaves out fields that are undefined", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    logEvent("login_succeeded", { role: "desk", climberId: undefined }, NOW);
    expect(captured(spy)).not.toHaveProperty("climberId");
  });

  it("writes warnings to stderr at level warn", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    logWarning("scan_climber_missing", { climberId: "c1" }, NOW);
    expect(captured(spy).level).toBe("warn");
  });

  it("includes the error's name, message, digest and the top of the stack", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = Object.assign(new Error("connection refused"), { digest: "123abc" });
    logError("server_error", error, { path: "/desk" }, NOW);
    const out = captured(spy);
    expect(out).toMatchObject({
      level: "error",
      event: "server_error",
      path: "/desk",
      errorName: "Error",
      errorMessage: "connection refused",
      digest: "123abc",
    });
    expect(out.stack.split("\n").length).toBeLessThanOrEqual(6);
  });

  it("handles things thrown that aren't errors", () => {
    expect(errorFields("boom")).toEqual({ errorMessage: "boom" });
  });
});
