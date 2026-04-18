'use client';

// Listening-comprehension modal. Shown when the AI calls
// `request_listening_exercise`. The AI is expected to narrate `scene` in
// Spanish over the voice channel; this UI shows visual context and, when
// provided, multiple-choice options in English. The student answers by
// clicking an option or typing a short response. Correctness is reported
// locally (and optionally via a callback) — we don't grade on the server
// because the AI will immediately confirm or correct in voice anyway.
//
// The crucial pedagogical point: at A1.1 and A1.2, the student is NOT
// required to speak Spanish here. Hearing-before-speaking respects the
// silent-period research.

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Headphones, Check, X } from 'lucide-react';
import type {
  ListeningExerciseOption,
  RequestListeningExerciseArgs,
} from '@/lib/realtime-tools';

interface ListeningExerciseModalProps {
  isActive: boolean;
  exercise: RequestListeningExerciseArgs | null;
  onAnswer?: (answer: string, correct: boolean) => void;
  onClose: () => void;
}

export default function ListeningExerciseModal({
  isActive,
  exercise,
  onAnswer,
  onClose,
}: ListeningExerciseModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null);

  // Reset state whenever a new exercise is opened.
  useEffect(() => {
    if (isActive) {
      setSelectedId(null);
      setTypedAnswer('');
      setSubmitted(false);
      setWasCorrect(null);
    }
  }, [isActive, exercise]);

  useEffect(() => {
    if (!isActive) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isActive, onClose]);

  if (!isActive || !exercise) return null;

  const hasOptions =
    Array.isArray(exercise.options) && exercise.options.length > 0;

  const submit = () => {
    if (submitted) return;
    const answer = hasOptions ? selectedId ?? '' : typedAnswer.trim();
    if (!answer) return;
    const correct =
      answer.toLowerCase() === exercise.correctAnswer.trim().toLowerCase();
    setSubmitted(true);
    setWasCorrect(correct);
    onAnswer?.(answer, correct);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-lg bg-background">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <Headphones className="w-5 h-5 text-primary" />
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  Listening Comprehension
                </h2>
                <p className="text-xs text-muted-foreground">
                  Listen to Profesora. You do not need to speak Spanish for this one.
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="px-4 py-3 rounded-lg bg-primary/5 border border-primary/20 mb-4">
            <p className="text-sm text-muted-foreground mb-1">The scene:</p>
            <p className="text-base text-foreground italic">{exercise.scene}</p>
          </div>

          <p className="text-sm font-medium text-foreground mb-3">
            {exercise.comprehensionQuestion}
          </p>

          {hasOptions ? (
            <div className="space-y-2 mb-4">
              {exercise.options!.map((opt: ListeningExerciseOption) => {
                const isSelected = selectedId === opt.id;
                const isCorrectChoice =
                  submitted && opt.id === exercise.correctAnswer;
                const isWrongChoice = submitted && isSelected && !wasCorrect;
                return (
                  <button
                    key={opt.id}
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
                wasCorrect
                  ? 'bg-success/10 text-success'
                  : 'bg-destructive/10 text-destructive'
              }`}
            >
              {wasCorrect ? (
                <>
                  <Check className="w-4 h-4" />
                  Nice! Correct answer.
                </>
              ) : (
                <>
                  <X className="w-4 h-4" />
                  Not quite — the correct answer is{' '}
                  <span className="font-semibold">{exercise.correctAnswer}</span>.
                </>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            {!submitted ? (
              <Button
                onClick={submit}
                disabled={hasOptions ? !selectedId : !typedAnswer.trim()}
              >
                Responder
              </Button>
            ) : (
              <Button onClick={onClose} variant="outline">
                Continuar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
