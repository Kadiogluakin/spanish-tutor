'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/app/providers';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

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

  useEffect(() => {
    if (user) {
      fetchReviewSummary();
    }
  }, [user]);

  const fetchReviewSummary = async () => {
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
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 p-4 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">📚</div>
            <div>
              <div className="h-5 bg-gray-300 rounded w-32 mb-1"></div>
              <div className="h-4 bg-gray-200 rounded w-24"></div>
            </div>
          </div>
          <div className="px-4 py-2 bg-gray-300 rounded-lg w-20 h-8"></div>
        </div>
        <div className="mt-2 h-3 bg-gray-200 rounded w-48"></div>
      </div>
    );
  }

  if (reviewSummary.totalDue === 0) {
    return (
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">✅</div>
            <div>
              <h3 className="font-semibold text-green-800">All caught up!</h3>
              <p className="text-sm text-green-600">No reviews due right now</p>
            </div>
          </div>
          <Link 
            href="/review"
            className="px-3 py-2 text-sm bg-green-100 hover:bg-green-200 text-green-800 rounded-lg transition-colors font-medium"
          >
            View Reviews
          </Link>
        </div>
        {reviewSummary.nextReviewTime && (
          <div className="mt-2 text-xs text-green-600">
            Next review: {new Date(reviewSummary.nextReviewTime).toLocaleDateString()}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-2xl">📚</div>
          <div>
            <h3 className="font-semibold text-blue-800">
              {reviewSummary.totalDue} item{reviewSummary.totalDue !== 1 ? 's' : ''} ready for review
            </h3>
            <p className="text-sm text-blue-600">
              {reviewSummary.vocabDue} vocabulary, {reviewSummary.skillsDue} skills
            </p>
          </div>
        </div>
        <Link 
          href="/review"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm"
        >
          Start Review
        </Link>
      </div>
      <div className="mt-2 text-xs text-blue-600">
        💡 Spaced repetition helps you remember vocabulary long-term
      </div>
    </div>
  );
}