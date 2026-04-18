'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/app/providers';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  RefreshCw,
  CheckCircle,
  BookOpen,
  Brain,
  AlertTriangle,
  Trophy,
  Loader2,
  Eye,
  Clock,
  TrendingUp,
} from 'lucide-react';
import type { ReviewItem } from '@/lib/review/types';

// Anki-style 4-button rating. Values chosen so they map cleanly onto SM-2:
//   Again  -> 1 (fail, resets interval)
//   Hard   -> 3 (borderline success, shorter-than-default growth)
//   Good   -> 4 (standard success)
//   Easy   -> 5 (strong success, bigger interval jump via larger E-factor)
const RATINGS: Array<{
  rating: 1 | 3 | 4 | 5;
  label: string;
  labelEs: string;
  intent: 'again' | 'hard' | 'good' | 'easy';
}> = [
  { rating: 1, label: 'Again', labelEs: 'Otra vez', intent: 'again' },
  { rating: 3, label: 'Hard', labelEs: 'Difícil', intent: 'hard' },
  { rating: 4, label: 'Good', labelEs: 'Bien', intent: 'good' },
  { rating: 5, label: 'Easy', labelEs: 'Fácil', intent: 'easy' },
];

const RATING_STYLES: Record<(typeof RATINGS)[number]['intent'], string> = {
  again:
    'bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/20',
  hard: 'bg-warning/10 hover:bg-warning/20 text-warning border-warning/20',
  good: 'bg-primary/10 hover:bg-primary/20 text-primary border-primary/20',
  easy: 'bg-success/10 hover:bg-success/20 text-success border-success/20',
};

export default function ReviewQueue() {
  const { user } = useAuth();
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guard against double-submits: even when the button is disabled, a stray
  // event (touch + click, keyboard repeat) can fire twice.
  const submittingRef = useRef(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/review/queue', { cache: 'no-store' });
      if (!res.ok) throw new Error(`Queue fetch failed: ${res.status}`);
      const data = (await res.json()) as { items: ReviewItem[] };
      setItems(data.items ?? []);
      setCurrentIndex(0);
      setShowAnswer(false);
      setReviewedCount(0);
      setSessionComplete(false);
    } catch (err) {
      console.error(err);
      setError('Could not load your review queue. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchItems();
  }, [user, fetchItems]);

  const handleRating = async (rating: 1 | 3 | 4 | 5) => {
    if (submittingRef.current) return;
    const current = items[currentIndex];
    if (!current) return;

    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/review/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: current.kind,
          progressId: current.progressId,
          rating,
        }),
      });
      if (!res.ok) throw new Error(`Rate failed: ${res.status}`);

      setReviewedCount((c) => c + 1);

      if (currentIndex < items.length - 1) {
        setCurrentIndex((i) => i + 1);
        setShowAnswer(false);
      } else {
        setSessionComplete(true);
      }
    } catch (err) {
      console.error(err);
      setError('Could not save your rating. Please try again.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto container-padding py-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary mr-3" />
                <div className="text-muted-foreground">
                  Cargando elementos de repaso...
                  <span className="text-xs block">Loading review items</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (sessionComplete) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto container-padding py-8">
          <Card className="bg-success/5 border-success/20">
            <CardContent className="p-8 text-center">
              <Trophy className="h-16 w-16 text-success mx-auto mb-4" />
              <CardTitle className="text-2xl text-success mb-2">
                ¡Sesión de Repaso Completada!
                <div className="text-lg font-normal text-muted-foreground">
                  Review Session Complete!
                </div>
              </CardTitle>
              <p className="text-muted-foreground mb-6">
                Repasaste {reviewedCount} elemento
                {reviewedCount !== 1 ? 's' : ''} hoy
                <span className="text-xs block">
                  You reviewed {reviewedCount} item
                  {reviewedCount !== 1 ? 's' : ''} today
                </span>
              </p>
              <div className="space-y-4">
                <Button onClick={fetchItems} className="btn-primary">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Repasar Más Elementos
                </Button>
                <p className="text-sm text-muted-foreground">
                  ¡Vuelve mañana para tu próxima sesión de repetición espaciada!
                  <span className="text-xs block">
                    Come back tomorrow for your next spaced repetition session!
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto container-padding py-8">
          <Card>
            <CardContent className="p-12 text-center">
              <CheckCircle className="h-20 w-20 text-success mx-auto mb-6" />
              <CardTitle className="text-3xl text-foreground mb-3">
                ¡Todo al Día!
                <div className="text-xl font-normal text-muted-foreground mt-1">
                  All Caught Up!
                </div>
              </CardTitle>
              <p className="text-muted-foreground text-lg max-w-md mx-auto">
                No hay elementos pendientes de repaso ahora.
                <span className="text-base block mt-1">
                  No items due for review right now.
                </span>
              </p>
              <div className="mt-8 text-sm text-muted-foreground">
                ¡Completa más lecciones para añadir contenido a tu cola de
                repaso!
                <span className="text-xs block mt-1">
                  Complete more lessons to add content to your review queue!
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const current = items[currentIndex];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto container-padding py-8 space-y-6">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="p-3 bg-primary/10 rounded-lg">
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
              <div>
                <CardTitle className="text-3xl text-primary">
                  Práctica de Repaso
                  <div className="text-lg font-normal text-muted-foreground">
                    Review Practice
                  </div>
                </CardTitle>
              </div>
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Sistema de repetición espaciada - Repasa vocabulario, habilidades
              y correcciones de errores
              <span className="text-xs block">
                Spaced repetition system - Review vocabulary, skills, and error
                corrections
              </span>
            </p>
          </CardHeader>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">
                Pregunta {currentIndex + 1} de {items.length}
                <span className="text-xs block">
                  Question {currentIndex + 1} of {items.length}
                </span>
              </span>
              <Badge variant="outline">
                {Math.round(((currentIndex + 1) / items.length) * 100)}%
              </Badge>
            </div>
            <div className="bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${((currentIndex + 1) / items.length) * 100}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>

        {error && (
          <Card className="bg-destructive/5 border-destructive/20">
            <CardContent className="p-4 text-sm text-destructive">
              {error}
            </CardContent>
          </Card>
        )}

        <Card className="card-elevated">
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <TypeBadge kind={current.kind} errorType={getErrorType(current)} />
              </div>

              <ReviewFront item={current} />

              {current.kind === 'vocab' && current.sourceLesson && (
                <div className="text-sm text-muted-foreground">
                  De la lección: {current.sourceLesson}
                  <span className="text-xs block">
                    From lesson: {current.sourceLesson}
                  </span>
                </div>
              )}

              <div className="flex justify-center gap-6 text-sm">
                <div className="flex items-center gap-1 text-success">
                  <CheckCircle className="h-3 w-3" />
                  {current.successes} correctas
                </div>
                <div className="flex items-center gap-1 text-destructive">
                  <AlertTriangle className="h-3 w-3" />
                  {current.failures} incorrectas
                </div>
                <div className="flex items-center gap-1 text-primary">
                  <TrendingUp className="h-3 w-3" />
                  Facilidad: {current.easiness.toFixed(1)}
                </div>
              </div>

              {showAnswer && <ReviewBack item={current} />}

              {!showAnswer ? (
                <Button
                  onClick={() => setShowAnswer(true)}
                  className="btn-primary text-lg px-8 py-3"
                >
                  <Eye className="h-5 w-5 mr-2" />
                  Mostrar Respuesta
                </Button>
              ) : (
                <RatingButtons
                  onRate={handleRating}
                  disabled={submitting}
                  kind={current.kind}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function getErrorType(item: ReviewItem): string | undefined {
  return item.kind === 'error' ? item.errorType : undefined;
}

function TypeBadge({
  kind,
  errorType,
}: {
  kind: ReviewItem['kind'];
  errorType?: string;
}) {
  if (kind === 'vocab') {
    return (
      <Badge className="bg-success/10 text-success border-success/20">
        <BookOpen className="h-3 w-3 mr-1" />
        Vocabulario
      </Badge>
    );
  }
  return (
    <Badge className="bg-destructive/10 text-destructive border-destructive/20">
      <AlertTriangle className="h-3 w-3 mr-1" />
      Práctica de Error{errorType ? ` (${errorType})` : ''}
    </Badge>
  );
}

function ReviewFront({ item }: { item: ReviewItem }) {
  if (item.kind === 'error') {
    return (
      <div className="space-y-3">
        <div className="text-sm text-muted-foreground">
          Corrige este error · Correct this error
        </div>
        <div className="text-3xl font-bold text-foreground py-2">
          &quot;{item.originalError}&quot;
        </div>
      </div>
    );
  }

  return (
    <div className="text-4xl font-bold text-foreground py-4">{item.front}</div>
  );
}

function ReviewBack({ item }: { item: ReviewItem }) {
  return (
    <div className="border-t border-border pt-6 space-y-4">
      {item.kind === 'error' ? (
        <>
          <Card className="bg-destructive/5 border-destructive/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-destructive mb-1">
                    Tu Error:
                  </div>
                  <div className="text-lg font-semibold text-foreground">
                    &quot;{item.originalError}&quot;
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-success/5 border-success/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-success mb-1">
                    Correcto:
                  </div>
                  <div className="text-2xl font-semibold text-foreground">
                    &quot;{item.correction}&quot;
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          {item.note && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <Brain className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-primary mb-1">
                      Consejo · Tip:
                    </div>
                    <div className="text-sm text-foreground">{item.note}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="text-2xl font-medium text-foreground text-center">
              {item.back}
            </div>
          </CardContent>
        </Card>
      )}
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-3 w-3" />
        Próximo repaso en {item.intervalDays} día
        {item.intervalDays !== 1 ? 's' : ''}
        <span className="text-xs">
          • Next review in {item.intervalDays} day
          {item.intervalDays !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
}

function RatingButtons({
  onRate,
  disabled,
  kind,
}: {
  onRate: (rating: 1 | 3 | 4 | 5) => void;
  disabled: boolean;
  kind: ReviewItem['kind'];
}) {
  return (
    <div className="space-y-6">
      <div className="text-lg font-semibold text-foreground">
        ¿Qué tan bien lo sabías?
        <div className="text-sm font-normal text-muted-foreground">
          How well did you know this?
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {RATINGS.map(({ rating, label, labelEs, intent }) => (
          <Button
            key={rating}
            variant="outline"
            disabled={disabled}
            onClick={() => onRate(rating)}
            className={`${RATING_STYLES[intent]} border h-auto py-3 px-4`}
          >
            <div className="flex flex-col items-center gap-1">
              <span className="text-sm font-semibold">{labelEs}</span>
              <span className="text-xs opacity-75">{label}</span>
            </div>
          </Button>
        ))}
      </div>
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="text-xs text-muted-foreground text-center max-w-lg mx-auto">
            {kind === 'error' ? (
              <>
                Tu calificación ayuda al sistema a decidir cuándo practicar
                esta corrección nuevamente.
                <span className="text-xs block mt-1 opacity-75">
                  Your rating helps the system decide when to practice this
                  correction again.
                </span>
              </>
            ) : (
              <>
                Tu calificación ayuda al algoritmo SM-2 a decidir cuándo
                mostrar este elemento otra vez.
                <span className="text-xs block mt-1 opacity-75">
                  Your rating helps the SM-2 algorithm decide when to show this
                  item again.
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
