// A label as the desk screens show it (#157). Staff only: never part of the
// shared Climber type, which the climber's own pages (/me) read too.
export type LabelView = {
  /** The GymLabel id. */
  id: string;
  name: string;
};

export type LabelResult = {
  ok: boolean;
  message?: string;
  /** createLabel only: the new (or switched back on) label, so the screen can put it on a climber. */
  labelId?: string;
};
