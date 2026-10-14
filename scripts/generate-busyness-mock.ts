// Writes the busyness mock data in src/features/analytics/mock/.
// The output is deterministic: same settings, same files.
//
//   npm run mock:busyness                  regenerate every scenario
//   npm run mock:busyness -- busy 70       regenerate one scenario with 70 climbers in the gym
//   npm run mock:busyness -- busy 70 20    ...and 20 older check-ins outside the window
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ACTIVE_WINDOW_MINUTES, DEMO_GYM_ID } from "../src/features/analytics/config";
import type { MockScenario, MockWeek } from "../src/features/analytics/mock-data";
import type { WaiverStatus } from "../src/features/analytics/types";

const OUT_DIR = join(import.meta.dirname, "../src/features/analytics/mock");

// The mock clock: a Thursday at 6:30 PM in Vancouver. Every scenario is
// built relative to this, so the data never changes between requests.
const REFERENCE_TIME = new Date("2026-10-09T01:30:00.000Z");

// active: check-ins inside the 2 h window (the count shown).
// older: check-ins from earlier in the day, which must be filtered out.
const SCENARIOS: Record<string, { active: number; older: number }> = {
  quiet: { active: 8, older: 6 },
  moderate: { active: 28, older: 10 },
  busy: { active: 55, older: 12 },
};

const FIRST_NAMES = [
  "Alex", "Sam", "Jordan", "Taylor", "Riley", "Casey", "Morgan", "Jamie",
  "Avery", "Quinn", "Drew", "Rowan", "Skyler", "Reese", "Emerson", "Hayden",
];
const LAST_NAMES = [
  "Nguyen", "Smith", "Patel", "Chen", "Martin", "Singh", "Brown", "Wilson",
  "Lee", "Tremblay", "Roy", "Kaur", "Wong", "Campbell", "Gill", "Scott",
];

// Small seeded random generator, so "random" spacing is repeatable.
function seeded(seed: string) {
  let state = [...seed].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function waiverStatusFor(i: number): WaiverStatus {
  if (i % 11 === 5) return "missing";
  if (i % 7 === 3) return "expired";
  return "valid";
}

function buildScenario(name: string, active: number, older: number): MockScenario {
  const random = seeded(name);
  const total = active + older;
  const climbers = Array.from({ length: total }, (_, i) => ({
    id: `climber-${i + 1}`,
    firstName: FIRST_NAMES[i % FIRST_NAMES.length],
    // Shift by one each lap through FIRST_NAMES so no full name repeats.
    lastName:
      LAST_NAMES[(i * 5 + Math.floor(i / FIRST_NAMES.length)) % LAST_NAMES.length],
    phone: `250-555-${String(100 + i).padStart(4, "0")}`,
    waiverStatus: waiverStatusFor(i),
  }));

  // Active check-ins are spread across the window; older ones across the
  // 4 hours before it. Each climber checks in once.
  const minutesAgo = [
    ...Array.from({ length: active }, (_, i) =>
      Math.floor(((i + random()) * (ACTIVE_WINDOW_MINUTES - 1)) / active) + 1,
    ),
    ...Array.from({ length: older }, (_, i) =>
      ACTIVE_WINDOW_MINUTES + 5 + Math.floor(((i + random()) * 240) / older),
    ),
  ];

  return {
    scenario: name,
    referenceTime: REFERENCE_TIME.toISOString(),
    climbers,
    checkIns: minutesAgo.map((minutes, i) => ({
      id: `checkin-${i + 1}`,
      climberId: climbers[i].id,
      gymId: DEMO_GYM_ID,
      timestamp: new Date(REFERENCE_TIME.getTime() - minutes * 60_000).toISOString(),
    })),
  };
}

// Typical climbers in the gym per weekday and hour, for the heat map.
// Weekdays peak after work; weekends peak mid-afternoon.
function buildWeek(): MockWeek {
  const startHour = 6;
  const endHour = 22;
  const random = seeded("week");
  const bump = (hour: number, peak: number, width: number, height: number) =>
    height * Math.exp(-(((hour - peak) / width) ** 2));

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const values = days.map((_, day) => {
    const weekend = day >= 5;
    return Array.from({ length: endHour - startHour }, (_, h) => {
      const hour = startHour + h + 0.5;
      const base = weekend
        ? bump(hour, 14, 3.5, 50)
        : bump(hour, 7.5, 1.2, 10) + bump(hour, 12.5, 1.2, 14) + bump(hour, 18.5, 1.8, 48);
      // Fridays are quieter in the evening.
      const scale = day === 4 ? 0.7 : 1;
      return Math.round(base * scale + random() * 4);
    });
  });

  return { gymId: DEMO_GYM_ID, startHour, endHour, days, values };
}

function write(file: string, data: unknown) {
  writeFileSync(join(OUT_DIR, file), JSON.stringify(data, null, 2) + "\n");
  console.log(`wrote mock/${file}`);
}

mkdirSync(OUT_DIR, { recursive: true });

const [name, activeArg, olderArg] = process.argv.slice(2);
if (name) {
  if (!SCENARIOS[name]) {
    console.error(`Unknown scenario "${name}". Use one of: ${Object.keys(SCENARIOS).join(", ")}`);
    process.exit(1);
  }
  const active = activeArg ? Number(activeArg) : SCENARIOS[name].active;
  const older = olderArg ? Number(olderArg) : SCENARIOS[name].older;
  write(`${name}.json`, buildScenario(name, active, older));
} else {
  for (const [scenario, { active, older }] of Object.entries(SCENARIOS)) {
    write(`${scenario}.json`, buildScenario(scenario, active, older));
  }
  write("week.json", buildWeek());
}
