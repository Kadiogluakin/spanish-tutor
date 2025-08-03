'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/providers';
import { createClient } from '@/lib/supabase/client';
import { sm2 } from '@/lib/srs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  RefreshCw, 
  CheckCircle, 
  BookOpen, 
  Target, 
  Brain,
  AlertTriangle,
  Trophy,
  Loader2,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Zap,
  Clock,
  TrendingUp,
  MessageSquare,
  Volume2
} from 'lucide-react';

type ReviewItem = {
  id: string;
  type: 'vocab' | 'skill' | 'error' | 'homework_focus' | 'homework_vocab' | 'homework_error';
  content: string;
  translation?: string;
  nextDue: string;
  easiness: number;
  intervalDays: number;
  successes: number;
  failures: number;
  progressId: string;
  tags?: any;
  // Additional fields for error reviews
  errorType?: 'grammar' | 'vocabulary' | 'pronunciation';
  correction?: string;
  note?: string;
  originalError?: string;
};

export default function ReviewQueue() {
  const { user } = useAuth();
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);

  const fetchReviewItems = useCallback(async () => {
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

      // Fetch error items that need review (errors with high frequency)
      const { data: errorItems, error: errorError } = await supabase
        .from('error_logs')
        .select('*')
        .eq('user_id', user!.id)
        .gte('count', 2) // Only review errors that occurred multiple times
        .order('count', { ascending: false })
        .limit(8);

      if (errorError) {
        console.error('Error fetching errors for review:', errorError);
      }

      // 📝 Fetch homework-based items that need reinforcement
      const { data: homeworkItems, error: homeworkError } = await supabase
        .from('submissions')
        .select(`
          id,
          score,
          grade_json,
          homework (
            id,
            type,
            lesson_id
          )
        `)
        .eq('user_id', user!.id)
        .not('grade_json', 'is', null)
        .lt('score', 80)  // Focus on homework with scores below 80%
        .order('graded_at', { ascending: false })
        .limit(5);

      if (homeworkError) {
        console.error('Error fetching homework items for review:', homeworkError);
      }

      // Combine and format items
      const formattedItems: ReviewItem[] = [];

      // Add vocabulary items
      if (vocabItems) {
        vocabItems.forEach((item: any) => {
          if (item.vocabulary) {
            const vocab = item.vocabulary;
            formattedItems.push({
              id: item.vocab_id,
              type: 'vocab',
              content: vocab.spanish,
              translation: vocab.english,
              nextDue: item.next_due,
              easiness: item.sm2_easiness,
              intervalDays: item.interval_days,
              successes: item.successes,
              failures: item.failures,
              progressId: item.id,
              tags: vocab.tags
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

      // Add error items for review practice
      if (errorItems) {
        for (const errorItem of errorItems) {
          // Check if this error already has progress tracking
          const { data: existingProgress } = await supabase
            .from('skill_progress')
            .select('*')
            .eq('user_id', user!.id)
            .eq('skill_code', `error_${errorItem.id}`)
            .single();

          let progressData = existingProgress;
          
          // If no progress exists, create initial progress for this error
          if (!existingProgress) {
            const { data: newProgress, error: progressError } = await supabase
              .from('skill_progress')
              .insert({
                user_id: user!.id,
                skill_code: `error_${errorItem.id}`,
                sm2_easiness: 2.5, // Default easiness
                interval_days: 1, // Review tomorrow initially
                next_due: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
                successes: 0,
                failures: 0
              })
              .select()
              .single();

            if (progressError) {
              console.error('Error creating progress for error item:', progressError);
              continue; // Skip this error if we can't create progress
            }
            progressData = newProgress;
          }

          // Only include if due for review
          if (progressData && new Date(progressData.next_due) <= new Date()) {
            formattedItems.push({
              id: errorItem.id,
              type: 'error',
              content: `Correct this error: "${errorItem.spanish}"`,
              translation: `Should be: "${errorItem.english}"`,
              nextDue: progressData.next_due,
              easiness: progressData.sm2_easiness,
              intervalDays: progressData.interval_days,
              successes: progressData.successes,
              failures: progressData.failures,
              progressId: progressData.id,
              errorType: errorItem.type,
              correction: errorItem.english,
              note: errorItem.note,
              originalError: errorItem.spanish
            });
          }
        }
      }

      // 📝 Add homework-based review items for comprehensive learning
      if (homeworkItems) {
        for (const submission of homeworkItems) {
          // Add focus areas from homework feedback
          if (submission.grade_json?.next_focus) {
            submission.grade_json.next_focus.forEach((focus: string, index: number) => {
              const focusId = `homework-focus-${submission.id}-${index}`;
              
              formattedItems.push({
                id: focusId,
                type: 'homework_focus',
                content: `Homework Focus Area: ${focus}`,
                translation: getHomeworkFocusGuidance(focus),
                nextDue: new Date().toISOString(), // Due now for review
                easiness: 2.0, // Lower easiness for homework weaknesses
                intervalDays: 3, // Review homework areas more frequently
                successes: 0,
                failures: Math.round((100 - (submission.score || 0)) / 20), // Convert score to failure count
                progressId: focusId,
                note: `From ${(submission.homework as any)?.type} homework (Score: ${submission.score}%)`
              });
            });
          }

          // Add vocabulary from homework corrections
          if (submission.grade_json?.srs_add) {
            submission.grade_json.srs_add.forEach((vocab: string, index: number) => {
              const vocabId = `homework-vocab-${submission.id}-${index}`;
              
              formattedItems.push({
                id: vocabId,
                type: 'homework_vocab',
                content: `Vocabulary from homework: "${vocab}"`,
                translation: `Practice using "${vocab}" correctly in context`,
                nextDue: new Date().toISOString(), // Due now for review
                easiness: 1.8, // Lower easiness for vocabulary that needed correction
                intervalDays: 2, // Review homework vocabulary frequently
                successes: 0,
                failures: 2, // Assume 2 failures since it appeared in corrections
                progressId: vocabId,
                note: `From ${(submission.homework as any)?.type} homework - needs practice`
              });
            });
          }

          // Add error patterns from homework corrections
          if (submission.grade_json?.corrections) {
            submission.grade_json.corrections.slice(0, 2).forEach((correction: string, index: number) => {
              const correctionId = `homework-correction-${submission.id}-${index}`;
              
              formattedItems.push({
                id: correctionId,
                type: 'homework_error',
                content: `Common error from homework: "${correction}"`,
                translation: 'Review the correct form and practice similar structures',
                nextDue: new Date().toISOString(), // Due now for review
                easiness: 1.9, // Lower easiness for errors that need correction
                intervalDays: 4, // Review homework errors regularly
                successes: 0,
                failures: 1,
                progressId: correctionId,
                note: `Error from ${(submission.homework as any)?.type} homework`,
                originalError: correction
              });
            });
          }
        }
      }

      // Shuffle items for variety
      const shuffledItems = formattedItems.sort(() => Math.random() - 0.5);
      
      setReviewItems(shuffledItems);
      setLoading(false);

    } catch (error) {
      console.error('Error fetching review items:', error);
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchReviewItems();
    }
  }, [user, fetchReviewItems]);



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
      
      // Check if this is a homework-based temporary item (not stored in database)
      const isHomeworkItem = currentItem.type.startsWith('homework_') || 
                            currentItem.progressId.startsWith('homework-');
      
      // Calculate new SRS values using SM-2 algorithm
      const currentState = {
        easiness: currentItem.easiness,
        interval: currentItem.intervalDays,
        reps: currentItem.successes
      };
      
      const newState = sm2(rating, currentState);
      const success = rating >= 3;
      
      // Only update database for real vocab/skill items, not homework-based temporary items
      if (!isHomeworkItem) {
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
      } else {
        // For homework-based items, just log the rating for analytics
        console.log(`Homework review item rated: ${currentItem.type} - Rating: ${rating}`);
        
        // Optionally, you could create analytics entries here
        // await supabase.from('learning_analytics').insert({
        //   user_id: user!.id,
        //   activity_type: 'homework_review_rating',
        //   activity_data: {
        //     item_type: currentItem.type,
        //     rating: rating,
        //     content: currentItem.content
        //   },
        //   timestamp: new Date().toISOString()
        // });
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
                <div className="text-lg font-normal text-muted-foreground">Review Session Complete!</div>
              </CardTitle>
              <p className="text-muted-foreground mb-6">
                Repasaste {reviewedCount} elemento{reviewedCount !== 1 ? 's' : ''} hoy
                <span className="text-xs block">You reviewed {reviewedCount} item{reviewedCount !== 1 ? 's' : ''} today</span>
              </p>
              <div className="space-y-4">
                <Button
                  onClick={() => {
                    setSessionComplete(false);
                    setCurrentIndex(0);
                    setReviewedCount(0);
                    fetchReviewItems();
                  }}
                  className="btn-primary"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Repasar Más Elementos
                </Button>
                <p className="text-sm text-muted-foreground">
                  ¡Vuelve mañana para tu próxima sesión de repetición espaciada!
                  <span className="text-xs block">Come back tomorrow for your next spaced repetition session!</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (reviewItems.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto container-padding py-8">
          <Card>
            <CardContent className="p-12 text-center">
              <CheckCircle className="h-20 w-20 text-success mx-auto mb-6" />
              <CardTitle className="text-3xl text-foreground mb-3">
                ¡Todo al Día!
                <div className="text-xl font-normal text-muted-foreground mt-1">All Caught Up!</div>
              </CardTitle>
              <p className="text-muted-foreground text-lg max-w-md mx-auto">
                No hay elementos pendientes de repaso ahora.
                <span className="text-base block mt-1">No items due for review right now.</span>
              </p>
              <div className="mt-8 text-sm text-muted-foreground">
                ¡Completa más lecciones para añadir contenido a tu cola de repaso!
                <span className="text-xs block mt-1">Complete more lessons to add content to your review queue!</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const currentItem = reviewItems[currentIndex];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto container-padding py-8 space-y-6">
        {/* Header */}
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="p-3 bg-primary/10 rounded-lg">
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
              <div>
                <CardTitle className="text-3xl text-primary">
                  Práctica de Repaso
                  <div className="text-lg font-normal text-muted-foreground">Review Practice</div>
                </CardTitle>
              </div>
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Sistema de repetición espaciada - Repasa vocabulario, habilidades y correcciones de errores
              <span className="text-xs block">Spaced repetition system - Review vocabulary, skills, and error corrections</span>
            </p>
          </CardHeader>
        </Card>

        {/* Progress */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">
                Pregunta {currentIndex + 1} de {reviewItems.length}
                <span className="text-xs block">Question {currentIndex + 1} of {reviewItems.length}</span>
              </span>
              <Badge variant="outline">
                {Math.round(((currentIndex + 1) / reviewItems.length) * 100)}%
              </Badge>
            </div>
            <div className="bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / reviewItems.length) * 100}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>

        {/* Review Card */}
        <Card className="card-elevated">
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              {/* Type Badge */}
              <div className="flex justify-center">
                <Badge className={`${
                  currentItem.type === 'vocab' 
                    ? 'bg-success/10 text-success border-success/20' 
                    : currentItem.type === 'error'
                    ? 'bg-destructive/10 text-destructive border-destructive/20'
                    : currentItem.type.startsWith('homework_')
                    ? 'bg-warning/10 text-warning border-warning/20'
                    : 'bg-primary/10 text-primary border-primary/20'
                }`}>
                  {currentItem.type === 'vocab' && (
                    <>
                      <BookOpen className="h-3 w-3 mr-1" />
                      Vocabulario
                    </>
                  )}
                  {currentItem.type === 'skill' && (
                    <>
                      <Target className="h-3 w-3 mr-1" />
                      Habilidad
                    </>
                  )}
                  {currentItem.type === 'error' && (
                    <>
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Práctica de Error ({currentItem.errorType})
                    </>
                  )}
                  {currentItem.type === 'homework_focus' && (
                    <>
                      <Target className="h-3 w-3 mr-1" />
                      Área de Enfoque
                    </>
                  )}
                  {currentItem.type === 'homework_vocab' && (
                    <>
                      <BookOpen className="h-3 w-3 mr-1" />
                      Vocabulario de Tarea
                    </>
                  )}
                  {currentItem.type === 'homework_error' && (
                    <>
                      <MessageSquare className="h-3 w-3 mr-1" />
                      Corrección de Tarea
                    </>
                  )}
                </Badge>
              </div>

              {/* Main Content */}
              <div className="text-4xl font-bold text-foreground py-4">
                {currentItem.content}
              </div>
              
              {/* Tags for vocabulary */}
              {currentItem.type === 'vocab' && currentItem.tags && (
                <div className="text-sm text-muted-foreground">
                  De la lección: {currentItem.tags.lesson || 'Desconocida'}
                  <span className="text-xs block">From lesson: {currentItem.tags.lesson || 'Unknown'}</span>
                </div>
              )}

              {/* Progress Stats */}
              <div className="flex justify-center gap-6 text-sm">
                <div className="flex items-center gap-1 text-success">
                  <CheckCircle className="h-3 w-3" />
                  {currentItem.successes} correctas
                </div>
                <div className="flex items-center gap-1 text-destructive">
                  <AlertTriangle className="h-3 w-3" />
                  {currentItem.failures} incorrectas
                </div>
                <div className="flex items-center gap-1 text-primary">
                  <TrendingUp className="h-3 w-3" />
                  Facilidad: {currentItem.easiness.toFixed(1)}
                </div>
              </div>
          
              {/* Answer Section */}
              {showAnswer && (
                <div className="border-t border-border pt-6 space-y-4">
                  {currentItem.type === 'error' ? (
                    <div className="space-y-4">
                      <Card className="bg-destructive/5 border-destructive/20">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                            <div>
                              <div className="text-sm font-medium text-destructive mb-1">Tu Error:</div>
                              <div className="text-lg font-semibold text-foreground">&quot;{currentItem.originalError}&quot;</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="bg-success/5 border-success/20">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                            <div>
                              <div className="text-sm font-medium text-success mb-1">Correcto:</div>
                              <div className="text-2xl font-semibold text-foreground">&quot;{currentItem.correction}&quot;</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      {currentItem.note && (
                        <Card className="bg-primary/5 border-primary/20">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-2">
                              <Brain className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                              <div>
                                <div className="text-sm font-medium text-primary mb-1">
                                  Consejo • Tip:
                                </div>
                                <div className="text-sm text-foreground">{currentItem.note}</div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  ) : currentItem.translation ? (
                    <Card className="bg-primary/5 border-primary/20">
                      <CardContent className="p-4">
                        <div className="text-2xl font-medium text-foreground text-center">
                          {currentItem.translation}
                        </div>
                      </CardContent>
                    </Card>
                  ) : null}
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Próximo repaso en {currentItem.intervalDays} día{currentItem.intervalDays !== 1 ? 's' : ''}
                    <span className="text-xs">• Next review in {currentItem.intervalDays} day{currentItem.intervalDays !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {!showAnswer ? (
                <Button
                  onClick={() => setShowAnswer(true)}
                  className="btn-primary text-lg px-8 py-3"
                >
                  <Eye className="h-5 w-5 mr-2" />
                  Mostrar Respuesta
                </Button>
              ) : (
                <div className="space-y-6">
                  <div className="text-lg font-semibold text-foreground">
                    ¿Qué tan bien lo sabías?
                    <div className="text-sm font-normal text-muted-foreground">How well did you know this?</div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <Button
                      onClick={() => handleRating(0)}
                      className="bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/20 border h-auto py-3 px-4"
                      variant="outline"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <ThumbsDown className="h-4 w-4" />
                        <span className="text-xs font-medium">Sin idea</span>
                      </div>
                    </Button>
                    <Button
                      onClick={() => handleRating(1)}
                      className="bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/20 border h-auto py-3 px-4"
                      variant="outline"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-xs font-medium">Incorrecto</span>
                      </div>
                    </Button>
                    <Button
                      onClick={() => handleRating(2)}
                      className="bg-warning/10 hover:bg-warning/20 text-warning border-warning/20 border h-auto py-3 px-4"
                      variant="outline"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-xs font-medium">Difícil</span>
                      </div>
                    </Button>
                    <Button
                      onClick={() => handleRating(3)}
                      className="bg-primary/10 hover:bg-primary/20 text-primary border-primary/20 border h-auto py-3 px-4"
                      variant="outline"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <Target className="h-4 w-4" />
                        <span className="text-xs font-medium">Regular</span>
                      </div>
                    </Button>
                    <Button
                      onClick={() => handleRating(4)}
                      className="bg-success/10 hover:bg-success/20 text-success border-success/20 border h-auto py-3 px-4"
                      variant="outline"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-xs font-medium">Fácil</span>
                      </div>
                    </Button>
                    <Button
                      onClick={() => handleRating(5)}
                      className="bg-success/10 hover:bg-success/20 text-success border-success/20 border h-auto py-3 px-4"
                      variant="outline"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <Zap className="h-4 w-4" />
                        <span className="text-xs font-medium">Perfecto</span>
                      </div>
                    </Button>
                  </div>
                  <Card className="bg-muted/50">
                    <CardContent className="p-4">
                      <div className="text-xs text-muted-foreground text-center max-w-lg mx-auto">
                        {currentItem.type === 'error' ? (
                          <>
                            Tu calificación ayuda al sistema a decidir cuándo practicar esta corrección de error nuevamente.
                            Las correcciones fáciles aparecen menos frecuentemente, las difíciles regresan más pronto.
                            <span className="text-xs block mt-1 opacity-75">
                              Your rating helps the system decide when to practice this error correction again.
                              Easy corrections appear less often, difficult ones come back sooner.
                            </span>
                          </>
                        ) : (
                          <>
                            Tu calificación ayuda al algoritmo de repetición espaciada a decidir cuándo mostrar este elemento nuevamente.
                            Los elementos fáciles aparecen menos frecuentemente, los difíciles regresan más pronto.
                            <span className="text-xs block mt-1 opacity-75">
                              Your rating helps the spaced repetition algorithm decide when to show this item again.
                              Easy items appear less often, difficult ones come back sooner.
                            </span>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * Get homework focus area guidance for review
 */
function getHomeworkFocusGuidance(focus: string): string {
  const focusLower = focus.toLowerCase();
  
  if (focusLower.includes('verb') || focusLower.includes('conjugat')) {
    return 'Practice verb conjugations in different tenses. Focus on regular vs irregular patterns.';
  } else if (focusLower.includes('gender') || focusLower.includes('agreement')) {
    return 'Review noun genders and adjective agreement rules. Practice with el/la and un/una.';
  } else if (focusLower.includes('ser') || focusLower.includes('estar')) {
    return 'Study when to use SER vs ESTAR. SER for permanent, ESTAR for temporary states.';
  } else if (focusLower.includes('preposition')) {
    return 'Review common prepositions (por/para, a/de/en). Practice in context sentences.';
  } else if (focusLower.includes('vocab') || focusLower.includes('vocabulary')) {
    return 'Expand vocabulary range. Use more specific and varied words in your responses.';
  } else if (focusLower.includes('accent') || focusLower.includes('tilde')) {
    return 'Practice accent mark rules. Review stress patterns and written accents.';
  } else if (focusLower.includes('pronunciation')) {
    return 'Focus on clear pronunciation. Practice difficult sounds and intonation patterns.';
  } else if (focusLower.includes('fluency')) {
    return 'Work on speaking more naturally. Practice connecting ideas smoothly.';
  } else {
    return `Focus on improving: ${focus}. Practice regularly and pay attention to this area.`;
  }
}