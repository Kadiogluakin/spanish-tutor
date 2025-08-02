'use client';

import { useState, useEffect } from 'react';
import ErrorDashboard from '@/components/ErrorDashboard';
import { createClient } from '@/lib/supabase/client';
import { getSkillProgressSummary, getVocabularyDueForReview } from '@/lib/progress-tracking';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Target, 
  BookOpen, 
  MessageSquare, 
  Volume2, 
  CheckCircle, 
  Clock, 
  Calendar, 
  BarChart3,
  Brain,
  Loader2,
  Trophy,
  Flame,
  BookMarked,
  GraduationCap
} from 'lucide-react';

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
      case 'grammar': return <Target className="h-4 w-4" />;
      case 'vocabulary': return <BookOpen className="h-4 w-4" />;
      case 'pronunciation': return <Volume2 className="h-4 w-4" />;
      case 'fluency': return <MessageSquare className="h-4 w-4" />;
      default: return <Brain className="h-4 w-4" />;
    }
  };

  const getSkillColor = (easiness: number) => {
    if (easiness >= 2.5) return 'text-success bg-success/10 border-success/20';
    if (easiness >= 2.0) return 'text-warning bg-warning/10 border-warning/20';
    return 'text-destructive bg-destructive/10 border-destructive/20';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto container-padding py-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mr-3" />
            <div className="text-muted-foreground">
              Cargando progreso...
              <span className="text-xs block">Loading progress</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto container-padding py-8">
        <Card className="mb-8 bg-primary/5 border-primary/20">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="p-3 bg-primary/10 rounded-lg">
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
              <div>
                <CardTitle className="text-3xl text-primary">
                  Panel de Progreso
                  <div className="text-lg font-normal text-muted-foreground">Learning Progress Dashboard</div>
                </CardTitle>
              </div>
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Sigue tu viaje de aprendizaje del español con análisis detallados y perspectivas
              <span className="text-xs block">Track your Spanish learning journey with detailed analytics and insights</span>
            </p>
          </CardHeader>
        </Card>

        {/* Error Dashboard - Star Component */}
        <div className="mb-8">
          <ErrorDashboard />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Skill Progress Summary */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">
                  Progreso de Habilidades
                  <span className="text-sm font-normal text-muted-foreground ml-2">Skill Progress</span>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {skillSummary && skillSummary.totalSkills > 0 ? (
                <>
                  <Card className="mb-4 bg-primary/5 border-primary/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <BarChart3 className="h-4 w-4 text-primary" />
                        <div className="text-sm font-medium">
                          Nivel Promedio de Habilidades
                          <span className="text-xs text-muted-foreground ml-2">Average Skill Level</span>
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-primary">
                        {skillSummary.averageEasiness.toFixed(1)}/4.0
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-3">
                    {Object.entries(skillSummary.skillBreakdown).map(([skill, data]) => (
                      <Card key={skill} className="hover:border-primary/30 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                {getSkillIcon(skill)}
                              </div>
                              <div>
                                <div className="font-medium capitalize">{skill}</div>
                                <div className="text-sm text-muted-foreground">
                                  {data.successes} éxitos, {data.failures} fallos
                                  <span className="text-xs block">{data.successes} successes, {data.failures} failures</span>
                                </div>
                              </div>
                            </div>
                            <Badge className={`${getSkillColor(data.easiness)} border`}>
                              {data.easiness.toFixed(1)}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <div className="text-lg text-foreground mb-2">
                    ¡Comienza a aprender para seguir tu progreso!
                    <div className="text-sm text-muted-foreground">Start learning to track your progress!</div>
                  </div>
                  <p className="text-muted-foreground">
                    Completa lecciones para ver tu desarrollo de habilidades
                    <span className="text-xs block">Complete lessons to see your skill development</span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vocabulary Review */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BookMarked className="h-5 w-5 text-success" />
                <CardTitle className="text-lg">
                  Repaso de Vocabulario
                  <span className="text-sm font-normal text-muted-foreground ml-2">Vocabulary Review</span>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {vocabDue.length > 0 ? (
                <div className="space-y-3">
                  <Card className="bg-warning/5 border-warning/20">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-warning" />
                        <div className="text-sm font-medium text-warning">
                          {vocabDue.length} palabra{vocabDue.length > 1 ? 's' : ''} pendiente{vocabDue.length > 1 ? 's' : ''} de repaso
                          <span className="text-xs block text-muted-foreground">
                            {vocabDue.length} word{vocabDue.length > 1 ? 's' : ''} due for review
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {vocabDue.slice(0, 5).map(item => (
                    <Card key={item.id} className="hover:border-success/30 transition-colors">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-success/10 rounded-lg">
                              <BookOpen className="h-4 w-4 text-success" />
                            </div>
                            <div>
                              <div className="font-medium">{item.vocabulary?.spanish}</div>
                              <div className="text-sm text-muted-foreground">{item.vocabulary?.english}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className="text-xs">
                              <Calendar className="h-3 w-3 mr-1" />
                              {new Date(item.next_due).toLocaleDateString()}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {vocabDue.length > 5 && (
                    <div className="text-sm text-muted-foreground text-center py-2">
                      +{vocabDue.length - 5} más palabras pendientes
                      <span className="text-xs block">+{vocabDue.length - 5} more words due</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
                  <div className="text-lg text-foreground mb-2">
                    ¡No hay vocabulario pendiente de repaso!
                    <div className="text-sm text-muted-foreground">No vocabulary due for review!</div>
                  </div>
                  <p className="text-muted-foreground">
                    Estás al día con todo
                    <span className="text-xs block">You&apos;re all caught up</span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Sessions */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">
                Sesiones de Aprendizaje Recientes
                <span className="text-sm font-normal text-muted-foreground ml-2">Recent Learning Sessions</span>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {recentSessions.length > 0 ? (
              <div className="space-y-3">
                {recentSessions.map(session => (
                  <Card key={session.id} className="hover:border-primary/30 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                          <BookOpen className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">
                            Lección: {session.lesson_id || 'Desconocida'}
                            <span className="text-sm font-normal text-muted-foreground ml-2">
                              Lesson: {session.lesson_id || 'Unknown'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(session.created_at).toLocaleDateString()}
                            <span>•</span>
                            <Clock className="h-3 w-3" />
                            {session.duration_min || 0} minutos
                          </div>
                          {session.summary && (
                            <div className="text-sm text-muted-foreground mt-2 line-clamp-2">
                              {session.summary}
                            </div>
                          )}
                        </div>
                        <Badge variant="secondary" className="flex-shrink-0">
                          <Trophy className="h-3 w-3 mr-1" />
                          Completada
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <div className="text-lg text-foreground mb-2">
                  No hay sesiones recientes
                  <div className="text-sm text-muted-foreground">No recent sessions</div>
                </div>
                <p className="text-muted-foreground">
                  Empieza una lección para ver tu historial de sesiones
                  <span className="text-xs block">Start a lesson to see your session history</span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}