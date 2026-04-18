'use client';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/app/providers';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RotateCcw, CheckCircle, Clock, BookOpen } from 'lucide-react';

interface ReviewSummary {
  totalDue: number;
  vocabDue: number;
  skillDue: number;
  errorDue: number;
  nextReviewTime?: string | null;
}

const INITIAL: ReviewSummary = {
  totalDue: 0,
  vocabDue: 0,
  skillDue: 0,
  errorDue: 0,
  nextReviewTime: null,
};

export default function ReviewPreview() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<ReviewSummary>(INITIAL);
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/review/summary', { cache: 'no-store' });
      if (!res.ok) throw new Error(`Summary fetch failed: ${res.status}`);
      const data = (await res.json()) as ReviewSummary;
      setSummary(data);
    } catch (err) {
      console.error('Error fetching review summary:', err);
      setSummary(INITIAL);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchSummary();
  }, [user, fetchSummary]);

  if (loading) {
    return (
      <Card className="card-elevated animate-pulse">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <RotateCcw className="w-5 h-5 text-blue-500/40" />
              </div>
              <div className="space-y-2">
                <div className="h-5 bg-muted rounded w-32" />
                <div className="h-4 bg-muted rounded w-24" />
              </div>
            </div>
            <div className="w-20 h-8 bg-muted rounded-lg" />
          </div>
          <div className="mt-4 h-3 bg-muted rounded w-48" />
        </CardContent>
      </Card>
    );
  }

  if (summary.totalDue === 0) {
    return (
      <Card className="card-elevated bg-success/5 border-success/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-success/10 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-foreground">¡Todo al día!</h3>
                <p className="text-sm text-muted-foreground">
                  All caught up · No reviews due right now
                </p>
              </div>
            </div>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="border-success/20 hover:bg-success/10"
            >
              <Link href="/review" className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                Ver Repasos
              </Link>
            </Button>
          </div>
          {summary.nextReviewTime && (
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>
                Próximo repaso:{' '}
                {new Date(summary.nextReviewTime).toLocaleDateString()}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-elevated bg-blue-500/5 border-blue-500/20">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
              <RotateCcw className="w-5 h-5 text-blue-500" />
            </div>
            <div className="space-y-1 min-w-0">
              <h3 className="font-semibold text-foreground text-sm sm:text-base">
                {summary.totalDue} elemento{summary.totalDue !== 1 ? 's' : ''}{' '}
                para repasar
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {summary.totalDue} item{summary.totalDue !== 1 ? 's' : ''} ready
                {summary.vocabDue > 0 && ` · ${summary.vocabDue} vocab`}
                {summary.skillDue > 0 && ` · ${summary.skillDue} skills`}
                {summary.errorDue > 0 && ` · ${summary.errorDue} errors`}
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="bg-blue-500 hover:bg-blue-600">
            <Link href="/review" className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4" />
              Comenzar
            </Link>
          </Button>
        </div>
        <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
          <BookOpen className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span className="line-clamp-2">
            La repetición espaciada te ayuda a recordar vocabulario
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
