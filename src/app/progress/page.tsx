'use client';

import { useState, useEffect } from 'react';
import ErrorDashboard from '@/components/ErrorDashboard';
import { createClient } from '@/lib/supabase/client';
import { getSkillProgressSummary, getVocabularyDueForReview } from '@/lib/progress-tracking';

interface SkillSummary {
  totalSkills: number;
  averageEasiness: number;
  skillBreakdown: Record<string, {
    easiness: number;
    successes: number;
    failures: number;
    nextDue: string;
    intervalDays: number;
  }>;
}

interface VocabReviewItem {
  id: string;
  vocabulary: {
    spanish: string;
    english: string;
    tags: any;
  };
  sm2_easiness: number;
  interval_days: number;
  next_due: string;
  successes: number;
  failures: number;
}

export default function ProgressPage() {
  const [skillSummary, setSkillSummary] = useState<SkillSummary | null>(null);
  const [vocabDue, setVocabDue] = useState<VocabReviewItem[]>([]);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProgressData();
  }, []);

  const fetchProgressData = async () => {
    try {
      const supabase = createClient();
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch skill progress summary
      // Note: This would normally call getSkillProgressSummary but it requires server context
      // For now, we'll fetch directly
      const { data: skillProgress } = await supabase
        .from('skill_progress')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (skillProgress && skillProgress.length > 0) {
        const summary: SkillSummary = {
          totalSkills: skillProgress.length,
          averageEasiness: skillProgress.reduce((sum, skill) => sum + skill.sm2_easiness, 0) / skillProgress.length,
          skillBreakdown: {}
        };

        skillProgress.forEach(skill => {
          summary.skillBreakdown[skill.skill_code] = {
            easiness: skill.sm2_easiness,
            successes: skill.successes,
            failures: skill.failures,
            nextDue: skill.next_due,
            intervalDays: skill.interval_days
          };
        });

        setSkillSummary(summary);
      }

      // Fetch vocabulary due for review
      const now = new Date().toISOString();
      const { data: vocabReview } = await supabase
        .from('vocab_progress')
        .select(`
          *,
          vocabulary:vocab_id (
            id,
            spanish,
            english,
            tags
          )
        `)
        .eq('user_id', user.id)
        .lte('next_due', now)
        .order('next_due', { ascending: true })
        .limit(10);

      setVocabDue(vocabReview || []);

      // Fetch recent learning sessions
      const { data: sessions } = await supabase
        .from('learning_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentSessions(sessions || []);

    } catch (error) {
      console.error('Error loading progress data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSkillIcon = (skillCode: string) => {
    switch (skillCode) {
      case 'grammar': return '📝';
      case 'vocabulary': return '📚';
      case 'pronunciation': return '🗣️';
      case 'fluency': return '💬';
      default: return '🎯';
    }
  };

  const getSkillColor = (easiness: number) => {
    if (easiness >= 2.5) return 'text-green-600 bg-green-50';
    if (easiness >= 2.0) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-64 bg-gray-200 rounded-lg"></div>
              <div className="h-64 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            📈 Learning Progress Dashboard
          </h1>
          <p className="text-xl text-gray-600">
            Track your Spanish learning journey with detailed analytics and insights
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Skill Progress Summary */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              🎯 Skill Progress
            </h2>
            
            {skillSummary && skillSummary.totalSkills > 0 ? (
              <>
                <div className="mb-4">
                  <div className="text-sm text-gray-600 mb-1">Average Skill Level</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {skillSummary.averageEasiness.toFixed(1)}/4.0
                  </div>
                </div>

                <div className="space-y-3">
                  {Object.entries(skillSummary.skillBreakdown).map(([skill, data]) => (
                    <div key={skill} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center">
                        <span className="text-lg mr-2">{getSkillIcon(skill)}</span>
                        <div>
                          <div className="font-medium capitalize">{skill}</div>
                          <div className="text-sm text-gray-600">
                            {data.successes} successes, {data.failures} failures
                          </div>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${getSkillColor(data.easiness)}`}>
                        {data.easiness.toFixed(1)}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">🚀</div>
                <div>Start learning to track your progress!</div>
                <div className="text-sm">Complete lessons to see your skill development.</div>
              </div>
            )}
          </div>

          {/* Vocabulary Review */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              📚 Vocabulary Review
            </h2>
            
            {vocabDue.length > 0 ? (
              <div className="space-y-3">
                <div className="text-sm text-gray-600 mb-3">
                  {vocabDue.length} word{vocabDue.length > 1 ? 's' : ''} due for review
                </div>
                
                {vocabDue.slice(0, 5).map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50">
                    <div>
                      <div className="font-medium">{item.vocabulary?.spanish}</div>
                      <div className="text-sm text-gray-600">{item.vocabulary?.english}</div>
                    </div>
                    <div className="text-xs text-gray-500">
                      Due: {new Date(item.next_due).toLocaleDateString()}
                    </div>
                  </div>
                ))}
                
                {vocabDue.length > 5 && (
                  <div className="text-sm text-gray-500 text-center py-2">
                    +{vocabDue.length - 5} more words due
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">✅</div>
                <div>No vocabulary due for review!</div>
                <div className="text-sm">You're all caught up.</div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Sessions */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            🕒 Recent Learning Sessions
          </h2>
          
          {recentSessions.length > 0 ? (
            <div className="space-y-3">
              {recentSessions.map(session => (
                <div key={session.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <div className="font-medium">
                      Lesson: {session.lesson_id || 'Unknown'}
                    </div>
                    <div className="text-sm text-gray-600">
                      {new Date(session.created_at).toLocaleDateString()} • {session.duration_min || 0} minutes
                    </div>
                    {session.summary && (
                      <div className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {session.summary}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📖</div>
              <div>No recent sessions</div>
              <div className="text-sm">Start a lesson to see your session history.</div>
            </div>
          )}
        </div>

        {/* Error Dashboard */}
        <ErrorDashboard />
      </div>
    </div>
  );
}