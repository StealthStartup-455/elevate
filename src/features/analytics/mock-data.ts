// Mock check-ins for the busyness scaffold. Replaced by a real query in
// queries.ts once the check-ins tables exist; nothing else imports this file.
import { DEMO_GYM_ID } from "./config";
import type { CheckIn, Climber, WaiverStatus } from "./types";

const FIRST_NAMES = [
  "Alex", "Sam", "Jordan", "Taylor", "Riley", "Casey", "Morgan", "Jamie",
  "Avery", "Quinn", "Drew", "Rowan", "Skyler", "Reese", "Emerson", "Hayden",
];
const LAST_NAMES = [
  "Nguyen", "Smith", "Patel", "Chen", "Martin", "Singh", "Brown", "Wilson",
  "Lee", "Tremblay", "Roy", "Kaur", "Wong", "Campbell", "Gill", "Scott",
];

function waiverStatusFor(i: number): WaiverStatus {
  if (i % 11 === 0) return "missing";
  if (i % 7 === 0) return "expired";
  return "valid";
}

export const MOCK_CLIMBERS: Climber[] = Array.from({ length: 48 }, (_, i) => ({
  id: `climber-${i + 1}`,
  firstName: FIRST_NAMES[i % FIRST_NAMES.length],
  // Shift by one each lap through FIRST_NAMES so no full name repeats.
  lastName:
    LAST_NAMES[(i * 5 + Math.floor(i / FIRST_NAMES.length)) % LAST_NAMES.length],
  phone: `250-555-${String(100 + i).padStart(4, "0")}`,
  waiverStatus: waiverStatusFor(i),
}));

// Minutes before "now" for each check-in. 28 fall inside the 2 h window and
// 10 are older, so the filtering is visible.
const MINUTES_AGO = [
  2, 4, 5, 9, 12, 15, 18, 21, 26, 30, 34, 38, 41, 47, 52, 58, 63, 69, 74, 80,
  86, 91, 97, 103, 108, 112, 116, 119,
  // Outside the window
  125, 131, 140, 152, 168, 185, 201, 230, 262, 300,
];

// Timestamps are built per call so the mock never goes stale.
export function mockCheckIns(now: Date): CheckIn[] {
  return MINUTES_AGO.map((minutesAgo, i) => ({
    id: `checkin-${i + 1}`,
    climberId: MOCK_CLIMBERS[i % MOCK_CLIMBERS.length].id,
    gymId: DEMO_GYM_ID,
    timestamp: new Date(now.getTime() - minutesAgo * 60_000),
  }));
}
