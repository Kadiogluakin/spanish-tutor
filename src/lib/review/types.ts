// Shared types between the review API routes and the React components that
// consume them. Kept in a neutral module (not the route handler file) so the
// client bundle never accidentally imports server-only code via a type re-
// export.

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
      kind: 'skill';
      progressId: string;
      nextDue: string;
      easiness: number;
      intervalDays: number;
      successes: number;
      failures: number;
      skillCode: string;
      front: string;
      frontEn: string;
      back: string;
      backEn: string;
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
