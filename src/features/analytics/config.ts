import type { BusynessThresholds } from "./types";

// A climber counts as "in the gym" for this long after checking in.
// Typical visits are 90 min to 2 h, and there are no manual check-outs.
export const ACTIVE_WINDOW_MINUTES = 120;

// How often the busyness views re-fetch (#86). Each refresh re-renders the
// whole page on the server, so not too often:
// - the desk refreshes itself straight after every check-in it makes, so this
//   only catches check-ins ageing out of the window (and other desks);
// - a climber's card is a rough "how busy is it", fine a minute old.
export const DESK_BUSYNESS_REFRESH_MS = 5 * 60_000;
export const CLIMBER_BUSYNESS_REFRESH_MS = 60_000;

// Placeholder defaults: low < 20, medium 20 to 40, high > 40.
export const DEFAULT_THRESHOLDS: BusynessThresholds = {
  mediumAt: 20,
  highAbove: 40,
};

type GymBusynessSettings = {
  timeZone: string;
  thresholds: BusynessThresholds;
};

const DEFAULT_SETTINGS: GymBusynessSettings = {
  timeZone: "America/Vancouver",
  thresholds: DEFAULT_THRESHOLDS,
};

// Per-gym overrides. Moves to the database once gyms have settings there.
const GYM_SETTINGS: Record<string, Partial<GymBusynessSettings>> = {};

export function getGymBusynessSettings(gymId: string): GymBusynessSettings {
  return { ...DEFAULT_SETTINGS, ...GYM_SETTINGS[gymId] };
}

// Until auth knows which gym a user belongs to, every page uses this one.
export const DEMO_GYM_ID = "demo-gym";
