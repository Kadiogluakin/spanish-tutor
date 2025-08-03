'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/app/providers';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, GraduationCap, CheckCircle } from 'lucide-react';

interface LessonSummary {
  A1: number;
  A2: number;
  B1: number;
  B2: number;
  C1: number;
  C2: number;
  completed: number;
  total: number;
}

export default function LessonCatalogPreview() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<LessonSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchLessonSummary();
    }
  }, [user]);

  const fetchLessonSummary = async () => {
    try {
      const response = await fetch('/api/lessons');
      if (response.ok) {
        const data = await response.json();
        setSummary({
          ...data.summary,
          total: data.total
        });
      }
    } catch (error) {
      console.error('Error fetching lesson summary:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="card-elevated animate-pulse">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary/40" />
              </div>
              <div className="space-y-2">
                <div className="h-5 bg-muted rounded w-28"></div>
                <div className="h-4 bg-muted rounded w-36"></div>
              </div>
            </div>
            <div className="w-20 h-8 bg-muted rounded-lg"></div>
          </div>
          
          <div className="space-y-3">
            {/* Total Summary Skeleton */}
            <div className="flex items-center justify-between p-3 bg-muted/10 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-muted rounded"></div>
                <div className="space-y-1">
                  <div className="h-4 bg-muted rounded w-24"></div>
                  <div className="h-3 bg-muted rounded w-20"></div>
                </div>
              </div>
              <div className="text-right space-y-1">
                <div className="h-5 bg-muted rounded w-8"></div>
                <div className="h-3 bg-muted rounded w-16"></div>
              </div>
            </div>
            
            {/* Level Breakdown Skeleton */}
            <div className="grid grid-cols-3 gap-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="text-center p-2 bg-muted/20 rounded">
                  <div className="h-4 bg-muted rounded w-6 mx-auto mb-1"></div>
                  <div className="h-3 bg-muted rounded w-8 mx-auto"></div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mt-4 h-3 bg-muted rounded w-56"></div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <Card className="card-elevated bg-primary/5 border-primary/20">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-1 min-w-0">
              <h3 className="font-semibold text-foreground text-sm sm:text-base">Catálogo de Lecciones</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {summary.total} lecciones A1-C2
              </p>
            </div>
          </div>
          <Button asChild size="sm">
            <Link href="/lessons" className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              Explorar
            </Link>
          </Button>
        </div>
        
        <div className="space-y-3">
          {/* Total Lessons Summary */}
          <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center gap-3">
              <div className="text-2xl font-bold text-primary">{summary.total}</div>
              <div className="text-sm text-muted-foreground">
                <div>Lecciones totales</div>
                <div className="text-xs">Total lessons</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-success">{summary.completed}</div>
              <div className="text-xs text-success flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Completadas
              </div>
            </div>
          </div>
          
          {/* Level Breakdown */}
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 bg-success/10 rounded border border-success/20">
              <div className="text-sm font-bold text-success">{summary.A1 + summary.A2}</div>
              <div className="text-xs text-success/70">A1-A2</div>
            </div>
            <div className="text-center p-2 bg-primary/10 rounded border border-primary/20">
              <div className="text-sm font-bold text-primary">{summary.B1 + summary.B2}</div>
              <div className="text-xs text-primary/70">B1-B2</div>
            </div>
            <div className="text-center p-2 bg-purple-500/10 rounded border border-purple-500/20">
              <div className="text-sm font-bold text-purple-600">{summary.C1 + summary.C2}</div>
              <div className="text-xs text-purple-600/70">C1-C2</div>
            </div>
          </div>
        </div>
        
        <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
          <GraduationCap className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span className="line-clamp-2">Explora cualquier lección a tu ritmo</span>
        </div>
      </CardContent>
    </Card>
  );
}