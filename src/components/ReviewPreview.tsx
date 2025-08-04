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

      // Count error items that need review (errors with high frequency)
      const { count: errorCount } = await supabase
        .from('error_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .gte('count', 2);

      // Count homework-based items (submissions with low scores)
      const { data: homeworkItems } = await supabase
        .from('submissions')
        .select('grade_json')
        .eq('user_id', user!.id)
        .not('grade_json', 'is', null)
        .lt('score', 80)
        .limit(5);

      // Count homework review items (apply same filtering as ReviewQueue)
      let homeworkReviewCount = 0;
      if (homeworkItems) {
        homeworkItems.forEach(submission => {
          // Only count specific focus areas (filter out generic ones)
          if (submission.grade_json?.next_focus) {
            const specificFocusAreas = submission.grade_json.next_focus.filter((focus: string) => 
              isSpecificFocusArea(focus)
            );
            homeworkReviewCount += specificFocusAreas.length;
          }
          
          // Count vocabulary items
          if (submission.grade_json?.srs_add) {
            homeworkReviewCount += submission.grade_json.srs_add.length;
          }
          
          // Count specific corrections (filter out generic ones)
          if (submission.grade_json?.corrections) {
            const specificCorrections = submission.grade_json.corrections.filter((correction: string) => 
              correction && correction.length > 10 && !isGenericCorrection(correction)
            );
            homeworkReviewCount += Math.min(specificCorrections.length, 3); // Limit corrections to 3 per submission
          }
        });
      }

      // Get next review time (earliest due date after now)
      const { data: nextReview } = await supabase
        .from('vocab_progress')
        .select('next_due')
        .eq('user_id', user!.id)
        .gt('next_due', now)
        .order('next_due', { ascending: true })
        .limit(1)
        .single();

      const totalItems = (vocabCount || 0) + (skillCount || 0) + (errorCount || 0) + homeworkReviewCount;

      setReviewSummary({
        totalDue: totalItems,
        vocabDue: vocabCount || 0,
        skillsDue: (skillCount || 0) + (errorCount || 0) + homeworkReviewCount, // Group non-vocab items
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

/**
 * Check if a focus area is specific enough to be useful for review
 * (Shared logic with ReviewQueue component)
 */
function isSpecificFocusArea(focus: string): boolean {
  const focusLower = focus.toLowerCase();
  
  // Filter out generic/unhelpful focus areas
  const genericPhrases = [
    'mejorar la gramática',
    'mejorar el vocabulario', 
    'practicar más',
    'estudiar más',
    'mejorar la pronunciación',
    'ser más específico',
    'usar más palabras',
    'especially',
    'especialmente en la conjugación de verbos',
  ];
  
  // If it contains generic phrases and is long, it's probably too generic
  const hasGenericPhrase = genericPhrases.some(phrase => focusLower.includes(phrase));
  if (hasGenericPhrase && focus.length > 50) {
    return false;
  }
  
  // Accept specific focus areas (short and specific, or mentions specific grammar points)
  const specificPhrases = [
    'ser vs estar',
    'por vs para', 
    'subjunctive',
    'preterite',
    'imperfect',
    'agreement',
    'gender',
    'tilde',
    'accent'
  ];
  
  const hasSpecificPhrase = specificPhrases.some(phrase => focusLower.includes(phrase));
  if (hasSpecificPhrase) {
    return true;
  }
  
  // Accept if it's short and specific (likely mentions a specific word or phrase)
  return focus.length < 40;
}

/**
 * Check if a correction is too generic to be useful
 * (Shared logic with ReviewQueue component)
 */
function isGenericCorrection(correction: string): boolean {
  const genericPhrases = [
    'check your grammar',
    'use correct verb form',
    'be more specific',
    'add more details',
    'improve vocabulary'
  ];
  
  const correctionLower = correction.toLowerCase();
  return genericPhrases.some(phrase => correctionLower.includes(phrase));
}