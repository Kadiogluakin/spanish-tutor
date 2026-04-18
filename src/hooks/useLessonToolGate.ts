'use client';

import { useCallback, useEffect, useRef } from 'react';
import { debug } from '@/lib/debug';
import {
  TOOL_REQUEST_LISTENING_EXERCISE,
  TOOL_REQUEST_WRITING_EXERCISE,
} from '@/lib/realtime-tools';
import type { VoiceStatus } from '@/hooks/useRealtimeConnection';

const REMEDIAL_DELAY_MS = 200;

/** Minimum assistant completions before B1 "oral streak" remedial kicks in. */
const B1_MIN_ASSISTANT_TURNS = 4;
/** Consecutive assistant responses with no writing+listening tools (B1+). */
const B1_ORAL_STREAK_THRESHOLD = 3;
/** Max B1+ remedial tool-forcing responses per lesson session (safety). */
const B1_MAX_REMEDIALS = 6;

const A11_LISTENING_AFTER_TURNS = 2;
const A11_WRITING_AFTER_TURNS = 4;

type SendEventFn = (event: unknown) => void;

export interface UseLessonToolGateOptions {
  sendEvent: SendEventFn;
  /** From getEffectiveSubLevel(lesson.cefr, lesson.unit). */
  subLevel: string;
  /** True while any drill / writing modal is open. */
  isExerciseModalOpen: boolean;
  voiceStatus: VoiceStatus;
  lessonTitle?: string;
  lessonObjectives?: string[];
  lessonId: string | null;
  /** When false, gate does not schedule remedials (disconnected, etc.). */
  enabled: boolean;
}

export interface LessonToolGate {
  onAssistantResponseComplete: (info: {
    toolNames: string[];
    responseId?: string;
  }) => void;
}

function toolChoiceForceFunction(name: string): {
  type: 'function';
  function: { name: string };
} {
  return { type: 'function', function: { name } };
}

function buildLessonHint(title?: string, objectives?: string[]): string {
  const parts: string[] = [];
  if (title) parts.push(`Lesson title: "${title}".`);
  if (objectives?.length)
    parts.push(`Objectives: ${objectives.slice(0, 5).join('; ')}.`);
  return parts.join(' ') || 'Follow the lesson objectives in the system prompt.';
}

export function useLessonToolGate(
  options: UseLessonToolGateOptions
): LessonToolGate {
  const {
    sendEvent,
    subLevel,
    isExerciseModalOpen,
    voiceStatus,
    lessonTitle,
    lessonObjectives,
    lessonId,
    enabled,
  } = options;

  const assistantTurnsRef = useRef(0);
  const hasListeningRef = useRef(false);
  const hasWritingRef = useRef(false);
  const oralStreakRef = useRef(0);
  const b1RemedialsRef = useRef(0);
  const firedListeningRemedialRef = useRef(false);
  const firedWritingRemedialRef = useRef(false);
  const scheduledTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevLessonIdRef = useRef<string | null>(lessonId);
  const enabledRef = useRef(enabled);
  const modalOpenRef = useRef(isExerciseModalOpen);
  const voiceStatusRef = useRef(voiceStatus);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);
  useEffect(() => {
    modalOpenRef.current = isExerciseModalOpen;
  }, [isExerciseModalOpen]);
  useEffect(() => {
    voiceStatusRef.current = voiceStatus;
  }, [voiceStatus]);

  const resetCounters = useCallback(() => {
    assistantTurnsRef.current = 0;
    hasListeningRef.current = false;
    hasWritingRef.current = false;
    oralStreakRef.current = 0;
    b1RemedialsRef.current = 0;
    firedListeningRemedialRef.current = false;
    firedWritingRemedialRef.current = false;
    if (scheduledTimerRef.current) {
      clearTimeout(scheduledTimerRef.current);
      scheduledTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (prevLessonIdRef.current === lessonId) return;
    prevLessonIdRef.current = lessonId;
    resetCounters();
  }, [lessonId, resetCounters]);

  useEffect(() => {
    return () => {
      if (scheduledTimerRef.current) {
        clearTimeout(scheduledTimerRef.current);
        scheduledTimerRef.current = null;
      }
    };
  }, []);

  const scheduleRemedial = useCallback(
    (label: string, payload: Record<string, unknown>) => {
      if (scheduledTimerRef.current) {
        clearTimeout(scheduledTimerRef.current);
        scheduledTimerRef.current = null;
      }
      scheduledTimerRef.current = setTimeout(() => {
        scheduledTimerRef.current = null;
        const vs = voiceStatusRef.current;
        if (!enabledRef.current) {
          debug('[LessonToolGate] skip remedial (disabled)', label);
          return;
        }
        if (modalOpenRef.current) {
          debug('[LessonToolGate] skip remedial (modal open)', label);
          return;
        }
        if (vs === 'listening') {
          debug('[LessonToolGate] skip remedial (user speaking)', label);
          return;
        }
        if (vs !== 'connected' && vs !== 'speaking') {
          debug('[LessonToolGate] skip remedial (voice status)', label, vs);
          return;
        }
        debug('[LessonToolGate] firing remedial', label);
        sendEvent(payload);
      }, REMEDIAL_DELAY_MS);
    },
    [sendEvent]
  );

  const onAssistantResponseComplete = useCallback(
    (info: { toolNames: string[]; responseId?: string }) => {
      void info.responseId;
      assistantTurnsRef.current += 1;
      const tools = info.toolNames;
      const turn = assistantTurnsRef.current;

      if (tools.includes(TOOL_REQUEST_LISTENING_EXERCISE)) {
        hasListeningRef.current = true;
      }
      if (tools.includes(TOOL_REQUEST_WRITING_EXERCISE)) {
        hasWritingRef.current = true;
      }

      const hadModalTool = tools.some(
        (n) =>
          n === TOOL_REQUEST_LISTENING_EXERCISE ||
          n === TOOL_REQUEST_WRITING_EXERCISE
      );
      if (hadModalTool) {
        oralStreakRef.current = 0;
      } else {
        oralStreakRef.current += 1;
      }

      const hint = buildLessonHint(lessonTitle, lessonObjectives);

      // --- A1.1: hard floor for listening + writing ---
      if (subLevel === 'A1.1') {
        if (
          turn >= A11_LISTENING_AFTER_TURNS &&
          !hasListeningRef.current &&
          !firedListeningRemedialRef.current
        ) {
          firedListeningRemedialRef.current = true;
          scheduleRemedial('A1.1-listening', {
            type: 'response.create',
            response: {
              modalities: ['text', 'audio'],
              tool_choice: toolChoiceForceFunction(TOOL_REQUEST_LISTENING_EXERCISE),
              instructions: `You MUST call ${TOOL_REQUEST_LISTENING_EXERCISE} now. ${hint} Scene: 2–4 very short Spanish lines (absolute beginner level). comprehensionQuestion in English. Provide multiple-choice options; set correctAnswer to the winning option id (not label text). After the tool call, say at most one short English transition — do not read the whole scene aloud.`,
              max_output_tokens: 500,
            },
          });
          return;
        }
        if (
          turn >= A11_WRITING_AFTER_TURNS &&
          !hasWritingRef.current &&
          !firedWritingRemedialRef.current
        ) {
          firedWritingRemedialRef.current = true;
          scheduleRemedial('A1.1-writing', {
            type: 'response.create',
            response: {
              modalities: ['text', 'audio'],
              tool_choice: toolChoiceForceFunction(TOOL_REQUEST_WRITING_EXERCISE),
              instructions: `You MUST call ${TOOL_REQUEST_WRITING_EXERCISE} now. ${hint} Use exerciseType "fill-blank" or "sentence" with a single short task. Student-facing prompt in English for A1.1. After the tool call, at most one short English line — do not dictate the whole exercise in speech.`,
              max_output_tokens: 500,
            },
          });
        }
        return;
      }

      // --- B1+ (structured mid / high): break pure oral streaks ---
      const isB1Plus = ['B1', 'B2', 'C1', 'C2'].includes(subLevel);
      if (!isB1Plus) return;
      if (turn < B1_MIN_ASSISTANT_TURNS) return;
      if (oralStreakRef.current < B1_ORAL_STREAK_THRESHOLD) return;
      if (b1RemedialsRef.current >= B1_MAX_REMEDIALS) return;

      const useWriting = b1RemedialsRef.current % 2 === 0;
      b1RemedialsRef.current += 1;
      oralStreakRef.current = 0;

      if (useWriting) {
        scheduleRemedial('B1+-writing', {
          type: 'response.create',
          response: {
            modalities: ['text', 'audio'],
            tool_choice: toolChoiceForceFunction(TOOL_REQUEST_WRITING_EXERCISE),
            instructions: `You MUST call ${TOOL_REQUEST_WRITING_EXERCISE} now. ${hint} Tie the exercise to the lesson — not another open-ended "expand your future sentence" loop. Prefer a short production or fill-blank. Spanish prompt is OK at B1+. After the tool, stop — do not answer your own exercise in speech.`,
            max_output_tokens: 500,
          },
        });
      } else {
        scheduleRemedial('B1+-listening', {
          type: 'response.create',
          response: {
            modalities: ['text', 'audio'],
            tool_choice: toolChoiceForceFunction(TOOL_REQUEST_LISTENING_EXERCISE),
            instructions: `You MUST call ${TOOL_REQUEST_LISTENING_EXERCISE} now. ${hint} Scene aligned to objectives; comprehensionQuestion in English; correctAnswer = option id if MCQ.`,
            max_output_tokens: 500,
          },
        });
      }
    },
    [
      lessonObjectives,
      lessonTitle,
      scheduleRemedial,
      subLevel,
    ]
  );

  return { onAssistantResponseComplete };
}
