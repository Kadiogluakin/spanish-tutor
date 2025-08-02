'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/app/providers';
import { createClient } from '@/lib/supabase/client';
import { sm2 } from '@/lib/srs';

type ReviewItem = {
  id: string;
  type: 'vocab' | 'skill';
  content: string;
  translation?: string;
  nextDue: string;
  easiness: number;
  intervalDays: number;
  successes: number;
  failures: number;
  progressId: string;
  tags?: any;
};

export default function ReviewQueue() {
  const { user } = useAuth();
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchReviewItems();
    }
  }, [user]);

  const fetchReviewItems = async () => {
    try {
      const supabase = createClient();
      const now = new Date().toISOString();

      // Fetch vocabulary items due for review
      const { data: vocabItems, error: vocabError } = await supabase
        .from('vocab_progress')
        .select(`
          id,
          vocab_id,
          sm2_easiness,
          interval_days,
          next_due,
          successes,
          failures,
          vocabulary:vocab_id (
            id,
            spanish,
            english,
            tags
          )
        `)
        .eq('user_id', user!.id)
        .lte('next_due', now)
        .order('next_due', { ascending: true })
        .limit(10);

      if (vocabError) {
        console.error('Error fetching vocabulary for review:', vocabError);
      }

      // Fetch skill items due for review
      const { data: skillItems, error: skillError } = await supabase
        .from('skill_progress')
        .select('*')
        .eq('user_id', user!.id)
        .lte('next_due', now)
        .order('next_due', { ascending: true })
        .limit(5);

      if (skillError) {
        console.error('Error fetching skills for review:', skillError);
      }

      // Combine and format items
      const formattedItems: ReviewItem[] = [];

      // Add vocabulary items
      if (vocabItems) {
        vocabItems.forEach(item => {
          if (item.vocabulary) {
            formattedItems.push({
              id: item.vocab_id,
              type: 'vocab',
              content: item.vocabulary.spanish,
              translation: item.vocabulary.english,
              nextDue: item.next_due,
              easiness: item.sm2_easiness,
              intervalDays: item.interval_days,
              successes: item.successes,
              failures: item.failures,
              progressId: item.id,
              tags: item.vocabulary.tags
            });
          }
        });
      }

      // Add skill items
      if (skillItems) {
        skillItems.forEach(item => {
          formattedItems.push({
            id: item.skill_code,
            type: 'skill',
            content: getSkillDisplayName(item.skill_code),
            nextDue: item.next_due,
            easiness: item.sm2_easiness,
            intervalDays: item.interval_days,
            successes: item.successes,
            failures: item.failures,
            progressId: item.id
          });
        });
      }

      // Shuffle items for variety
      const shuffledItems = formattedItems.sort(() => Math.random() - 0.5);
      
      setReviewItems(shuffledItems);
      setLoading(false);

    } catch (error) {
      console.error('Error fetching review items:', error);
      setLoading(false);
    }
  };

  const getSkillDisplayName = (skillCode: string): string => {
    const skillNames: Record<string, string> = {
      'grammar': 'Spanish Grammar Rules',
      'vocabulary': 'Vocabulary Recognition',
      'pronunciation': 'Spanish Pronunciation',
      'fluency': 'Conversational Fluency'
    };
    return skillNames[skillCode] || skillCode;
  };

  const handleRating = async (rating: 0 | 1 | 2 | 3 | 4 | 5) => {
    const currentItem = reviewItems[currentIndex];
    if (!currentItem) return;

    try {
      const supabase = createClient();
      
      // Calculate new SRS values using SM-2 algorithm
      const currentState = {
        easiness: currentItem.easiness,
        interval: currentItem.intervalDays,
        reps: currentItem.successes
      };
      
      const newState = sm2(rating, currentState);
      const success = rating >= 3;
      
      // Calculate next due date
      const nextDue = new Date();
      nextDue.setDate(nextDue.getDate() + newState.interval);

      // Update progress in database
      const tableName = currentItem.type === 'vocab' ? 'vocab_progress' : 'skill_progress';
      
      const { error } = await supabase
        .from(tableName)
        .update({
          sm2_easiness: newState.easiness,
          interval_days: newState.interval,
          next_due: nextDue.toISOString(),
          successes: success ? currentItem.successes + 1 : currentItem.successes,
          failures: success ? currentItem.failures : currentItem.failures + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentItem.progressId);

      if (error) {
        console.error('Error updating progress:', error);
      }

      setReviewedCount(reviewedCount + 1);

      // Move to next item or complete session
      if (currentIndex < reviewItems.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setShowAnswer(false);
      } else {
        // Review session complete
        setSessionComplete(true);
      }

    } catch (error) {
      console.error('Error handling rating:', error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Review Queue</h2>
        <p className="text-sm text-neutral-600">Loading review items...</p>
      </div>
    );
  }

  if (sessionComplete) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Review Session Complete!</h2>
        <p className="text-gray-600 mb-4">
          You reviewed {reviewedCount} item{reviewedCount !== 1 ? 's' : ''} today.
        </p>
        <div className="space-y-3">
          <button
            onClick={() => {
              setSessionComplete(false);
              setCurrentIndex(0);
              setReviewedCount(0);
              fetchReviewItems();
            }}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            🔄 Review More Items
          </button>
          <div className="text-sm text-gray-500">
            Come back tomorrow for your next spaced repetition session!
          </div>
        </div>
      </div>
    );
  }

  if (reviewItems.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">All Caught Up!</h2>
        <p className="text-gray-600 mb-4">
          No items due for review right now. Great job staying on top of your Spanish!
        </p>
        <div className="text-sm text-gray-500">
          <div className="mb-2">💡 <strong>How the Review System Works:</strong></div>
          <div className="text-left space-y-1 max-w-md mx-auto">
            <div>• Words from your completed lessons appear here for review</div>
            <div>• Easy words appear less frequently (spaced repetition)</div>
            <div>• Difficult words come back sooner for more practice</div>
            <div>• Your ratings help the system learn your progress</div>
          </div>
          <div className="mt-4 font-medium">
            Complete more lessons to add vocabulary to your review queue!
          </div>
        </div>
      </div>
    );
  }

  const currentItem = reviewItems[currentIndex];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">📚 Vocabulary Review</h2>
        <p className="text-gray-600">
          Spaced repetition system - Review words from your completed lessons
        </p>
      </div>

      {/* Progress */}
      <div className="bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / reviewItems.length) * 100}%` }}
        ></div>
      </div>
      
      <div className="text-center text-sm text-gray-600">
        Question {currentIndex + 1} of {reviewItems.length}
      </div>

      {/* Review Card */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
        <div className="text-center space-y-6">
          {/* Word Type Badge */}
          <div className="flex justify-center">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              currentItem.type === 'vocab' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-blue-100 text-blue-800'
            }`}>
              {currentItem.type === 'vocab' ? '📚 Vocabulary' : '🎯 Skill'}
            </span>
          </div>

          {/* Main Content */}
          <div className="text-4xl font-bold text-gray-900 py-4">
            {currentItem.content}
          </div>
          
          {/* Tags for vocabulary */}
          {currentItem.type === 'vocab' && currentItem.tags && (
            <div className="text-sm text-gray-500">
              From lesson: {currentItem.tags.lesson || 'Unknown'}
            </div>
          )}

          {/* Progress Stats */}
          <div className="flex justify-center gap-6 text-sm text-gray-500">
            <div>✅ {currentItem.successes} correct</div>
            <div>❌ {currentItem.failures} incorrect</div>
            <div>📊 Ease: {currentItem.easiness.toFixed(1)}</div>
          </div>
          
          {/* Answer Section */}
          {showAnswer && currentItem.translation && (
            <div className="border-t pt-6 space-y-4">
              <div className="text-2xl text-gray-700 font-medium">
                {currentItem.translation}
              </div>
              <div className="text-sm text-gray-500">
                Next review in {currentItem.intervalDays} day{currentItem.intervalDays !== 1 ? 's' : ''}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {!showAnswer ? (
            <button
              onClick={() => setShowAnswer(true)}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors text-lg"
            >
              Show Answer
            </button>
          ) : (
            <div className="space-y-4">
              <div className="text-lg font-semibold text-gray-800">How well did you know this?</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <button
                  onClick={() => handleRating(0)}
                  className="px-4 py-3 text-sm bg-red-100 hover:bg-red-200 text-red-800 rounded-xl font-medium transition-colors"
                >
                  😵 No idea
                </button>
                <button
                  onClick={() => handleRating(1)}
                  className="px-4 py-3 text-sm bg-red-100 hover:bg-red-200 text-red-800 rounded-xl font-medium transition-colors"
                >
                  ❌ Wrong
                </button>
                <button
                  onClick={() => handleRating(2)}
                  className="px-4 py-3 text-sm bg-orange-100 hover:bg-orange-200 text-orange-800 rounded-xl font-medium transition-colors"
                >
                  😅 Hard
                </button>
                <button
                  onClick={() => handleRating(3)}
                  className="px-4 py-3 text-sm bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-xl font-medium transition-colors"
                >
                  🤔 OK
                </button>
                <button
                  onClick={() => handleRating(4)}
                  className="px-4 py-3 text-sm bg-green-100 hover:bg-green-200 text-green-800 rounded-xl font-medium transition-colors"
                >
                  ✅ Easy
                </button>
                <button
                  onClick={() => handleRating(5)}
                  className="px-4 py-3 text-sm bg-green-100 hover:bg-green-200 text-green-800 rounded-xl font-medium transition-colors"
                >
                  🚀 Perfect
                </button>
              </div>
              <div className="text-xs text-gray-500 max-w-lg mx-auto">
                Your rating helps the spaced repetition algorithm decide when to show this word again.
                Easy words appear less often, difficult words come back sooner.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}