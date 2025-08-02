'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from './providers';
import ReviewPreview from '@/components/ReviewPreview';
import LessonCatalogPreview from '@/components/LessonCatalogPreview';

interface LessonRecommendation {
  lesson: {
    id: string;
    title: string;
    cefr: string;
    unit: number;
    lesson: number;
    objectives: string[];
    difficulty: number;
    estimatedDuration: number;
    prerequisites?: string[];
  };
  reason: string;
  priority: number;
  type: 'new' | 'review' | 'remedial';
}

interface DailyLessonPlan {
  recommendedLesson: LessonRecommendation;
  alternativeLessons: LessonRecommendation[];
  reviewItems: number;
  streakDays: number;
  nextMilestone: string;
}

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const [lessonPlan, setLessonPlan] = useState<DailyLessonPlan | null>(null);
  const [loadingLesson, setLoadingLesson] = useState(false);

  // Fetch lesson of the day when user is authenticated
  useEffect(() => {
    if (user) {
      fetchLessonOfTheDay();
    }
  }, [user]);

  // Refresh lesson plan when the page becomes visible (user returns from lesson)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        fetchLessonOfTheDay();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

  const fetchLessonOfTheDay = async () => {
    setLoadingLesson(true);
    try {
      const response = await fetch('/api/lesson-of-day');
      if (response.ok) {
        const data = await response.json();
        setLessonPlan(data);
      } else {
        console.error('Failed to fetch lesson of the day');
      }
    } catch (error) {
      console.error('Error fetching lesson of the day:', error);
    } finally {
      setLoadingLesson(false);
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading your dashboard...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🇪🇸</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Spanish Tutor</h1>
          <p className="text-lg text-gray-600 mb-8">Please sign in to access your Spanish lessons.</p>
          <Link 
            className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            href="/auth/signin"
          >
            Sign In →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {user.email?.split('@')[0] || 'Student'}! 👋
        </h1>
        <p className="text-lg text-gray-600">
          Ready for your Spanish lesson today?
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Daily flow: Review → Lesson with voice & board → Homework → Progress tracking
        </p>
      </div>

      <main className="space-y-8">

      {/* Quick Access Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        <ReviewPreview />
        <LessonCatalogPreview />
      </div>

      {/* Daily Lesson Section */}
      {loadingLesson ? (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100 animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="bg-blue-200 rounded-full w-12 h-5"></div>
              <div className="bg-gray-200 rounded-full w-12 h-5"></div>
              <div className="bg-gray-100 rounded w-16 h-4"></div>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-orange-200 rounded"></div>
              <div className="w-12 h-4 bg-orange-200 rounded"></div>
            </div>
          </div>
          
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-6 bg-gray-300 rounded w-64 mb-1"></div>
              <div className="bg-green-200 rounded w-16 h-6"></div>
            </div>
            <div className="h-4 bg-gray-200 rounded w-80"></div>
          </div>
          
          <div className="flex gap-2">
            <div className="flex-1 h-12 bg-blue-200 rounded-lg"></div>
            <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
          </div>
          
          <div className="h-3 bg-gray-100 rounded w-48 mx-auto mt-2"></div>
        </div>
      ) : lessonPlan ? (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                {lessonPlan.recommendedLesson.lesson.cefr}
              </span>
              <span className="bg-gray-100 text-gray-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
                Unit {lessonPlan.recommendedLesson.lesson.unit}
              </span>
              <span className="text-xs text-neutral-600">
                ~{lessonPlan.recommendedLesson.lesson.estimatedDuration} min
              </span>
            </div>
            {lessonPlan.streakDays > 0 && (
              <div className="flex items-center gap-1 text-orange-600">
                <span className="text-sm">🔥</span>
                <span className="text-sm font-medium">{lessonPlan.streakDays} days</span>
              </div>
            )}
          </div>
          
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-gray-900">
                {lessonPlan.recommendedLesson.lesson.title}
              </h3>
              <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded">
                Lesson {lessonPlan.recommendedLesson.lesson.lesson}
              </span>
            </div>
            <p className="text-sm text-gray-600">
              {lessonPlan.recommendedLesson.reason}
            </p>
          </div>
          
          {lessonPlan.reviewItems > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800">
                📚 You have {lessonPlan.reviewItems} items ready for review
              </p>
            </div>
          )}
          
          <div className="flex gap-2">
            <Link 
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-center font-medium transition-colors"
              href="/lesson"
            >
              Start Lesson {lessonPlan.recommendedLesson.lesson.lesson} →
            </Link>
            <button
              onClick={fetchLessonOfTheDay}
              disabled={loadingLesson}
              className="px-3 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh lesson plan"
            >
              {loadingLesson ? '⟳' : '↻'}
            </button>
          </div>
          
          <p className="text-xs text-gray-500 mt-2 text-center">
            {lessonPlan.nextMilestone}
          </p>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-neutral-600">Unable to load lesson plan</p>
          <Link className="inline-block mt-2 px-4 py-2 bg-black text-white rounded-lg text-center text-sm" href="/lesson">
            Go to Lesson
          </Link>
        </div>
      )}



      {/* Main Navigation */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link 
          className="group px-6 py-4 bg-white hover:bg-gray-50 border border-gray-200 hover:border-blue-300 rounded-xl text-center transition-all duration-200 shadow-sm hover:shadow-md"
          href="/lessons"
        >
          <div className="text-2xl mb-2">📖</div>
          <div className="font-semibold text-gray-900 group-hover:text-blue-600">All Lessons</div>
          <div className="text-sm text-gray-500">Browse lesson catalog</div>
        </Link>
        <Link 
          className="group px-6 py-4 bg-white hover:bg-gray-50 border border-gray-200 hover:border-blue-300 rounded-xl text-center transition-all duration-200 shadow-sm hover:shadow-md"
          href="/homework"
        >
          <div className="text-2xl mb-2">📝</div>
          <div className="font-semibold text-gray-900 group-hover:text-blue-600">Homework</div>
          <div className="text-sm text-gray-500">Complete assignments</div>
        </Link>
        <Link 
          className="group px-6 py-4 bg-white hover:bg-gray-50 border border-gray-200 hover:border-blue-300 rounded-xl text-center transition-all duration-200 shadow-sm hover:shadow-md"
          href="/progress"
        >
          <div className="text-2xl mb-2">📈</div>
          <div className="font-semibold text-gray-900 group-hover:text-blue-600">Progress</div>
          <div className="text-sm text-gray-500">Track your learning</div>
        </Link>
        <Link 
          className="group px-6 py-4 bg-white hover:bg-gray-50 border border-gray-200 hover:border-blue-300 rounded-xl text-center transition-all duration-200 shadow-sm hover:shadow-md"
          href="/review"
        >
          <div className="text-2xl mb-2">📚</div>
          <div className="font-semibold text-gray-900 group-hover:text-blue-600">Review</div>
          <div className="text-sm text-gray-500">Practice vocabulary</div>
        </Link>
      </div>
      </main>
    </div>
  );
}