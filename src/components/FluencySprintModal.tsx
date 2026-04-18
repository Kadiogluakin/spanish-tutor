'use client';

// Fluency-sprint companion modal. The AI runs the drill in speech by modeling
// the sentence at slow → medium → fast and asking the student to repeat.
// This UI shows:
//   - the target sentence (big, for reading while speaking)
//   - a rep counter ("1 / 3", "2 / 3", ...) the student advances manually
//
// The purpose is just visual support. We don't grade pronunciation or
// measure timings; the Realtime AI gives in-voice feedback.

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Gauge, X, ChevronRight, RotateCcw } from 'lucide-react';
import type { RequestFluencySprintArgs } from '@/lib/realtime-tools';

interface FluencySprintModalProps {
  isActive: boolean;
  sprint: RequestFluencySprintArgs | null;
  onClose: () => void;
}

const PACE_LABELS = ['lento', 'medio', 'rápido', 'aún más rápido', 'máximo'];

export default function FluencySprintModal({
  isActive,
  sprint,
  onClose,
}: FluencySprintModalProps) {
  const totalReps = Math.max(1, Math.min(6, sprint?.reps ?? 3));
  const [repIndex, setRepIndex] = useState(0);

  useEffect(() => {
    if (isActive) setRepIndex(0);
  }, [isActive, sprint]);

  useEffect(() => {
    if (!isActive) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isActive, onClose]);

  if (!isActive || !sprint) return null;

  const isDone = repIndex >= totalReps;
  const currentPace = PACE_LABELS[Math.min(repIndex, PACE_LABELS.length - 1)];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-lg bg-background">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <Gauge className="w-5 h-5 text-primary" />
              <div>
                <h2 className="text-lg font-bold text-foreground">Fluency Sprint</h2>
                <p className="text-xs text-muted-foreground">
                  Repeat the sentence, getting faster each time.
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="px-4 py-5 rounded-lg bg-primary/5 border border-primary/20 mb-4">
            <p className="text-xl leading-relaxed font-medium text-foreground text-center">
              {sprint.sentence}
            </p>
          </div>

          <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-muted mb-4">
            <div>
              <p className="text-xs text-muted-foreground">Rep</p>
              <p className="text-lg font-semibold text-foreground">
                {Math.min(repIndex + 1, totalReps)} / {totalReps}
              </p>
            </div>
            {!isDone && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Ritmo</p>
                <p className="text-lg font-semibold text-foreground">
                  {currentPace}
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            {!isDone ? (
              <Button onClick={() => setRepIndex((i) => i + 1)}>
                Siguiente
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setRepIndex(0)}>
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Otra ronda
                </Button>
                <Button onClick={onClose}>Listo</Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
