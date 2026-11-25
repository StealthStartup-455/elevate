// Needs a Postgres database with the migrations applied (DATABASE_URL).
// Run with `npm run test:db`; CI runs it against its own database.
// Customer labels (#157): staff put a gym's labels on its climbers, and
// never see or touch another gym's.
import "dotenv/config";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { randomStudentId } from "@/features/climbers/student-id";

const SLUG_A = "test-labels-a";
const SLUG_B = "test-labels-b";
// The signed-in staff member: their gym, and their id (null is the shared demo desk login).
const auth = vi.hoisted(() => ({ staff: true, gymId: "", staffId: null as string | null }));

vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/auth/staff", () => ({
  getStaffContext: async () => (auth.staff ? { id: auth.staffId, gymId: auth.gymId, role: "DESK" } : null),
  requireStaff: async () => {
    if (!auth.staff) throw new Error("redirect /login");
  },
}));
vi.mock("@/lib/log", () => ({ logEvent: vi.fn() }));

const { createLabel, setClimberLabel } = await import("./actions");
const { getClimberLabels, getLabelsForClimbers, listGymLabels } = await import("./queries");
const { logEvent } = await import("@/lib/log");

const gym = { A: "", B: "" };
let climberA = "";
let climberB = "";
let staffA = "";

function as(which: "A" | "B", staffId: string | null = null) {
  auth.staff = true;
  auth.gymId = gym[which];
  auth.staffId = staffId;
}

async function newClimber(gymId: string, firstName: string) {
  return (
    await db.climber.create({
      data: { gymId, firstName, lastName: "Labels", studentId: randomStudentId(), dateOfBirth: new Date("1995-01-01") },
    })
  ).id;
}

/** A label made straight in the database, as if staff had created it earlier. */
async function newLabel(gymId: string, name: string, active = true) {
  return (await db.gymLabel.create({ data: { gymId, name, key: name.toLowerCase(), active } })).id;
}

beforeAll(async () => {
  await cleanUp();
  gym.A = (await db.gym.create({ data: { name: "Labels gym A", slug: SLUG_A } })).id;
  gym.B = (await db.gym.create({ data: { name: "Labels gym B", slug: SLUG_B } })).id;
  staffA = (await db.staff.create({ data: { gymId: gym.A, authUserId: "labels-test-staff", name: "Sam" } })).id;
});

beforeEach(async () => {
  await db.climberLabel.deleteMany({ where: { gymId: { in: [gym.A, gym.B] } } });
  await db.gymLabel.deleteMany({ where: { gymId: { in: [gym.A, gym.B] } } });
  await db.climber.deleteMany({ where: { gymId: { in: [gym.A, gym.B] } } });
  climberA = await newClimber(gym.A, "Avery");
  climberB = await newClimber(gym.B, "Blake");
  vi.mocked(logEvent).mockClear();
  as("A");
});

afterAll(async () => {
  await cleanUp();
  await db.$disconnect();
});

async function cleanUp() {
  const gyms = await db.gym.findMany({ where: { slug: { in: [SLUG_A, SLUG_B] } }, select: { id: true } });
  const ids = gyms.map((g) => g.id);
  if (ids.length === 0) return;
  await db.climberLabel.deleteMany({ where: { gymId: { in: ids } } });
  await db.gymLabel.deleteMany({ where: { gymId: { in: ids } } });
  await db.staff.deleteMany({ where: { gymId: { in: ids } } });
  await db.climber.deleteMany({ where: { gymId: { in: ids } } });
  await db.gym.deleteMany({ where: { id: { in: ids } } });
}

const names = (labels: { name: string }[] | null) => labels?.map((l) => l.name) ?? null;

describe("setClimberLabel", () => {
  it("adds, removes and adds again on one row, showing each time", async () => {
    const id = await newLabel(gym.A, "Ask for ID");

    expect(await setClimberLabel(climberA, id, true)).toEqual({ ok: true });
    expect(names(await getClimberLabels(climberA))).toEqual(["Ask for ID"]);

    expect(await setClimberLabel(climberA, id, false)).toEqual({ ok: true });
    expect(await getClimberLabels(climberA)).toEqual([]);
    const off = await db.climberLabel.findFirstOrThrow({ where: { climberId: climberA } });
    expect(off.removedAt).not.toBeNull();

    expect(await setClimberLabel(climberA, id, true)).toEqual({ ok: true });
    expect(names(await getClimberLabels(climberA))).toEqual(["Ask for ID"]);
    const rows = await db.climberLabel.findMany({ where: { climberId: climberA } });
    expect(rows).toHaveLength(1);
    expect(rows[0].removedAt).toBeNull();
    expect(rows[0].removedById).toBeNull();
  });

  it("records who added and who removed it, and null for the demo desk", async () => {
    const id = await newLabel(gym.A, "Ask for ID");
    as("A", staffA);
    await setClimberLabel(climberA, id, true);
    expect((await db.climberLabel.findFirstOrThrow({ where: { climberId: climberA } })).addedById).toBe(staffA);
    as("A", null);
    await setClimberLabel(climberA, id, false);
    const row = await db.climberLabel.findFirstOrThrow({ where: { climberId: climberA } });
    expect(row.removedById).toBeNull();
    expect(row.removedAt).not.toBeNull();
    as("A", staffA);
    await setClimberLabel(climberA, id, true);
    await setClimberLabel(climberA, id, false);
    expect((await db.climberLabel.findFirstOrThrow({ where: { climberId: climberA } })).removedById).toBe(staffA);
  });

  it("is fine pressed twice, and only logs a real change, with ids only", async () => {
    const id = await newLabel(gym.A, "Ask for ID");
    expect(await setClimberLabel(climberA, id, true)).toEqual({ ok: true });
    expect(await setClimberLabel(climberA, id, true)).toEqual({ ok: true });
    expect(await setClimberLabel(climberA, id, false)).toEqual({ ok: true });
    expect(await setClimberLabel(climberA, id, false)).toEqual({ ok: true });
    expect(await db.climberLabel.count({ where: { climberId: climberA } })).toBe(1);
    expect(vi.mocked(logEvent).mock.calls).toEqual([
      ["climber_label_added", { gymId: gym.A, climberId: climberA, labelId: id }],
      ["climber_label_removed", { gymId: gym.A, climberId: climberA, labelId: id }],
    ]);
  });

  it("won't put gym B's label on a gym A climber", async () => {
    const bLabel = await newLabel(gym.B, "Ask for ID");
    expect(await setClimberLabel(climberA, bLabel, true)).toEqual({ ok: false, message: "Label not found." });
    expect(await db.climberLabel.count()).toBe(0);
  });

  it("won't label a gym B climber", async () => {
    const aLabel = await newLabel(gym.A, "Ask for ID");
    expect(await setClimberLabel(climberB, aLabel, true)).toEqual({ ok: false, message: "Climber not found." });
    const bLabel = await newLabel(gym.B, "Banned");
    expect((await setClimberLabel(climberB, bLabel, true)).ok).toBe(false);
    expect(await db.climberLabel.count({ where: { climberId: climberB } })).toBe(0);
  });

  it("won't take a label off another gym's climber", async () => {
    const bLabel = await newLabel(gym.B, "Banned");
    as("B");
    await setClimberLabel(climberB, bLabel, true);
    as("A");
    expect((await setClimberLabel(climberB, bLabel, false)).ok).toBe(false);
    as("B");
    expect(names(await getClimberLabels(climberB))).toEqual(["Banned"]);
  });

  it("won't add an inactive label", async () => {
    const id = await newLabel(gym.A, "Old label", false);
    expect(await setClimberLabel(climberA, id, true)).toEqual({ ok: false, message: "Label not found." });
    expect(await db.climberLabel.count({ where: { climberId: climberA } })).toBe(0);
  });

  it("returns ok: false for bad ids without throwing", async () => {
    const id = await newLabel(gym.A, "Ask for ID");
    for (const [c, l] of [
      ["abc", id],
      ["", id],
      [climberA, "abc"],
      [climberA, ""],
      ["abc", ""],
    ]) {
      expect((await setClimberLabel(c, l, true)).ok).toBe(false);
      expect((await setClimberLabel(c, l, false)).ok).toBe(false);
    }
    // Sent from the browser, anything can arrive.
    expect((await setClimberLabel(undefined as unknown as string, id, true)).ok).toBe(false);
    expect((await setClimberLabel(climberA, id, "yes" as unknown as boolean)).ok).toBe(false);
    expect(await db.climberLabel.count({ where: { climberId: climberA } })).toBe(0);
  });

  it("refuses someone who isn't staff", async () => {
    const id = await newLabel(gym.A, "Ask for ID");
    auth.staff = false;
    await expect(setClimberLabel(climberA, id, true)).rejects.toThrow("redirect /login");
    await expect(createLabel("New")).rejects.toThrow("redirect /login");
  });
});

describe("createLabel", () => {
  it("adds a tidied label to the gym", async () => {
    const result = await createLabel("  Must   retest belay ");
    expect(result).toMatchObject({ ok: true, labelId: expect.any(String) });
    expect(names(await listGymLabels())).toEqual(["Must retest belay"]);
    expect(vi.mocked(logEvent)).toHaveBeenCalledWith("label_created", { gymId: gym.A, labelId: result.labelId });
  });

  it("records who created it", async () => {
    as("A", staffA);
    const { labelId } = await createLabel("Ask for ID");
    expect((await db.gymLabel.findUniqueOrThrow({ where: { id: labelId } })).createdById).toBe(staffA);
  });

  it("refuses '  ask FOR id ' where 'Ask for ID' exists, but another gym may have it", async () => {
    await newLabel(gym.A, "Ask for ID");
    expect(await createLabel("  ask FOR id ")).toEqual({
      ok: false,
      message: `There's already a label called "Ask for ID".`,
    });
    as("B");
    expect((await createLabel("  ask FOR id ")).ok).toBe(true);
    expect(names(await listGymLabels())).toEqual(["ask FOR id"]);
  });

  it("refuses a name that isn't valid", async () => {
    expect(await createLabel("   ")).toEqual({ ok: false, message: "Type a label name." });
    expect((await createLabel("a".repeat(31))).ok).toBe(false);
    expect((await createLabel("Ask\nfor ID")).ok).toBe(false);
    expect(await db.gymLabel.count({ where: { gymId: gym.A } })).toBe(0);
  });

  it("caps a gym at 50 active labels; inactive ones and other gyms don't count", async () => {
    await db.gymLabel.createMany({
      data: Array.from({ length: 50 }, (_, i) => ({ gymId: gym.A, name: `L${i}`, key: `l${i}` })),
    });
    await newLabel(gym.B, "In gym B");
    expect(await createLabel("One more")).toEqual({
      ok: false,
      message: "Your gym already has 50 labels, the most it can have.",
    });
    await db.gymLabel.updateMany({ where: { gymId: gym.A, key: "l0" }, data: { active: false } });
    expect((await createLabel("One more")).ok).toBe(true);
  });

  it("switches an inactive label with the same name back on, rather than making a second", async () => {
    const id = await newLabel(gym.A, "Ask for ID", false);
    expect(await createLabel("ask for id")).toEqual({ ok: true, labelId: id });
    expect(await db.gymLabel.count({ where: { gymId: gym.A } })).toBe(1);
    expect(names(await listGymLabels())).toEqual(["Ask for ID"]);
  });

  it("when two desks create the same name at once, one wins and the other is told", async () => {
    const results = await Promise.all([createLabel("Ask for ID"), createLabel("ask for ID")]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.find((r) => !r.ok)?.message).toMatch(/^There's already a label called/);
    expect(await db.gymLabel.count({ where: { gymId: gym.A } })).toBe(1);
  });
});

describe("reading labels", () => {
  it("listGymLabels shows only this gym's active labels, A to Z ignoring case", async () => {
    await newLabel(gym.A, "zebra");
    await newLabel(gym.A, "Ask for ID");
    await newLabel(gym.A, "Old", false);
    await newLabel(gym.B, "Banned");
    expect(names(await listGymLabels())).toEqual(["Ask for ID", "zebra"]);
  });

  it("getClimberLabels is null for another gym's climber or a bad id", async () => {
    expect(await getClimberLabels(climberA)).toEqual([]);
    expect(await getClimberLabels(climberB)).toBeNull();
    expect(await getClimberLabels("abc")).toBeNull();
    expect(await getClimberLabels("")).toBeNull();
  });

  it("an inactive label stops showing on climbers", async () => {
    const id = await newLabel(gym.A, "Ask for ID");
    await setClimberLabel(climberA, id, true);
    await db.gymLabel.update({ where: { id }, data: { active: false } });
    expect(await getClimberLabels(climberA)).toEqual([]);
    expect((await getLabelsForClimbers(gym.A, [climberA])).get(climberA)).toEqual([]);
  });

  it("getLabelsForClimbers returns only that gym's labels, every asked id in the map", async () => {
    const a1 = await newLabel(gym.A, "Ask for ID");
    const a2 = await newLabel(gym.A, "Belay retest");
    const other = await newClimber(gym.A, "Casey");
    await setClimberLabel(climberA, a2, true);
    await setClimberLabel(climberA, a1, true);
    as("B");
    const b1 = await newLabel(gym.B, "Banned");
    await setClimberLabel(climberB, b1, true);
    as("A");

    const map = await getLabelsForClimbers(gym.A, [climberA, other, climberB, climberA, "abc"]);
    expect(names(map.get(climberA) ?? null)).toEqual(["Ask for ID", "Belay retest"]);
    expect(map.get(other)).toEqual([]);
    // Gym B's climber is asked for, but gym B's label never comes back.
    expect(map.get(climberB)).toEqual([]);
    expect(map.has("abc")).toBe(false);
  });

  it("getLabelsForClimbers gives nothing when asked for a gym that isn't the staff member's", async () => {
    as("B");
    const b1 = await newLabel(gym.B, "Banned");
    await setClimberLabel(climberB, b1, true);
    as("A");
    expect((await getLabelsForClimbers(gym.B, [climberB])).get(climberB)).toEqual([]);
  });
});
