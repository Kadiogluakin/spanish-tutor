'use client';

import { useCallback, useEffect, useRef } from 'react';
import { debug } from '@/lib/debug';
import { extractToolNamesFromResponseDone } from '@/lib/realtime-response-parse';
import { type KnownRealtimeEvent } from '@/types/realtime-events';
import {
  TOOL_ADD_TO_NOTEBOOK,
  TOOL_MARK_CONCEPT_TAUGHT,
  TOOL_MARK_ITEM_REVIEWED,
  TOOL_MARK_SPEAKING_PROMPT,
  TOOL_REMEMBER_STUDENT_FACT,
  TOOL_REQUEST_END_LESSON,
  TOOL_REQUEST_FLUENCY_SPRINT,
  TOOL_REQUEST_LISTENING_EXERCISE,
  TOOL_REQUEST_PRONUNCIATION_DRILL,
  TOOL_REQUEST_READING_PASSAGE,
  TOOL_REQUEST_WRITING_EXERCISE,
  type AddToNotebookArgs,
  type MarkConceptTaughtArgs,
  type MarkItemReviewedArgs,
  type RememberStudentFactArgs,
  type RequestEndLessonArgs,
  type RequestFluencySprintArgs,
  type RequestListeningExerciseArgs,
  type RequestPronunciationDrillArgs,
  type RequestReadingPassageArgs,
  type RequestWritingExerciseArgs,
} from '@/lib/realtime-tools';

// Handler callbacks for the events consumers care about. All are optional so
// callers only wire up what they need.
export interface AiEventRouterHandlers {
  // Teacher-side tool calls.
  onNotebookEntry?: (word: string, english?: string) => void;
  onConceptTaught?: (concept: string) => void;
  onSpeakingPrompt?: () => void;
  onWritingExerciseRequest?: (data: RequestWritingExerciseArgs) => void;
  onEndLessonRequest?: (callId: string, args: RequestEndLessonArgs) => void;
  onItemReviewed?: (args: MarkItemReviewedArgs) => void;
  onPronunciationDrill?: (args: RequestPronunciationDrillArgs) => void;
  onListeningExercise?: (args: RequestListeningExerciseArgs) => void;
  onReadingPassage?: (args: RequestReadingPassageArgs) => void;
  onFluencySprint?: (args: RequestFluencySprintArgs) => void;
  onRememberStudentFact?: (args: RememberStudentFactArgs) => void;

  // Transcripts.
  onAiTranscriptDelta?: (delta: string) => void;
  onAiTranscriptDone?: (transcript: string) => void;
  onUserTranscript?: (transcript: string) => void;

  // Response lifecycle (used by the mic gate).
  onResponseStart?: () => void;
  onResponseEnd?: () => void;

  // Speech lifecycle on the user side.
  onUserSpeechStarted?: () => void;
  onUserSpeechStopped?: () => void;

  // Errors from the Realtime API.
  onError?: (error: { message: string; code?: string; type?: string }) => void;

  // Session metadata.
  onSessionCreated?: (session: { id: string } & Record<string, unknown>) => void;

  /** After each assistant `response.done`, lists function tools used in that response. */
  onAssistantResponseComplete?: (info: {
    toolNames: string[];
    responseId?: string;
  }) => void;
}

export interface AiEventRouter {
  // Feed a typed realtime event to the router. Usually wired as
  // `onKnownEvent` on useRealtimeConnection.
  routeEvent: (event: KnownRealtimeEvent) => void;
}

// Fans out a stream of KnownRealtimeEvent into domain-specific callbacks.
// The router:
//   1. Buffers tool-call argument deltas per call_id.
//   2. Parses arguments as JSON on `.done`.
//   3. Dispatches each known tool name to its handler.
//   4. Forwards transcripts / response lifecycle / errors / session events.
//
// Kept pure (no refs to the network or UI) so it can be unit-tested in
// isolation if we ever add tests.
export function useAiEventRouter(handlers: AiEventRouterHandlers): AiEventRouter {
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  // Buffered tool-call arguments keyed by call_id. Separate from any hook
  // state so the router doesn't cause re-renders.
  const toolBufferRef = useRef<Map<string, { name: string; args: string }>>(
    new Map()
  );

  const dispatchToolCall = useCallback(
    (callId: string, name: string, args: unknown) => {
      const h = handlersRef.current;
      switch (name) {
        case TOOL_ADD_TO_NOTEBOOK: {
          const typed = args as AddToNotebookArgs | undefined;
          const word = typed?.word;
          const english = typeof typed?.english === 'string' ? typed.english.trim() : undefined;
          if (typeof word === 'string' && word.trim().length > 0) {
            h.onNotebookEntry?.(word.trim(), english);
          } else {
            debug('add_to_notebook: missing or empty word', args);
          }
          break;
        }
        case TOOL_MARK_CONCEPT_TAUGHT: {
          const concept = (args as MarkConceptTaughtArgs | undefined)?.concept;
          if (typeof concept === 'string' && concept.trim().length > 0) {
            h.onConceptTaught?.(concept.trim());
          }
          break;
        }
        case TOOL_MARK_SPEAKING_PROMPT: {
          h.onSpeakingPrompt?.();
          break;
        }
        case TOOL_REQUEST_WRITING_EXERCISE: {
          const data = args as RequestWritingExerciseArgs | undefined;
          if (
            data &&
            typeof data.prompt === 'string' &&
            typeof data.exerciseType === 'string'
          ) {
            h.onWritingExerciseRequest?.(data);
          } else {
            debug('request_writing_exercise: invalid args', args);
          }
          break;
        }
        case TOOL_REQUEST_END_LESSON: {
          const typed = (args as RequestEndLessonArgs) ?? { reason: '' };
          h.onEndLessonRequest?.(callId, typed);
          break;
        }
        case TOOL_MARK_ITEM_REVIEWED: {
          const data = args as MarkItemReviewedArgs | undefined;
          if (
            data &&
            (data.kind === 'vocab' || data.kind === 'error') &&
            typeof data.spanish === 'string' &&
            data.spanish.trim().length > 0 &&
            ['again', 'hard', 'good', 'easy'].includes(data.performance)
          ) {
            h.onItemReviewed?.({
              kind: data.kind,
              spanish: data.spanish.trim(),
              performance: data.performance,
            });
          } else {
            debug('mark_item_reviewed: invalid args', args);
          }
          break;
        }
        case TOOL_REQUEST_PRONUNCIATION_DRILL: {
          const data = args as RequestPronunciationDrillArgs | undefined;
          if (
            data &&
            typeof data.drillType === 'string' &&
            Array.isArray(data.items) &&
            data.items.length > 0 &&
            typeof data.target === 'string'
          ) {
            h.onPronunciationDrill?.(data);
          } else {
            debug('request_pronunciation_drill: invalid args', args);
          }
          break;
        }
        case TOOL_REQUEST_LISTENING_EXERCISE: {
          const data = args as RequestListeningExerciseArgs | undefined;
          if (
            data &&
            typeof data.scene === 'string' &&
            data.scene.trim().length > 0 &&
            typeof data.comprehensionQuestion === 'string' &&
            typeof data.correctAnswer === 'string'
          ) {
            h.onListeningExercise?.(data);
          } else {
            debug('request_listening_exercise: invalid args', args);
          }
          break;
        }
        case TOOL_REQUEST_READING_PASSAGE: {
          const data = args as RequestReadingPassageArgs | undefined;
          if (data && typeof data.text === 'string' && data.text.trim().length > 0) {
            h.onReadingPassage?.(data);
          } else {
            debug('request_reading_passage: invalid args', args);
          }
          break;
        }
        case TOOL_REQUEST_FLUENCY_SPRINT: {
          const data = args as RequestFluencySprintArgs | undefined;
          if (
            data &&
            typeof data.sentence === 'string' &&
            data.sentence.trim().length > 0
          ) {
            h.onFluencySprint?.(data);
          } else {
            debug('request_fluency_sprint: invalid args', args);
          }
          break;
        }
        case TOOL_REMEMBER_STUDENT_FACT: {
          const data = args as RememberStudentFactArgs | undefined;
          if (
            data &&
            typeof data.key === 'string' &&
            data.key.trim().length > 0 &&
            typeof data.value === 'string' &&
            data.value.trim().length > 0
          ) {
            h.onRememberStudentFact?.({
              key: data.key.trim(),
              value: data.value.trim(),
            });
          } else {
            debug('remember_student_fact: invalid args', args);
          }
          break;
        }
        default:
          debug('Unknown tool call received:', name, args);
      }
    },
    []
  );

  const routeEvent = useCallback(
    (event: KnownRealtimeEvent) => {
      const h = handlersRef.current;
      switch (event.type) {
        case 'session.created':
          h.onSessionCreated?.(event.session);
          break;

        case 'response.created':
          h.onResponseStart?.();
          break;

        case 'response.done': {
          h.onResponseEnd?.();
          const toolNames = extractToolNamesFromResponseDone(event);
          const rid = event.response?.id;
          h.onAssistantResponseComplete?.({
            toolNames,
            responseId: typeof rid === 'string' ? rid : undefined,
          });
          break;
        }

        case 'response.audio_transcript.delta':
          h.onAiTranscriptDelta?.(event.delta);
          break;

        case 'response.audio_transcript.done':
          h.onAiTranscriptDone?.(event.transcript);
          break;

        case 'conversation.item.input_audio_transcription.completed':
          h.onUserTranscript?.(event.transcript);
          break;

        case 'input_audio_buffer.speech_started':
          h.onUserSpeechStarted?.();
          break;

        case 'input_audio_buffer.speech_stopped':
          h.onUserSpeechStopped?.();
          break;

        case 'response.function_call_arguments.delta': {
          const entry = toolBufferRef.current.get(event.call_id) ?? {
            name: event.name ?? '',
            args: '',
          };
          if (!entry.name && event.name) entry.name = event.name;
          entry.args += event.delta;
          toolBufferRef.current.set(event.call_id, entry);
          break;
        }

        case 'response.function_call_arguments.done': {
          const entry = toolBufferRef.current.get(event.call_id);
          const name = event.name || entry?.name || '';
          const rawArgs = event.arguments ?? entry?.args ?? '';
          toolBufferRef.current.delete(event.call_id);
          let parsed: unknown = undefined;
          if (rawArgs) {
            try {
              parsed = JSON.parse(rawArgs);
            } catch (err) {
              debug('Failed to parse tool-call arguments', {
                name,
                rawArgs,
                err,
              });
            }
          }
          dispatchToolCall(event.call_id, name, parsed);
          break;
        }

        case 'error':
          h.onError?.(event.error);
          break;

        default: {
          const _exhaustive: never = event;
          void _exhaustive;
        }
      }
    },
    [dispatchToolCall]
  );

  return { routeEvent };
}
