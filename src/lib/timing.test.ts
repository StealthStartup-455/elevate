import { afterEach, describe, expect, it, vi } from "vitest";
import { timed } from "./timing";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function clockOf(...times: number[]) {
  return () => times.shift() ?? 0;
}

function logged(spy: ReturnType<typeof vi.spyOn>) {
  return spy.mock.calls.map((call: unknown[]) => JSON.parse(String(call[0])));
}

describe("timed", () => {
  it("logs the step and how long it took when PERF_LOG is on", async () => {
    vi.stubEnv("PERF_LOG", "true");
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    const result = await timed("perf_db", { model: "Climber", operation: "findMany" }, async () => 42, clockOf(100, 137.4));
    expect(result).toBe(42);
    expect(logged(spy)).toEqual([
      expect.objectContaining({ event: "perf_db", model: "Climber", operation: "findMany", ms: 37 }),
    ]);
  });

  it("still logs when the step throws, and passes the error on", async () => {
    vi.stubEnv("PERF_LOG", "true");
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    await expect(
      timed("perf_auth", { where: "page" }, async () => {
        throw new Error("down");
      }, clockOf(0, 5)),
    ).rejects.toThrow("down");
    expect(logged(spy)).toEqual([expect.objectContaining({ event: "perf_auth", ms: 5 })]);
  });

  it("logs nothing when PERF_LOG is off", async () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    expect(await timed("perf_db", {}, async () => "ok")).toBe("ok");
    expect(spy).not.toHaveBeenCalled();
  });
});
