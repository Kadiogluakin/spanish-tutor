// Discriminated union for the subset of OpenAI Realtime API events we
// actually consume over the RTCDataChannel. Keeping this narrow (rather than
// typing every event in the API) gives us exhaustiveness checking: if we
// handle a `switch (event.type)` with no default branch, TypeScript flags a
// missing case. Events we don't care about are collapsed into the
// `UnknownRealtimeEvent` fallback so unknown shapes don't break parsing.

export interface RealtimeSessionCreated {
  type: 'session.created';
  session: { id: string } & Record<string, unknown>;
}

export interface RealtimeResponseCreated {
  type: 'response.created';
  response?: { id?: string } & Record<string, unknown>;
}

export interface RealtimeResponseDone {
  type: 'response.done';
  response?: { id?: string; status?: string } & Record<string, unknown>;
}

export interface RealtimeAudioTranscriptDelta {
  type: 'response.audio_transcript.delta';
  delta: string;
  response_id?: string;
  item_id?: string;
}

export interface RealtimeAudioTranscriptDone {
  type: 'response.audio_transcript.done';
  transcript: string;
  response_id?: string;
  item_id?: string;
}

export interface RealtimeInputTranscriptionCompleted {
  type: 'conversation.item.input_audio_transcription.completed';
  transcript: string;
  item_id?: string;
}

export interface RealtimeSpeechStarted {
  type: 'input_audio_buffer.speech_started';
}

export interface RealtimeSpeechStopped {
  type: 'input_audio_buffer.speech_stopped';
}

// Tool calls stream their arguments as JSON text in deltas, terminated by a
// `.done` event that carries the full concatenated arguments string. We
// buffer by `call_id` and parse on `.done`.
export interface RealtimeFunctionCallArgumentsDelta {
  type: 'response.function_call_arguments.delta';
  call_id: string;
  name?: string;
  delta: string;
  response_id?: string;
  item_id?: string;
}

export interface RealtimeFunctionCallArgumentsDone {
  type: 'response.function_call_arguments.done';
  call_id: string;
  name: string;
  arguments: string;
  response_id?: string;
  item_id?: string;
}

export interface RealtimeError {
  type: 'error';
  error: {
    message: string;
    code?: string;
    type?: string;
  };
}

// Union of events we explicitly handle. Kept narrow so TypeScript can
// properly narrow inside a `switch (event.type)` and give us exhaustiveness
// checks in the default branch.
export type KnownRealtimeEvent =
  | RealtimeSessionCreated
  | RealtimeResponseCreated
  | RealtimeResponseDone
  | RealtimeAudioTranscriptDelta
  | RealtimeAudioTranscriptDone
  | RealtimeInputTranscriptionCompleted
  | RealtimeSpeechStarted
  | RealtimeSpeechStopped
  | RealtimeFunctionCallArgumentsDelta
  | RealtimeFunctionCallArgumentsDone
  | RealtimeError;

export type KnownRealtimeEventType = KnownRealtimeEvent['type'];

// Fallback shape for events the OpenAI Realtime API may emit that we don't
// explicitly model. Having the two cases split (known vs unknown) preserves
// discriminated-union narrowing for the ones we do handle.
export interface UnknownRealtimeEvent {
  type: string;
  [key: string]: unknown;
}

export type RealtimeEvent = KnownRealtimeEvent | UnknownRealtimeEvent;

const KNOWN_EVENT_TYPES: ReadonlySet<KnownRealtimeEventType> = new Set<
  KnownRealtimeEventType
>([
  'session.created',
  'response.created',
  'response.done',
  'response.audio_transcript.delta',
  'response.audio_transcript.done',
  'conversation.item.input_audio_transcription.completed',
  'input_audio_buffer.speech_started',
  'input_audio_buffer.speech_stopped',
  'response.function_call_arguments.delta',
  'response.function_call_arguments.done',
  'error',
]);

// True when the value is any plausible realtime event (i.e. an object with a
// string `type` field). Cheap runtime guard before dispatching.
export function isRealtimeEvent(value: unknown): value is RealtimeEvent {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { type?: unknown }).type === 'string'
  );
}

// Narrows a RealtimeEvent to one of our explicitly-handled variants, so a
// downstream `switch (event.type)` narrows correctly to the strongly-typed
// branch. Events not in `KNOWN_EVENT_TYPES` fail the guard and should be
// ignored or forwarded untyped.
export function isKnownRealtimeEvent(
  event: RealtimeEvent
): event is KnownRealtimeEvent {
  return KNOWN_EVENT_TYPES.has(event.type as KnownRealtimeEventType);
}
