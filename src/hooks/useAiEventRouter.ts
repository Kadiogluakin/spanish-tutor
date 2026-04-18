'use client';

import { useCallback, useEffect, useRef } from 'react';
import { debug } from '@/lib/debug';
import { type KnownRealtimeEvent } from '@/types/realtime-events';
import {
  TOOL_ADD_TO_NOTEBOOK,
  TOOL_MARK_CONCEPT_TAUGHT,
  TOOL_MARK_SPEAKING_PROMPT,
  TOOL_REQUEST_END_LESSON,
  TOOL_REQUEST_WRITING_EXERCISE,
  type AddToNotebookArgs,
  type MarkConceptTaughtArgs,
  type RequestEndLessonArgs,
  type RequestWritingExerciseArgs,
} from '@/lib/realtime-tools';

// Handler callbacks for the events consumers care about. All are optional so
// callers only wire up what they need.
export interface AiEventRouterHandlers {
  // Teacher-side tool calls.
  onNotebookEntry?: (word: string) => void;
  onConceptTaught?: (concept: string) => void;
  onSpeakingPrompt?: () => void;
  onWritingExerciseRequest?: (data: RequestWritingExerciseArgs) => void;
  onEndLessonRequest?: (callId: string, args: RequestEndLessonArgs) => void;

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
          const word = (args as AddToNotebookArgs | undefined)?.word;
          if (typeof word === 'string' && word.trim().length > 0) {
            h.onNotebookEntry?.(word.trim());
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

        case 'response.done':
          h.onResponseEnd?.();
          break;

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
