'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/providers';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  BookOpen, 
  GraduationCap, 
  Clock, 
  Star, 
  CheckCircle, 
  Search, 
  Grid3X3, 
  List, 
  Filter,
  Play,
  RefreshCw,
  Target,
  BookMarked,
  Loader2,
  AlertTriangle
} from 'lucide-react';

interface LessonData {
  id: string;
  title: string;
  cefr: string;
  unit: number;
  lesson: number;
  objectives: string[];
  content_refs: {
    difficulty: number;
    estimatedDuration: number;
    vocabularyCount: number;
    prerequisites?: string[];
  };
  isCompleted: boolean;
  completedAt?: string;
}

interface LessonSummary {
  A1: number;
  A2: number;
  B1: number;
  completed: number;
}

interface ApiResponse {
  lessons: LessonData[];
  grouped: Record<string, Record<number, LessonData[]>>;
  total: number;
  summary: LessonSummary;
}

export default function LessonCatalog() {
  const { user } = useAuth();
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [showCompleted, setShowCompleted] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const fetchLessons = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedLevel !== 'all') params.append('level', selectedLevel);
      if (selectedUnit !== 'all') params.append('unit', selectedUnit);
      if (showCompleted !== 'all') params.append('completed', showCompleted);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/lessons?${params}`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      } else {
        console.error('Failed to fetch lessons');
      }
    } catch (error) {
      console.error('Error fetching lessons:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedLevel, selectedUnit, showCompleted, searchTerm]);

  useEffect(() => {
    if (user) {
      fetchLessons();
    }
  }, [user, fetchLessons]);



  const handleLessonStart = (lessonId: string) => {
    // Store selected lesson in localStorage to override recommendation
    localStorage.setItem('selectedLessonId', lessonId);
    console.log('🎯 Selected custom lesson:', lessonId);
    // Navigate to lesson page
    window.location.href = '/lesson';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">
          Cargando catálogo...
          <span className="text-xs block">Loading lesson catalog</span>
        </span>
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="text-center py-8">
        <CardContent className="pt-6">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <div className="text-destructive mb-2 font-medium">
            No se pudieron cargar las lecciones
            <div className="text-xs text-muted-foreground">Unable to load lessons</div>
          </div>
          <Button onClick={fetchLessons} className="btn-primary">
            <RefreshCw className="h-4 w-4 mr-2" />
            Intentar de Nuevo
          </Button>
        </CardContent>
      </Card>
    );
  }

  const levels = ['A1', 'A2', 'B1'];
  const units = [1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl text-primary">
                Catálogo de Lecciones
                <div className="text-sm font-normal text-muted-foreground">Lesson Catalog</div>
              </CardTitle>
            </div>
          </div>
          <p className="text-muted-foreground">
            Explora y selecciona cualquier lección para practicar
            <span className="text-xs block">Browse and select any lesson to practice - go at your own pace!</span>
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-success/10 border-success/20">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-success mb-1">{data.summary.A1}</div>
                <div className="text-xs text-success/80">
                  A1 Principiante
                  <div className="text-[10px] text-muted-foreground">Beginner</div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-warning/10 border-warning/20">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-warning mb-1">{data.summary.A2}</div>
                <div className="text-xs text-warning/80">
                  A2 Elemental
                  <div className="text-[10px] text-muted-foreground">Elementary</div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-primary/10 border-primary/20">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary mb-1">{data.summary.B1}</div>
                <div className="text-xs text-primary/80">
                  B1 Intermedio
                  <div className="text-[10px] text-muted-foreground">Intermediate</div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-purple-500/10 border-purple-500/20">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600 mb-1">{data.summary.completed}</div>
                <div className="text-xs text-purple-600/80">
                  Completadas
                  <div className="text-[10px] text-muted-foreground">Completed</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />
            <CardTitle className="text-lg">
              Filtros
              <span className="text-sm font-normal text-muted-foreground ml-2">Filters</span>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end justify-between">
            <div className="flex flex-wrap gap-4">
              {/* Level Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Nivel
                  <span className="text-xs text-muted-foreground ml-1">(Level)</span>
                </Label>
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  className="input-field w-32"
                >
                  <option value="all">Todos</option>
                  {levels.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>

              {/* Unit Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Unidad
                  <span className="text-xs text-muted-foreground ml-1">(Unit)</span>
                </Label>
                <select
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                  className="input-field w-32"
                >
                  <option value="all">Todas</option>
                  {units.map(unit => (
                    <option key={unit} value={unit.toString()}>Unidad {unit}</option>
                  ))}
                </select>
              </div>

              {/* Completion Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Progreso
                  <span className="text-xs text-muted-foreground ml-1">(Progress)</span>
                </Label>
                <select
                  value={showCompleted}
                  onChange={(e) => setShowCompleted(e.target.value)}
                  className="input-field w-36"
                >
                  <option value="all">Todas</option>
                  <option value="false">Sin Empezar</option>
                  <option value="true">Completadas</option>
                </select>
              </div>
            </div>

            {/* Search and View Controls */}
            <div className="flex gap-3 items-end">
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Buscar
                  <span className="text-xs text-muted-foreground ml-1">(Search)</span>
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Buscar lecciones..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-48"
                  />
                </div>
              </div>
              <div className="flex border border-border rounded-lg overflow-hidden">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-none border-0"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-none border-0 border-l"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        Mostrando {data.lessons.length} de {data.total} lecciones
        <span className="text-xs block">Showing {data.lessons.length} of {data.total} lessons</span>
      </div>

      {/* Lessons Display */}
      {viewMode === 'grid' ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.lessons.map((lesson) => (
            <LessonCard key={lesson.id} lesson={lesson} onStart={handleLessonStart} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {data.lessons.map((lesson) => (
            <LessonRow key={lesson.id} lesson={lesson} onStart={handleLessonStart} />
          ))}
        </div>
      )}

      {data.lessons.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No se encontraron lecciones
              <div className="text-sm font-normal text-muted-foreground">No lessons found</div>
            </h3>
            <p className="text-muted-foreground">
              Intenta ajustar tus filtros o término de búsqueda
              <span className="text-xs block">Try adjusting your filters or search term</span>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function LessonCard({ lesson, onStart }: { lesson: LessonData; onStart: (id: string) => void }) {
  const getCefrColor = (cefr: string) => {
    switch (cefr) {
      case 'A1': return 'bg-success/10 text-success border-success/20';
      case 'A2': return 'bg-warning/10 text-warning border-warning/20';
      case 'B1': return 'bg-primary/10 text-primary border-primary/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <Card className={`transition-all duration-200 ${
      lesson.isCompleted 
        ? 'bg-success/5 border-success/20 ring-1 ring-success/10' 
        : 'hover:border-primary/30'
    }`}>
      <CardHeader className="pb-3">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={getCefrColor(lesson.cefr)}>
              {lesson.cefr}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Unidad {lesson.unit}.{lesson.lesson}
            </Badge>
          </div>
          {lesson.isCompleted && (
            <CheckCircle className="h-5 w-5 text-success" />
          )}
        </div>

        {/* Title */}
        <CardTitle className="text-lg line-clamp-2 leading-tight">
          {lesson.title}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {lesson.content_refs.estimatedDuration}min
          </div>
          <div className="flex items-center gap-1">
            <BookMarked className="h-3 w-3" />
            {lesson.content_refs.vocabularyCount}
          </div>
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3" />
            {lesson.content_refs.difficulty}/10
          </div>
        </div>

        {/* Objectives Preview */}
        <div className="mb-4">
          <div className="text-xs font-medium text-foreground mb-1">
            Objetivos:
            <span className="text-muted-foreground ml-1">(Objectives)</span>
          </div>
          <ul className="text-xs text-muted-foreground space-y-1">
            {lesson.objectives.slice(0, 2).map((obj, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <Target className="h-2.5 w-2.5 text-primary mt-0.5 flex-shrink-0" />
                <span className="line-clamp-1">{obj}</span>
              </li>
            ))}
            {lesson.objectives.length > 2 && (
              <li className="text-muted-foreground/60 text-[10px]">
                +{lesson.objectives.length - 2} más objetivos...
              </li>
            )}
          </ul>
        </div>

        {/* Action Button */}
        <Button
          onClick={() => onStart(lesson.id)}
          className={`w-full ${
            lesson.isCompleted
              ? 'bg-success/10 text-success hover:bg-success/20 border border-success/20'
              : 'btn-primary'
          }`}
          variant={lesson.isCompleted ? 'outline' : 'default'}
        >
          {lesson.isCompleted ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Repasar Lección
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Empezar Lección
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function LessonRow({ lesson, onStart }: { lesson: LessonData; onStart: (id: string) => void }) {
  const getCefrColor = (cefr: string) => {
    switch (cefr) {
      case 'A1': return 'bg-success/10 text-success border-success/20';
      case 'A2': return 'bg-warning/10 text-warning border-warning/20';
      case 'B1': return 'bg-primary/10 text-primary border-primary/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <Card className={`transition-all duration-200 ${
      lesson.isCompleted 
        ? 'bg-success/5 border-success/20' 
        : 'hover:border-primary/30'
    }`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <Badge variant="secondary" className={getCefrColor(lesson.cefr)}>
                {lesson.cefr}
              </Badge>
              <Badge variant="outline" className="text-xs">
                Unidad {lesson.unit}.{lesson.lesson}
              </Badge>
              <h3 className="font-semibold text-foreground truncate">{lesson.title}</h3>
              {lesson.isCompleted && <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />}
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {lesson.content_refs.estimatedDuration}min
              </div>
              <div className="flex items-center gap-1">
                <BookMarked className="h-3 w-3" />
                {lesson.content_refs.vocabularyCount}
              </div>
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3" />
                {lesson.content_refs.difficulty}/10
              </div>
            </div>
          </div>
          <Button
            onClick={() => onStart(lesson.id)}
            className={lesson.isCompleted 
              ? 'bg-success/10 text-success hover:bg-success/20 border border-success/20' 
              : 'btn-primary'
            }
            variant={lesson.isCompleted ? 'outline' : 'default'}
            size="sm"
          >
            {lesson.isCompleted ? (
              <>
                <RefreshCw className="h-3 w-3 mr-1" />
                Repasar
              </>
            ) : (
              <>
                <Play className="h-3 w-3 mr-1" />
                Empezar
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}