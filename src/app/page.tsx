'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from './providers';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { 
  GraduationCap, 
  BookOpen, 
  Clock, 
  Flame, 
  RefreshCw,
  ArrowRight,
  Play,
  RotateCcw,
  ClipboardList,
  TrendingUp,
  Target
} from 'lucide-react';
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
      <div className="min-h-screen flex items-center justify-center container-padding">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto rounded-2xl overflow-hidden shadow-lg">
            <Image
              src="/images/convos-logo.png"
              alt="ConVos Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <div className="space-y-2">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent mx-auto"></div>
            <div className="space-y-1">
              <p className="font-medium text-foreground">Cargando tu panel...</p>
              <p className="text-sm text-muted-foreground">Loading your dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center container-padding">
        <div className="text-center max-w-md mx-auto space-y-8">
          <div className="space-y-4">
            <div className="relative w-20 h-20 mx-auto rounded-2xl overflow-hidden shadow-lg">
              <Image
                src="/images/convos-logo.png"
                alt="ConVos Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
                ConVos
              </h1>
              <p className="text-muted-foreground">
                AI Spanish Conversation Practice
              </p>
            </div>
          </div>
          
          <Card className="card-elevated">
            <CardContent className="p-6 space-y-4">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-foreground">
                  Inicia Sesión
                </h2>
                <p className="text-sm text-muted-foreground">
                  Please sign in to access your Spanish lessons
                </p>
              </div>
              
              <Button asChild size="lg" className="w-full">
                <Link href="/auth/signin" className="flex items-center gap-2">
                  <ArrowRight className="w-4 h-4" />
                  Iniciar Sesión
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto container-padding py-6 sm:py-8 space-y-8">
      {/* Welcome Section */}
      <div className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
            ¡Bienvenido, {user.email?.split('@')[0] || 'Estudiante'}!
          </h1>
          <p className="text-sm text-muted-foreground">
            Welcome back, {user.email?.split('@')[0] || 'Student'}!
          </p>
        </div>
        
        <div className="space-y-1">
          <p className="text-lg text-foreground font-medium">
            ¿Listo para tu lección de español?
          </p>
          <p className="text-sm text-muted-foreground">
            Ready for your Spanish lesson today?
          </p>
        </div>
        
        {/* Learning Flow - Subtle Styling Element */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-lg opacity-30"></div>
          <div className="relative border border-primary/10 rounded-lg px-4 py-3">
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <RotateCcw className="w-3 h-3" />
                <span>Repaso</span>
              </div>
              <ArrowRight className="w-2 h-2" />
              <div className="flex items-center gap-1">
                <GraduationCap className="w-3 h-3" />
                <span>Lección</span>
              </div>
              <ArrowRight className="w-2 h-2" />
              <div className="flex items-center gap-1">
                <ClipboardList className="w-3 h-3" />
                <span>Tarea</span>
              </div>
              <ArrowRight className="w-2 h-2" />
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span>Progreso</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="space-y-8">
      {/* Today's Lesson Section - The Star */}
      {loadingLesson ? (
        <Card className="card-elevated animate-pulse border-primary/20 bg-primary/5">
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="bg-primary/20 rounded-full w-16 h-6"></div>
                <div className="bg-secondary rounded-full w-12 h-6"></div>
                <div className="bg-muted rounded w-20 h-4"></div>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-warning/20 rounded"></div>
                <div className="w-16 h-4 bg-warning/20 rounded"></div>
              </div>
            </div>
            
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-7 bg-muted rounded w-64"></div>
                <div className="bg-success/20 rounded w-20 h-6"></div>
              </div>
              <div className="h-4 bg-muted rounded w-80"></div>
            </div>
            
            <div className="flex gap-3">
              <div className="flex-1 h-12 bg-primary/20 rounded-lg"></div>
              <div className="w-12 h-12 bg-muted rounded-lg"></div>
            </div>
          </CardContent>
        </Card>
      ) : lessonPlan ? (
        <Card className="card-elevated bg-gradient-to-r from-primary/5 to-blue-50 border-primary/20 ring-1 ring-primary/10">
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="default" className="bg-primary text-primary-foreground">
                  {lessonPlan.recommendedLesson.lesson.cefr}
                </Badge>
                <Badge variant="secondary">
                  Unidad {lessonPlan.recommendedLesson.lesson.unit}
                </Badge>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>~{lessonPlan.recommendedLesson.lesson.estimatedDuration} min</span>
                </div>
              </div>
              {lessonPlan.streakDays > 0 && (
                <div className="flex items-center gap-1 bg-warning/10 px-2 py-1 rounded-full">
                  <Flame className="w-4 h-4 text-warning" />
                  <span className="text-sm font-medium text-warning">
                    {lessonPlan.streakDays} días
                  </span>
                </div>
              )}
            </div>
            
            <div className="mb-4 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-semibold text-foreground">
                  {lessonPlan.recommendedLesson.lesson.title}
                </h3>
                <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                  <GraduationCap className="w-3 h-3 mr-1" />
                  Lección {lessonPlan.recommendedLesson.lesson.lesson}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {lessonPlan.recommendedLesson.reason}
              </p>
            </div>
            
            {lessonPlan.reviewItems > 0 && (
              <Card className="bg-warning/10 border-warning/20 mb-4">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <BookOpen className="w-4 h-4 text-warning" />
                    <span className="font-medium text-warning">
                      Tienes {lessonPlan.reviewItems} elementos para repasar
                    </span>
                  </div>
                  <p className="text-xs text-warning/80 mt-1">
                    You have {lessonPlan.reviewItems} items ready for review
                  </p>
                </CardContent>
              </Card>
            )}
            
            <div className="flex gap-3">
              <Button asChild size="lg" className="flex-1">
                <Link href="/lesson" className="flex items-center gap-2">
                  <Play className="w-4 h-4" />
                  Empezar Lección {lessonPlan.recommendedLesson.lesson.lesson}
                </Link>
              </Button>
              <Button
                onClick={fetchLessonOfTheDay}
                disabled={loadingLesson}
                variant="outline"
                size="lg"
                className="px-3"
                title="Actualizar plan de lección"
              >
                <RefreshCw className={`w-4 h-4 ${loadingLesson ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            
            <p className="text-xs text-center text-muted-foreground mt-3">
              {lessonPlan.nextMilestone}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="card-elevated">
          <CardContent className="p-6 text-center space-y-4">
            <div className="space-y-2">
              <p className="font-medium text-foreground">No se pudo cargar el plan de lección</p>
              <p className="text-sm text-muted-foreground">Unable to load lesson plan</p>
            </div>
            <Button asChild>
              <Link href="/lesson" className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                Ir a Lecciones
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick Access Cards */}
      <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
        <ReviewPreview />
        <LessonCatalogPreview />
      </div>

      {/* Placement Exam Promotion */}
      <Card className="card-elevated bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-purple-900">
                    ¿No estás seguro de tu nivel?
                  </h3>
                  <p className="text-xs text-purple-700">
                    Not sure about your Spanish level?
                  </p>
                </div>
              </div>
              
              <p className="text-sm text-purple-800 leading-relaxed">
                Toma nuestro examen de ubicación para encontrar tu nivel perfecto. 
                <br className="hidden sm:block" />
                <span className="text-xs text-purple-600">
                  Take our placement test to find your perfect level, especially designed for people with real experience in Spanish-speaking countries.
                </span>
              </p>
              
              <div className="grid grid-cols-3 gap-2 text-xs text-purple-700">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>15-20 min</span>
                </div>
                <div className="flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  <span>Resultados inmediatos</span>
                </div>
                <div className="flex items-center gap-1">
                  <GraduationCap className="w-3 h-3" />
                  <span>Plan personalizado</span>
                </div>
              </div>
            </div>
            
            <div className="w-full sm:w-auto">
              <Button asChild size="lg" className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700">
                <Link href="/placement" className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  Hacer Examen
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Navigation */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <Link href="/lessons" className="block">
          <Card className="card-elevated group hover:bg-accent/50 transition-colors duration-200 h-full">
            <CardContent className="p-4 sm:p-6 text-center space-y-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto group-hover:bg-primary/20 transition-colors">
                <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-foreground group-hover:text-primary text-sm sm:text-base">
                  Todas las Lecciones
                </h3>
                <p className="text-xs text-muted-foreground">
                  All Lessons • Browse catalog
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/homework" className="block">
          <Card className="card-elevated group hover:bg-accent/50 transition-colors duration-200 h-full">
            <CardContent className="p-4 sm:p-6 text-center space-y-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-warning/10 rounded-xl flex items-center justify-center mx-auto group-hover:bg-warning/20 transition-colors">
                <ClipboardList className="w-5 h-5 sm:w-6 sm:h-6 text-warning" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-foreground group-hover:text-warning text-sm sm:text-base">
                  Tarea
                </h3>
                <p className="text-xs text-muted-foreground">
                  Homework • Complete assignments
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/progress" className="block">
          <Card className="card-elevated group hover:bg-accent/50 transition-colors duration-200 h-full">
            <CardContent className="p-4 sm:p-6 text-center space-y-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-success/10 rounded-xl flex items-center justify-center mx-auto group-hover:bg-success/20 transition-colors">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-success" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-foreground group-hover:text-success text-sm sm:text-base">
                  Progreso
                </h3>
                <p className="text-xs text-muted-foreground">
                  Progress • Track learning
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/review" className="block">
          <Card className="card-elevated group hover:bg-accent/50 transition-colors duration-200 h-full">
            <CardContent className="p-4 sm:p-6 text-center space-y-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mx-auto group-hover:bg-blue-500/20 transition-colors">
                <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-foreground group-hover:text-blue-500 text-sm sm:text-base">
                  Repaso
                </h3>
                <p className="text-xs text-muted-foreground">
                  Review • Practice vocabulary
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/placement" className="block col-span-2 md:col-span-1">
          <Card className="card-elevated group hover:bg-purple-50 transition-colors duration-200 bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200 h-full">
            <CardContent className="p-4 sm:p-6 text-center space-y-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-600/10 rounded-xl flex items-center justify-center mx-auto group-hover:bg-purple-600/20 transition-colors">
                <Target className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-purple-900 group-hover:text-purple-700 text-sm sm:text-base">
                  Examen de Ubicación
                </h3>
                <p className="text-xs text-purple-600">
                  Placement • Find your level
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
      </main>
    </div>
  );
}