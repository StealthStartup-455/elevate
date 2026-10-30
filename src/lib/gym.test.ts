import { beforeEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.hoisted(() => vi.fn());
vi.mock("./db", () => ({ db: { gym: { findUnique } } }));

import { forgetGym, GYM_CACHE_MS, loadGym, loadGymById } from "./gym";

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

describe("loadGymById", () => {
  it("reuses the gym for a minute, and shares it with the demo gym lookup", async () => {
    await loadGym(1_000);
    expect(await loadGymById("g1", 1_000 + GYM_CACHE_MS - 1)).toMatchObject({ slug: "demo-gym" });
    expect(findUnique).toHaveBeenCalledTimes(1);
  });

  it("returns null for a gym that doesn't exist, without caching it", async () => {
    findUnique.mockResolvedValueOnce(null);
    expect(await loadGymById("nope", 1_000)).toBeNull();
    await loadGymById("nope", 1_000);
    expect(findUnique).toHaveBeenCalledTimes(2);
  });
});
