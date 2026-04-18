'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  type MarkItemReviewedArgs,
  type RememberStudentFactArgs,
  type RequestFluencySprintArgs,
  type RequestListeningExerciseArgs,
  type RequestPronunciationDrillArgs,
  type RequestReadingPassageArgs,
  type RequestWritingExerciseArgs,
} from '@/lib/realtime-tools';
import { useAiEventRouter } from '@/hooks/useAiEventRouter';
import { useLessonControl } from '@/hooks/useLessonControl';
import { useLessonToolGate } from '@/hooks/useLessonToolGate';
import { useMicGate } from '@/hooks/useMicGate';
import { useMicLevel } from '@/hooks/useMicLevel';
import { useRealtimeConnection, type VoiceStatus } from '@/hooks/useRealtimeConnection';

interface VoiceHUDProps {
  onMessageReceived?: (message: unknown) => void;
  onTranscriptReceived?: (transcript: string, isUser: boolean, isStreaming?: boolean) => void;
  onNotebookEntry?: (text: string, english?: string) => void;
  onWritingExerciseRequest?: (exerciseData: RequestWritingExerciseArgs) => void;
  onWritingExerciseCompleted?: (answer: string) => void;
  onPronunciationDrill?: (args: RequestPronunciationDrillArgs) => void;
  onListeningExercise?: (args: RequestListeningExerciseArgs) => void;
  onReadingPassage?: (args: RequestReadingPassageArgs) => void;
  onFluencySprint?: (args: RequestFluencySprintArgs) => void;
  // Fired when the model successfully obtains permission to end the lesson
  // via the request_end_lesson tool. Parent should persist progress and show
  // the completed state.
  onLessonComplete?: () => void;
  currentLessonData?: unknown;
  // Stable lesson identifier for persisting milestone state across WebRTC
  // reconnects. If absent, lesson-control state is per-session only.
  lessonId?: string | null;
  conversationHistory?: Array<{
    id: string;
    timestamp: Date;
    type: 'user' | 'ai';
    content: string;
  }>;
  notebookEntries?: Array<{
    id: string;
    text: string;
    timestamp: Date;
    type: string;
  }>;
  /** Granular sub-level for remedial tool gates (matches token route). */
  effectiveSubLevel?: string;
  /** True while a drill or writing modal is open — blocks remedial response.create. */
  isExerciseModalOpen?: boolean;
  lessonTitle?: string;
  lessonObjectives?: string[];
}

export interface ListeningExerciseResultPayload {
  scene: string;
  comprehensionQuestion: string;
  userAnswer: string;
  wasCorrect: boolean;
  correctAnswer: string;
}

interface VoiceHUDRef {
  sendWritingExerciseResult: (result: { prompt: string; answer: string; exerciseType: string }) => void;
  sendListeningExerciseResult: (result: ListeningExerciseResultPayload) => void;
}

function postWritingExerciseFeedbackInstructions(subLevel: string): string {
  return (
    'Give concise feedback on the submitted writing (≤3 short sentences unless a touch more is needed). Match the English/Spanish instruction rules for sub-level ' +
    subLevel +
    '. In the same assistant turn you MUST call add_to_notebook for every new Spanish chunk you mention (include english gloss when the level requires it). ' +
    'Then open the next required class modal from the system prompt if the student still owes it this session—for A1.1 that usually means request_listening_exercise if not opened yet, or another request_writing_exercise micro-task; for B1+ use writing or listening after long oral-only stretches. ' +
    'Do not stop at voice-only praise if tools are still missing. Never fake-close the lesson without request_end_lesson with allowed:true.'
  );
}

function postListeningExerciseFeedbackInstructions(subLevel: string): string {
  return (
    'Briefly acknowledge the listening result in voice (≤2 short sentences). Do not read the whole Spanish scene again unless the student asks. ' +
    'In the same turn, call add_to_notebook for any new Spanish chunk you mention (gloss per sub-level ' +
    subLevel +
    '). Then continue with the next concrete teaching move, including opening the next required modal (writing, pronunciation, reading, etc.) when rules say so—avoid voice-only stalls.'
  );
}

const VoiceHUD = forwardRef<VoiceHUDRef, VoiceHUDProps>(({
  onMessageReceived,
  onTranscriptReceived,
  onNotebookEntry,
  onWritingExerciseRequest,
  onWritingExerciseCompleted,
  onPronunciationDrill,
  onListeningExercise,
  onReadingPassage,
  onFluencySprint,
  onLessonComplete,
  currentLessonData,
  lessonId = null,
  conversationHistory = [],
  notebookEntries = [],
  effectiveSubLevel = 'A1.1',
  isExerciseModalOpen = false,
  lessonTitle,
  lessonObjectives,
}, ref) => {
  // onWritingExerciseCompleted is currently unused here — the UI modal calls
  // it directly — but we keep it in the public prop surface for API stability.
  void onWritingExerciseCompleted;

  // Pieces of the media graph that become available asynchronously during
  // `connect`. Held as state (not refs) so dependent hooks re-subscribe when
  // a fresh stream/element arrives (e.g. after reconnect).
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [remoteAudioElement, setRemoteAudioElement] = useState<HTMLAudioElement | null>(null);
  const [remoteAudioStream, setRemoteAudioStream] = useState<MediaStream | null>(null);

  // ---------- Connection ----------
  const connection = useRealtimeConnection({
    onEvent: onMessageReceived,
    // Wired below after the router exists.
    onKnownEvent: (event) => routerRef.current?.routeEvent(event),
    onMediaStream: setMediaStream,
    onRemoteAudioElement: setRemoteAudioElement,
    onRemoteTrack: setRemoteAudioStream,
  });
  const { status, isRecording, connect, disconnect, sendEvent, setStatus } = connection;

  const toolGateEnabled =
    status === 'connected' ||
    status === 'speaking' ||
    status === 'listening';

  const toolGate = useLessonToolGate({
    sendEvent,
    subLevel: effectiveSubLevel,
    isExerciseModalOpen,
    voiceStatus: status,
    lessonTitle,
    lessonObjectives,
    lessonId,
    enabled: toolGateEnabled,
  });

  // ---------- Mic gate (mute-on-speak + signal-driven unmute) ----------
  const micGate = useMicGate({
    mediaStream,
    remoteAudioElement,
    remoteAudioStream,
  });

  // ---------- Mic level meter ----------
  const micLevel = useMicLevel(isRecording ? mediaStream : null);

  // ---------- Lesson control ----------
  const lessonControl = useLessonControl({
    lessonId,
    sendEvent,
    onLessonComplete,
  });

  // ---------- AI event router ----------
  // The router is built with handlers that bridge transcripts to the parent,
  // tool calls to lesson control, and response lifecycle to the mic gate.
  const router = useAiEventRouter({
    onNotebookEntry: (word, english) => {
      lessonControl.recordNotebookEntry();
      onNotebookEntry?.(word, english);
      // Fire-and-forget persistence so the item enters the SRS queue. We
      // intentionally don't await — the UI should update immediately, and
      // network failures here are non-fatal.
      void persistNotebookEntry(word, english, lessonId);
    },
    onItemReviewed: (args) => {
      void persistReviewMark(args);
    },
    onPronunciationDrill: (args) => {
      onPronunciationDrill?.(args);
    },
    onListeningExercise: (args) => {
      onListeningExercise?.(args);
    },
    onReadingPassage: (args) => {
      onReadingPassage?.(args);
    },
    onFluencySprint: (args) => {
      onFluencySprint?.(args);
    },
    onRememberStudentFact: (args) => {
      void persistStudentFact(args);
    },
    onConceptTaught: lessonControl.recordConcept,
    onSpeakingPrompt: lessonControl.recordSpeakingPrompt,
    onWritingExerciseRequest: (data) => {
      lessonControl.recordWritingExercise();
      onWritingExerciseRequest?.(data);
    },
    onEndLessonRequest: lessonControl.handleEndRequest,
    onAiTranscriptDelta: (delta) => {
      onTranscriptReceived?.(delta, false, true);
      setStatus('speaking');
    },
    onAiTranscriptDone: (transcript) => {
      onTranscriptReceived?.(transcript, false, false);
      setStatus('connected');
    },
    onUserTranscript: (transcript) => {
      onTranscriptReceived?.(transcript, true, false);
    },
    onResponseStart: () => {
      micGate.mute();
      setStatus('speaking');
    },
    onResponseEnd: () => {
      micGate.scheduleUnmute();
      setStatus('connected');
    },
    onAssistantResponseComplete: toolGate.onAssistantResponseComplete,
    onUserSpeechStarted: () => setStatus('listening'),
    onUserSpeechStopped: () => setStatus('connected'),
    onError: (error) => {
      console.error('Realtime API error:', error);
      micGate.forceUnmute();
      setStatus('error');
    },
    onSessionCreated: () => {
      // Session metadata arrived — start the lesson clock (hydrating from
      // localStorage if we're reconnecting into the same lesson).
      lessonControl.initSession();
    },
  });
  const routerRef = useRef(router);
  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  // Reset lesson state entirely when the lessonId changes to a different
  // non-null value — avoids inheriting stale milestones across lessons.
  const previousLessonIdRef = useRef<string | null>(lessonId);
  useEffect(() => {
    const prev = previousLessonIdRef.current;
    if (prev && lessonId && prev !== lessonId) {
      lessonControl.resetSession();
    }
    previousLessonIdRef.current = lessonId;
  }, [lessonId, lessonControl]);

  // ---------- Imperative handle: send writing exercise feedback ----------
  useImperativeHandle(
    ref,
    () => ({
      sendWritingExerciseResult: (result: { prompt: string; answer: string; exerciseType: string }) => {
        sendEvent({
          type: 'conversation.item.create',
          item: {
            type: 'message',
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: `[WRITING EXERCISE COMPLETED] Exercise: "${result.prompt}" - My written answer: "${result.answer}" - Please provide feedback on my answer.`,
              },
            ],
          },
        });
        sendEvent({
          type: 'response.create',
          response: {
            modalities: ['text', 'audio'],
            instructions: postWritingExerciseFeedbackInstructions(effectiveSubLevel),
            max_output_tokens: 450,
          },
        });
      },
      sendListeningExerciseResult: (result: ListeningExerciseResultPayload) => {
        sendEvent({
          type: 'conversation.item.create',
          item: {
            type: 'message',
            role: 'user',
            content: [
              {
                type: 'input_text',
                text:
                  `[LISTENING EXERCISE COMPLETED] Question: "${result.comprehensionQuestion}" — My answer: "${result.userAnswer}". ` +
                  `UI marked this as ${result.wasCorrect ? 'correct' : 'incorrect'}. ` +
                  `Do NOT read the full Spanish scene again unless the student asks. One short acknowledgment, then continue the next lesson step. Follow level language rules.`,
              },
            ],
          },
        });
        sendEvent({
          type: 'response.create',
          response: {
            modalities: ['text', 'audio'],
            instructions: postListeningExerciseFeedbackInstructions(effectiveSubLevel),
            max_output_tokens: 450,
          },
        });
      },
    }),
    [sendEvent, effectiveSubLevel]
  );

  // ---------- Connect / disconnect button handlers ----------
  const handleConnect = useCallback(() => {
    connect({
      customLessonData: currentLessonData,
      conversationHistory,
      notebookEntries,
    });
  }, [connect, currentLessonData, conversationHistory, notebookEntries]);

  const handleDisconnect = useCallback(() => {
    // Clear media subscriptions so mic-gate / mic-level hooks tear down
    // their analysers cleanly, and drop refs to the old audio element.
    setMediaStream(null);
    setRemoteAudioElement(null);
    setRemoteAudioStream(null);
    disconnect();
  }, [disconnect]);

  // ---------- UI helpers ----------
  const statusColor = getStatusColor(status);
  const statusText = getStatusText(status, conversationHistory.length > 0);

  return (
    <div className="space-y-3">
      <button
        onClick={status === 'idle' ? handleConnect : handleDisconnect}
        disabled={status === 'connecting' || status === 'disconnecting'}
        className={`w-full px-3 py-2 text-xs font-medium rounded-lg text-white transition-colors ${
          status === 'idle'
            ? 'bg-success hover:bg-success/90'
            : 'bg-destructive hover:bg-destructive/90'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {status === 'idle' ? 'Conectar' : 'Desconectar'}
      </button>

      <div className="flex items-center gap-2 min-h-[20px]">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColor}`} />
        <span className="text-xs text-muted-foreground line-clamp-1 flex-1">
          {statusText}
        </span>
      </div>

      {isRecording && (
        <div className="flex items-center gap-2">
          <div className="text-xs text-muted-foreground">Nivel:</div>
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-success to-warning transition-all duration-75"
              style={{ width: Math.min(micLevel / 2, 100) + '%' }}
            />
          </div>
        </div>
      )}
    </div>
  );
});

VoiceHUD.displayName = 'VoiceHUD';

export default VoiceHUD;

async function persistNotebookEntry(
  word: string,
  english: string | undefined,
  lessonId: string | null
): Promise<void> {
  try {
    const response = await fetch('/api/notebook/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spanish: word,
        english: english ?? '',
        lessonId,
      }),
    });
    if (!response.ok) {
      console.warn('[VoiceHUD] notebook/add failed', response.status);
    }
  } catch (err) {
    console.warn('[VoiceHUD] notebook/add error', err);
  }
}

async function persistReviewMark(args: MarkItemReviewedArgs): Promise<void> {
  try {
    const response = await fetch('/api/review/mark', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    });
    if (!response.ok) {
      console.warn('[VoiceHUD] review/mark failed', response.status);
    }
  } catch (err) {
    console.warn('[VoiceHUD] review/mark error', err);
  }
}

async function persistStudentFact(args: RememberStudentFactArgs): Promise<void> {
  try {
    const response = await fetch('/api/facts/remember', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    });
    if (!response.ok) {
      console.warn('[VoiceHUD] facts/remember failed', response.status);
    }
  } catch (err) {
    console.warn('[VoiceHUD] facts/remember error', err);
  }
}

function getStatusColor(status: VoiceStatus): string {
  switch (status) {
    case 'connected':
      return 'bg-success';
    case 'connecting':
      return 'bg-warning';
    case 'speaking':
      return 'bg-primary';
    case 'listening':
      return 'bg-purple-500';
    case 'error':
      return 'bg-destructive';
    default:
      return 'bg-muted-foreground';
  }
}

function getStatusText(status: VoiceStatus, hasConversationHistory: boolean): string {
  switch (status) {
    case 'connected':
      return hasConversationHistory ? 'Listo - Habla ahora' : 'Decí "Hola" para empezar';
    case 'connecting':
      return 'Conectando...';
    case 'speaking':
      return 'Profesora habla';
    case 'listening':
      return 'Escuchando...';
    case 'error':
      return 'Error conexión';
    case 'disconnecting':
      return 'Desconectando...';
    default:
      return 'Conectar voz';
  }
}
