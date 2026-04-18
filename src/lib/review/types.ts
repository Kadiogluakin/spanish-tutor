// Shared types between the review API routes and the React components that
// consume them. Kept in a neutral module (not the route handler file) so the
// client bundle never accidentally imports server-only code via a type re-
// export.
//
// Abstract skills (e.g. vocabulary_range) are intentionally NOT a review kind
// here — they live in skill_progress for analytics and adaptive homework use.

export type ReviewItem =
  | {
      kind: 'vocab';
      progressId: string;
      nextDue: string;
      easiness: number;
      intervalDays: number;
      successes: number;
      failures: number;
      front: string;
      back: string;
      sourceLesson?: string | null;
    }
  | {
      kind: 'error';
      progressId: string;
      nextDue: string;
      easiness: number;
      intervalDays: number;
      successes: number;
      failures: number;
      errorType: 'grammar' | 'vocabulary' | 'pronunciation' | string;
      originalError: string;
      correction: string;
      note?: string | null;
    };
