export type WaiverStatus = "valid" | "expired" | "missing";

export type BusynessLevel = "low" | "medium" | "high";

export type Climber = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  waiverStatus: WaiverStatus;
};

export type CheckIn = {
  id: string;
  climberId: string;
  gymId: string;
  timestamp: Date;
};

// A check-in joined with its climber, as the desk list needs it.
export type ActiveCheckIn = CheckIn & { climber: Climber };

// Below `mediumAt` is low, above `highAbove` is high, the rest medium.
export type BusynessThresholds = {
  mediumAt: number;
  highAbove: number;
};

// Safe for climbers to see: no names or other personal data.
export type BusynessSummary = {
  gymId: string;
  count: number;
  level: BusynessLevel;
  windowMinutes: number;
  computedAt: Date;
};

// Staff only: includes who is in the gym.
export type FrontDeskBusyness = BusynessSummary & {
  checkIns: ActiveCheckIn[];
};

// Typical climbers in the gym by weekday (Mon first) and hour, for the heat map.
export type WeeklyBusyness = {
  gymId: string;
  // Hours shown, as [startHour, endHour) on the gym's clock.
  startHour: number;
  endHour: number;
  days: string[];
  // values[day][hour - startHour]
  values: number[][];
  // The current slot, outlined on the heat map.
  now: { day: number; hour: number };
};
