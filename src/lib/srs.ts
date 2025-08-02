export type SrsState = {
  easiness: number; // SM-2 E-Factor
  interval: number; // days
  reps: number;
};

export function sm2(rate: 0|1|2|3|4|5, state: SrsState): SrsState {
  let { easiness, interval, reps } = state;
  const q = rate;
  easiness = Math.max(1.3, easiness + (0.1 - (5 - q)*(0.08 + (5 - q)*0.02)));
  if (q < 3) {
    reps = 0;
    interval = 1;
  } else {
    reps += 1;
    if (reps == 1) interval = 1;
    else if (reps == 2) interval = 6;
    else interval = Math.round(interval * easiness);
  }
  return { easiness, interval, reps };
}
