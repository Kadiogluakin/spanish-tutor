'use client';

// Listening-comprehension modal for `request_listening_exercise`.
// Plays the scene via OpenAI Speech API (same voice as Realtime / Profesora).
// Grading uses flexible matching; completion must notify the Realtime session
// so the teacher continues (see VoiceHUD).

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Headphones, Check, X, Volume2 } from 'lucide-react';
import type {
  RequestListeningExerciseArgs,
} from '@/lib/realtime-tools';
import {
  gradeListeningAnswer,
  resolveWinningOptionId,
} from '@/lib/listening-exercise-grade';

export interface ListeningExerciseCompletePayload {
  scene: string;
  comprehensionQuestion: string;
  userAnswer: string;
  wasCorrect: boolean;
  correctAnswer: string;
}

interface ListeningExerciseModalProps {
  isActive: boolean;
  exercise: RequestListeningExerciseArgs | null;
  /** After submit + Continuar, or X/Escape after submit — must resume voice session. */
  onFinished: (payload: ListeningExerciseCompletePayload) => void;
  /** Closed with X/Escape before answering. */
  onSkip?: () => void;
  /** While audio plays, parent should mute the outbound mic so VAD does not treat playback as the student. */
  onLocalPlaybackChange?: (playing: boolean) => void;
}

function stopAndRevoke(
  audio: HTMLAudioElement | null,
  url: string | null
): void {
  if (audio) {
    audio.pause();
    audio.src = '';
  }
  if (url) URL.revokeObjectURL(url);
}

export default function ListeningExerciseModal({
  isActive,
  exercise,
  onFinished,
  onSkip,
  onLocalPlaybackChange,
}: ListeningExerciseModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const fetchAbortRef = useRef<AbortController | null>(null);

  const cleanupAudio = useCallback(() => {
    fetchAbortRef.current?.abort();
    fetchAbortRef.current = null;
    stopAndRevoke(audioRef.current, objectUrlRef.current);
    audioRef.current = null;
    objectUrlRef.current = null;
    setIsSpeaking(false);
    setIsLoadingAudio(false);
    onLocalPlaybackChange?.(false);
  }, [onLocalPlaybackChange]);

  // Reset state whenever a new exercise is opened.
  useEffect(() => {
    if (isActive) {
      cleanupAudio();
      setPlaybackError(null);
      setSelectedId(null);
      setTypedAnswer('');
      setSubmitted(false);
      setWasCorrect(null);
      setHasPlayed(false);
    }
  }, [isActive, exercise, cleanupAudio]);

  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, [cleanupAudio]);

  const playScene = useCallback(async () => {
    if (!exercise?.scene?.trim() || typeof window === 'undefined') return;
    cleanupAudio();
    setPlaybackError(null);
    setIsLoadingAudio(true);
    onLocalPlaybackChange?.(false);

    const ac = new AbortController();
    fetchAbortRef.current = ac;

    try {
      const res = await fetch('/api/listening-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: exercise.scene }),
        signal: ac.signal,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          typeof err?.error === 'string' ? err.error : 'Could not load audio'
        );
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        cleanupAudio();
      };
      audio.onerror = () => {
        setPlaybackError('Playback failed. Try again.');
        cleanupAudio();
      };

      await audio.play();
      setIsLoadingAudio(false);
      setIsSpeaking(true);
      onLocalPlaybackChange?.(true);
      setHasPlayed(true);
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'AbortError') return;
      setPlaybackError(
        e instanceof Error ? e.message : 'Could not load audio. Try again.'
      );
      cleanupAudio();
    } finally {
      if (fetchAbortRef.current === ac) {
        fetchAbortRef.current = null;
      }
    }
  }, [exercise, cleanupAudio, onLocalPlaybackChange]);

  const finishWithResult = useCallback(() => {
    if (!exercise || wasCorrect === null) return;
    const hasOptions =
      Array.isArray(exercise.options) && exercise.options.length > 0;
    const userAnswer = hasOptions
      ? exercise.options!.find((o) => o.id === selectedId)?.label ?? selectedId ?? ''
      : typedAnswer.trim();
    onFinished({
      scene: exercise.scene,
      comprehensionQuestion: exercise.comprehensionQuestion,
      userAnswer,
      wasCorrect,
      correctAnswer: exercise.correctAnswer,
    });
  }, [
    exercise,
    wasCorrect,
    selectedId,
    typedAnswer,
    onFinished,
  ]);

  useEffect(() => {
    if (!isActive) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (submitted) finishWithResult();
        else onSkip?.();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isActive, submitted, finishWithResult, onSkip]);

  if (!isActive || !exercise) return null;

  const hasOptions =
    Array.isArray(exercise.options) && exercise.options.length > 0;

  const submit = () => {
    if (submitted) return;
    const correct = gradeListeningAnswer(
      exercise,
      hasOptions ? selectedId : null,
      typedAnswer
    );
    setSubmitted(true);
    setWasCorrect(correct);
  };

  const handleCloseButton = () => {
    if (submitted) finishWithResult();
    else onSkip?.();
  };

  const correctLabelForDisplay = (): string => {
    if (!hasOptions) return exercise.correctAnswer;
    const win = resolveWinningOptionId(exercise);
    if (win) {
      const lbl = exercise.options!.find((o) => o.id === win)?.label;
      if (lbl) return lbl;
    }
    const byId = exercise.options!.find(
      (o) => o.id === exercise.correctAnswer.trim()
    );
    if (byId) return byId.label;
    return exercise.correctAnswer;
  };

  const winningId = hasOptions ? resolveWinningOptionId(exercise) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-lg bg-background">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <Headphones className="w-5 h-5 text-primary" />
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  Listening comprehension
                </h2>
                <p className="text-xs text-muted-foreground">
                  Tap Play to hear the scene in Spanish (same AI voice as
                  Profesora). Headphones help in noisy rooms.
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleCloseButton} aria-label="Close">
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void playScene()}
              disabled={isSpeaking || isLoadingAudio}
              className="gap-1"
            >
              <Volume2 className="w-4 h-4" />
              {isLoadingAudio
                ? 'Loading…'
                : isSpeaking
                  ? 'Playing…'
                  : 'Play scene'}
            </Button>
            {hasPlayed && (
              <span className="text-xs text-muted-foreground">
                Heard it? Answer below.
              </span>
            )}
          </div>
          {playbackError && (
            <p className="text-xs text-destructive mb-3">{playbackError}</p>
          )}

          <div className="px-4 py-3 rounded-lg bg-muted/40 border border-border mb-4">
            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">
              Scene text (only if you missed audio)
            </p>
            <p className="text-base text-foreground italic">{exercise.scene}</p>
          </div>

          <p className="text-sm font-medium text-foreground mb-3">
            {exercise.comprehensionQuestion}
          </p>

          {hasOptions ? (
            <div className="space-y-2 mb-4">
              {exercise.options!.map((opt) => {
                const isSelected = selectedId === opt.id;
                const isWinningOption =
                  winningId !== null ? opt.id === winningId : false;
                const isCorrectChoice = submitted && isWinningOption;
                const isWrongChoice =
                  submitted && isSelected && wasCorrect === false;

                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => !submitted && setSelectedId(opt.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                      isCorrectChoice
                        ? 'bg-success/10 border-success text-foreground'
                        : isWrongChoice
                          ? 'bg-destructive/10 border-destructive text-foreground'
                          : isSelected
                            ? 'bg-primary/10 border-primary text-foreground'
                            : 'bg-card border-border text-foreground hover:bg-muted'
                    }`}
                    disabled={submitted}
                  >
                    <span className="text-sm">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <input
              type="text"
              value={typedAnswer}
              onChange={(e) => setTypedAnswer(e.target.value)}
              placeholder="Type your answer…"
              disabled={submitted}
              className="w-full mb-4 px-4 py-3 rounded-lg border border-border bg-card text-foreground"
            />
          )}

          {submitted && wasCorrect !== null && (
            <div
              className={`px-4 py-3 rounded-lg text-sm flex items-center gap-2 mb-4 ${
                wasCorrect === true
                  ? 'bg-success/10 text-success'
                  : 'bg-destructive/10 text-destructive'
              }`}
            >
              {wasCorrect === true ? (
                <>
                  <Check className="w-4 h-4 shrink-0" />
                  Nice — that matches.
                </>
              ) : (
                <>
                  <X className="w-4 h-4 shrink-0" />
                  Key answer:{' '}
                  <span className="font-semibold">{correctLabelForDisplay()}</span>
                </>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            {!submitted ? (
              <Button
                type="button"
                onClick={submit}
                disabled={hasOptions ? !selectedId : !typedAnswer.trim()}
              >
                Submit
              </Button>
            ) : (
              <Button type="button" onClick={finishWithResult} variant="default">
                Continue
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
