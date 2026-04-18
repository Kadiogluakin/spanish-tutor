// SM-2 spaced repetition algorithm.
// Source: P. A. Wozniak, "Optimization of repetition spacing in the practice
// of learning", Acta Neurobiologiae Experimentalis, 1995.
//
// IMPORTANT: `reps` here is the number of *consecutive* successful repetitions
// and must be RESET to 0 on any failure (rating < 3). It is NOT a lifetime
// success count. Callers must persist `reps` separately from `successes`
// (see scripts/fix-review-feature.sql).

export type SrsRating = 0 | 1 | 2 | 3 | 4 | 5;

export type SrsState = {
  easiness: number; // E-factor, >= 1.3
  interval: number; // days until next review
  reps: number; // consecutive successful reps
};

export const INITIAL_SRS_STATE: SrsState = {
  easiness: 2.5,
  interval: 0,
  reps: 0,
};

export function sm2(rating: SrsRating, state: SrsState): SrsState {
  const q = rating;
  let { easiness, interval, reps } = state;

  // E-factor update (same formula regardless of success/failure).
  easiness = Math.max(
    1.3,
    easiness + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  );

  if (q < 3) {
    // Failure: the item is not learned. Restart the repetition chain and see
    // it again tomorrow.
    reps = 0;
    interval = 1;
  } else {
    reps += 1;
    if (reps === 1) interval = 1;
    else if (reps === 2) interval = 6;
    else interval = Math.round(interval * easiness);
  }

  return { easiness, interval, reps };
}

/** Convert a 0–10 performance score into a 0–5 SM-2 rating. */
export function performanceToRating(performance: number): SrsRating {
  const clamped = Math.min(10, Math.max(0, performance));
  return Math.round(clamped / 2) as SrsRating;
}
