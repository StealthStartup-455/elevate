import { beforeEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.hoisted(() => vi.fn());
vi.mock("./db", () => ({ db: { gym: { findUnique } } }));

import { forgetGym, GYM_CACHE_MS, loadGym } from "./gym";

beforeEach(() => {
  forgetGym();
  findUnique.mockReset();
  findUnique.mockResolvedValue({ id: "g1", slug: "demo-gym" });
});

describe("loadGym", () => {
  it("reads the gym once and reuses it for a minute", async () => {
    await loadGym(1_000);
    await loadGym(1_000 + GYM_CACHE_MS - 1);
    expect(findUnique).toHaveBeenCalledTimes(1);
  });

  it("reads it again after a minute", async () => {
    await loadGym(1_000);
    await loadGym(1_000 + GYM_CACHE_MS + 1);
    expect(findUnique).toHaveBeenCalledTimes(2);
  });

  it("doesn't cache a missing gym", async () => {
    findUnique.mockResolvedValueOnce(null);
    await expect(loadGym(1_000)).rejects.toThrow("not found");
    expect(await loadGym(1_000)).toMatchObject({ id: "g1" });
  });
});
