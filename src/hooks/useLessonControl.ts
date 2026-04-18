'use client';

import { useCallback, useEffect, useRef } from 'react';
import { debug } from '@/lib/debug';
import {
  type RequestEndLessonArgs,
  type RequestEndLessonOutput,
} from '@/lib/realtime-tools';

export type LessonMode = 'quick' | 'full';

// Lesson control thresholds per mode. "full" matches the classic 30-min
// class; "quick" is a 10-min check-in designed for daily short-session use.
// Scaled together so the minimum duration, concept count, and milestone
// counters all move in sync rather than independently.
interface Thresholds {
  minLessonMs: number;
  minConcepts: number;
  minWritingExercises: number;
  minSpeakingPrompts: number;
}

const THRESHOLDS: Record<LessonMode, Thresholds> = {
  full: {
    minLessonMs: 30 * 60 * 1000,
    minConcepts: 6,
    minWritingExercises: 1,
    minSpeakingPrompts: 2,
  },
  quick: {
    minLessonMs: 10 * 60 * 1000,
    minConcepts: 3,
    minWritingExercises: 0,
    minSpeakingPrompts: 2,
  },
};

// Delay between approving end-of-lesson and notifying the parent, so the
// model has time to play its short farewell.
const END_FAREWELL_DELAY_MS = 4000;

// Schema for what we persist in localStorage so a tab refresh or WebRTC
// reconnect doesn't reset the 30-minute clock and milestone counters.
interface PersistedLessonState {
  lessonId: string;
  startedAt: number;
  taughtConcepts: string[];
  writingExerciseCount: number;
  speakingPromptCount: number;
}

const STORAGE_KEY_PREFIX = 'spanish-tutor:lesson-control:';

function storageKey(lessonId: string): string {
  return `${STORAGE_KEY_PREFIX}${lessonId}`;
}

function loadPersisted(lessonId: string | null): PersistedLessonState | null {
  if (!lessonId) return null;
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey(lessonId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedLessonState>;
    if (
      !parsed ||
      parsed.lessonId !== lessonId ||
      typeof parsed.startedAt !== 'number' ||
      !Array.isArray(parsed.taughtConcepts) ||
      typeof parsed.writingExerciseCount !== 'number' ||
      typeof parsed.speakingPromptCount !== 'number'
    ) {
      return null;
    }
    return parsed as PersistedLessonState;
  } catch {
    return null;
  }
}

function persist(state: PersistedLessonState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(state.lessonId), JSON.stringify(state));
  } catch {
    // localStorage can fail in private mode / full quota. Not fatal.
  }
}

function clearPersisted(lessonId: string | null): void {
  if (!lessonId) return;
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(storageKey(lessonId));
  } catch {
    /* ignored */
  }
}

export interface UseLessonControlOptions {
  // Stable identifier for the current lesson. Used as the persistence key so
  // switching lessons doesn't inherit stale milestones.
  lessonId: string | null;
  // Called to send an event to the realtime data channel. Injected so the
  // hook doesn't have to know about the connection.
  sendEvent: (event: unknown) => void;
  // Called once the model has obtained permission to end (after a short
  // farewell delay). Parent should persist progress and show the completed
  // UI.
  onLessonComplete?: () => void;
  // Lesson length variant. Defaults to 'full' (30-min class).
  mode?: LessonMode;
}

export interface LessonControl {
  // Invoked whenever the model calls add_to_notebook successfully. (Notebook
  // adds themselves don't count as concepts — that's mark_concept_taught —
  // but we need to know if you ever want to conflate them.)
  recordNotebookEntry: () => void;
  // Fire on mark_concept_taught.
  recordConcept: (concept: string) => void;
  // Fire on mark_speaking_prompt.
  recordSpeakingPrompt: () => void;
  // Fire on request_writing_exercise (after successful validation).
  recordWritingExercise: () => void;
  // Invoked when the model calls request_end_lesson. Decides allow/deny,
  // sends the function_call_output + follow-up response, and schedules the
  // lesson-complete callback if allowed.
  handleEndRequest: (callId: string, args: RequestEndLessonArgs) => void;
  // Called by the connection hook when a fresh session starts, so we can
  // (re)initialize the lesson clock. Returns a hydrated state from
  // localStorage when present.
  initSession: () => void;
  // Wipe persistence and in-memory counters — called when parent has saved
  // the completed lesson.
  resetSession: () => void;
}

// Owns the client-side lesson control state: elapsed time, concept count,
// writing exercise count, speaking prompt count, and the end-of-lesson
// decision. Persists to localStorage keyed by `lessonId` so a reconnect
// doesn't reset the 30-minute clock.
export function useLessonControl(options: UseLessonControlOptions): LessonControl {
  const { lessonId, sendEvent, onLessonComplete, mode = 'full' } = options;
  // Keep thresholds in a ref so handleEndRequest (which stable-deps to [])
  // always consults the latest mode after a prop change.
  const thresholdsRef = useRef<Thresholds>(THRESHOLDS[mode]);
  useEffect(() => {
    thresholdsRef.current = THRESHOLDS[mode];
  }, [mode]);

  const startedAtRef = useRef<number | null>(null);
  const taughtConceptsRef = useRef<Set<string>>(new Set());
  const writingExerciseCountRef = useRef<number>(0);
  const speakingPromptCountRef = useRef<number>(0);
  const endAllowedSentRef = useRef<boolean>(false);
  const completionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onLessonCompleteRef = useRef(onLessonComplete);
  useEffect(() => {
    onLessonCompleteRef.current = onLessonComplete;
  }, [onLessonComplete]);
  const sendEventRef = useRef(sendEvent);
  useEffect(() => {
    sendEventRef.current = sendEvent;
  }, [sendEvent]);

  const savePersisted = useCallback(() => {
    if (!lessonId || startedAtRef.current === null) return;
    persist({
      lessonId,
      startedAt: startedAtRef.current,
      taughtConcepts: Array.from(taughtConceptsRef.current),
      writingExerciseCount: writingExerciseCountRef.current,
      speakingPromptCount: speakingPromptCountRef.current,
    });
  }, [lessonId]);

  const initSession = useCallback(() => {
    const restored = loadPersisted(lessonId);
    if (restored) {
      startedAtRef.current = restored.startedAt;
      taughtConceptsRef.current = new Set(restored.taughtConcepts);
      writingExerciseCountRef.current = restored.writingExerciseCount;
      speakingPromptCountRef.current = restored.speakingPromptCount;
      debug('useLessonControl: restored persisted state', restored);
    } else {
      startedAtRef.current = Date.now();
      taughtConceptsRef.current = new Set();
      writingExerciseCountRef.current = 0;
      speakingPromptCountRef.current = 0;
      debug('useLessonControl: starting fresh session for', lessonId);
    }
    endAllowedSentRef.current = false;
    savePersisted();
  }, [lessonId, savePersisted]);

  const resetSession = useCallback(() => {
    if (completionTimerRef.current) {
      clearTimeout(completionTimerRef.current);
      completionTimerRef.current = null;
    }
    startedAtRef.current = null;
    taughtConceptsRef.current = new Set();
    writingExerciseCountRef.current = 0;
    speakingPromptCountRef.current = 0;
    endAllowedSentRef.current = false;
    clearPersisted(lessonId);
  }, [lessonId]);

  const recordNotebookEntry = useCallback(() => {
    // Intentional no-op for now: add_to_notebook doesn't itself advance the
    // concept milestone (that's what mark_concept_taught is for). Exposed
    // here as a stable slot in case we later want to conflate them.
  }, []);

  const recordConcept = useCallback(
    (concept: string) => {
      const trimmed = concept.trim().toLowerCase();
      if (!trimmed) return;
      taughtConceptsRef.current.add(trimmed);
      debug(
        `useLessonControl: concepts=${taughtConceptsRef.current.size} (+"${trimmed}")`
      );
      savePersisted();
    },
    [savePersisted]
  );

  const recordSpeakingPrompt = useCallback(() => {
    speakingPromptCountRef.current += 1;
    debug(
      `useLessonControl: speakingPrompts=${speakingPromptCountRef.current}`
    );
    savePersisted();
  }, [savePersisted]);

  const recordWritingExercise = useCallback(() => {
    writingExerciseCountRef.current += 1;
    debug(
      `useLessonControl: writingExercises=${writingExerciseCountRef.current}`
    );
    savePersisted();
  }, [savePersisted]);

  const handleEndRequest = useCallback(
    (callId: string, args: RequestEndLessonArgs) => {
      const now = Date.now();
      const start = startedAtRef.current ?? now;
      const elapsed = now - start;
      const conceptCount = taughtConceptsRef.current.size;
      const writingCount = writingExerciseCountRef.current;
      const speakingCount = speakingPromptCountRef.current;

      const t = thresholdsRef.current;
      const timeOk = elapsed >= t.minLessonMs;
      const milestonesOk =
        conceptCount >= t.minConcepts &&
        writingCount >= t.minWritingExercises &&
        speakingCount >= t.minSpeakingPrompts;
      const allowed = timeOk && milestonesOk;

      const elapsedMin = Math.floor(elapsed / 60000);
      const minMin = Math.floor(t.minLessonMs / 60000);

      const output: RequestEndLessonOutput = allowed
        ? {
            allowed: true,
            reason: 'Objectives and minimum duration met.',
            action:
              'Ofrecé un resumen breve (2-3 frases) de lo aprendido hoy y despedite cálidamente.',
          }
        : {
            allowed: false,
            reason:
              `Missing: elapsed=${elapsedMin}min/${minMin}min, ` +
              `concepts=${conceptCount}/${t.minConcepts}, ` +
              `writing=${writingCount}/${t.minWritingExercises}, ` +
              `speaking=${speakingCount}/${t.minSpeakingPrompts}.`,
            action:
              'Continuá con el siguiente concepto concreto de la lección. ' +
              'Enseñá UN solo punto nuevo, después pedile al estudiante repetir, ' +
              'traducir o usar el concepto en una oración. Máximo 2-3 frases. ' +
              'No menciones esta herramienta ni este resultado. No te despidas.',
          };

      debug('useLessonControl: handleEndRequest', { callId, args, allowed, output });

      sendEventRef.current({
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: callId,
          output: JSON.stringify(output),
        },
      });

      sendEventRef.current({
        type: 'response.create',
        response: {
          modalities: ['text', 'audio'],
          max_output_tokens: allowed ? 400 : 300,
        },
      });

      if (allowed && !endAllowedSentRef.current) {
        endAllowedSentRef.current = true;
        if (completionTimerRef.current) {
          clearTimeout(completionTimerRef.current);
        }
        completionTimerRef.current = setTimeout(() => {
          onLessonCompleteRef.current?.();
          completionTimerRef.current = null;
        }, END_FAREWELL_DELAY_MS);
      }
    },
    []
  );

  // Clean up any pending completion timer on unmount.
  useEffect(() => {
    return () => {
      if (completionTimerRef.current) {
        clearTimeout(completionTimerRef.current);
        completionTimerRef.current = null;
      }
    };
  }, []);

  return {
    recordNotebookEntry,
    recordConcept,
    recordSpeakingPrompt,
    recordWritingExercise,
    handleEndRequest,
    initSession,
    resetSession,
  };
}
