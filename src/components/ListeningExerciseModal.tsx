'use client';

// Listening-comprehension modal for `request_listening_exercise`.
// Plays the scene via browser TTS (user gesture) so it is true listening,
// not silent reading. Grading uses flexible matching; completion must notify
// the Realtime session so the teacher continues (see VoiceHUD).

import { useCallback, useEffect, useState } from 'react';
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
}

function pickSpanishVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  const prefer = (v: SpeechSynthesisVoice) =>
    /es[-_]?(AR|419|MX|UY)?/i.test(v.lang) || v.lang.startsWith('es');
  return voices.find(prefer) ?? voices.find((v) => v.lang.startsWith('es')) ?? null;
}

export default function ListeningExerciseModal({
  isActive,
  exercise,
  onFinished,
  onSkip,
}: ListeningExerciseModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Reset state whenever a new exercise is opened.
  useEffect(() => {
    if (isActive) {
      setSelectedId(null);
      setTypedAnswer('');
      setSubmitted(false);
      setWasCorrect(null);
      setHasPlayed(false);
      setIsSpeaking(false);
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    }
  }, [isActive, exercise]);

  // Load voices (Chrome loads async).
  useEffect(() => {
    if (!isActive || typeof window === 'undefined') return;
    const sync = () => pickSpanishVoice();
    sync();
    window.speechSynthesis.onvoiceschanged = sync;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [isActive]);

  const playScene = useCallback(() => {
    if (!exercise?.scene || typeof window === 'undefined' || !window.speechSynthesis) {
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(exercise.scene);
    const v = pickSpanishVoice();
    if (v) u.voice = v;
    u.lang = v?.lang ?? 'es-AR';
    u.rate = 0.92;
    u.onstart = () => setIsSpeaking(true);
    u.onend = () => setIsSpeaking(false);
    u.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(u);
    setHasPlayed(true);
  }, [exercise]);

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
                  Tap Play to hear the scene in Spanish, then answer. (Browser
                  voice — use headphones in a quiet place.)
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
              onClick={playScene}
              disabled={isSpeaking}
              className="gap-1"
            >
              <Volume2 className="w-4 h-4" />
              {isSpeaking ? 'Playing…' : 'Play scene'}
            </Button>
            {hasPlayed && (
              <span className="text-xs text-muted-foreground">
                Heard it? Answer below.
              </span>
            )}
          </div>

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
