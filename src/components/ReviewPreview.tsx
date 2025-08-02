'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/providers';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, CheckCircle, Clock, BookOpen } from 'lucide-react';

interface ReviewSummary {
  totalDue: number;
  vocabDue: number;
  skillsDue: number;
  nextReviewTime?: string;
}

export default function ReviewPreview() {
  const { user } = useAuth();
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary>({ totalDue: 0, vocabDue: 0, skillsDue: 0 });
  const [loading, setLoading] = useState(true);

  const fetchReviewSummary = useCallback(async () => {
    try {
      const supabase = createClient();
      const now = new Date().toISOString();

      // Count vocabulary items due
      const { count: vocabCount } = await supabase
        .from('vocab_progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .lte('next_due', now);

      // Count skill items due
      const { count: skillCount } = await supabase
        .from('skill_progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .lte('next_due', now);

      // Get next review time (earliest due date after now)
      const { data: nextReview } = await supabase
        .from('vocab_progress')
        .select('next_due')
        .eq('user_id', user!.id)
        .gt('next_due', now)
        .order('next_due', { ascending: true })
        .limit(1)
        .single();

      setReviewSummary({
        totalDue: (vocabCount || 0) + (skillCount || 0),
        vocabDue: vocabCount || 0,
        skillsDue: skillCount || 0,
        nextReviewTime: nextReview?.next_due
      });

    } catch (error) {
      console.error('Error fetching review summary:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchReviewSummary();
    }
  }, [user, fetchReviewSummary]);



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
                <div className="h-5 bg-muted rounded w-32"></div>
                <div className="h-4 bg-muted rounded w-24"></div>
              </div>
            </div>
            <div className="w-20 h-8 bg-muted rounded-lg"></div>
          </div>
          <div className="mt-4 h-3 bg-muted rounded w-48"></div>
        </CardContent>
      </Card>
    );
  }

  if (reviewSummary.totalDue === 0) {
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
                <p className="text-sm text-muted-foreground">All caught up • No reviews due right now</p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm" className="border-success/20 hover:bg-success/10">
              <Link href="/review" className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                Ver Repasos
              </Link>
            </Button>
          </div>
          {reviewSummary.nextReviewTime && (
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>Próximo repaso: {new Date(reviewSummary.nextReviewTime).toLocaleDateString()}</span>
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
                {reviewSummary.totalDue} elemento{reviewSummary.totalDue !== 1 ? 's' : ''} para repasar
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {reviewSummary.totalDue} item{reviewSummary.totalDue !== 1 ? 's' : ''} ready
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
          <span className="line-clamp-2">La repetición espaciada te ayuda a recordar vocabulario</span>
        </div>
      </CardContent>
    </Card>
  );
}