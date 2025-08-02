'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Target, 
  BookOpen, 
  Volume2, 
  RefreshCw,
  BarChart3,
  TrendingDown,
  Lightbulb,
  X,
  CheckCircle,
  Loader2,
  Flame,
  Zap,
  Brain,
  FileText,
  Clipboard
} from 'lucide-react';

interface ErrorItem {
  id: string;
  type: string;
  spanish: string;
  english: string;
  note: string;
  count: number;
  created_at: string;
}

interface ErrorStats {
  totalErrors: number;
  grammarErrors: number;
  vocabularyErrors: number;
  pronunciationErrors: number;
  mostFrequentErrors: ErrorItem[];
}

export default function ErrorDashboard() {
  const [errors, setErrors] = useState<ErrorItem[]>([]);
  const [stats, setStats] = useState<ErrorStats>({
    totalErrors: 0,
    grammarErrors: 0,
    vocabularyErrors: 0,
    pronunciationErrors: 0,
    mostFrequentErrors: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('all');

  useEffect(() => {
    fetchErrorData();
  }, []);

  const fetchErrorData = async () => {
    try {
      const supabase = createClient();
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch user's error logs
      const { data: errorLogs, error } = await supabase
        .from('error_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('count', { ascending: false });

      if (error) {
        console.error('Error fetching error logs:', error);
        return;
      }

      const errorList = errorLogs || [];
      setErrors(errorList);

      // Calculate statistics
      const totalErrors = errorList.reduce((sum, error) => sum + error.count, 0);
      const grammarErrors = errorList
        .filter(error => error.type === 'grammar')
        .reduce((sum, error) => sum + error.count, 0);
      const vocabularyErrors = errorList
        .filter(error => error.type === 'vocabulary')
        .reduce((sum, error) => sum + error.count, 0);
      const pronunciationErrors = errorList
        .filter(error => error.type === 'pronunciation')
        .reduce((sum, error) => sum + error.count, 0);

      setStats({
        totalErrors,
        grammarErrors,
        vocabularyErrors,
        pronunciationErrors,
        mostFrequentErrors: errorList.slice(0, 5)
      });

    } catch (error) {
      console.error('Error loading error dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredErrors = selectedType === 'all' 
    ? errors 
    : errors.filter(error => error.type === selectedType);

  const getErrorTypeColor = (type: string) => {
    switch (type) {
      case 'grammar': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'vocabulary': return 'bg-primary/10 text-primary border-primary/20';
      case 'pronunciation': return 'bg-success/10 text-success border-success/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getErrorTypeIcon = (type: string) => {
    switch (type) {
      case 'grammar': return <Target className="h-4 w-4" />;
      case 'vocabulary': return <BookOpen className="h-4 w-4" />;
      case 'pronunciation': return <Volume2 className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card className="bg-destructive/5 border-destructive/20 ring-1 ring-destructive/10">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-destructive mr-3" />
            <div className="text-muted-foreground">
              Analizando errores...
              <span className="text-xs block">Analyzing errors</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-destructive/5 border-destructive/20 ring-1 ring-destructive/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-destructive/10 rounded-lg">
              <BarChart3 className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-2xl text-destructive">
                Panel de Análisis de Errores
                <div className="text-lg font-normal text-muted-foreground">Error Analysis Dashboard</div>
              </CardTitle>
            </div>
          </div>
          <Button
            onClick={fetchErrorData}
            variant="outline"
            size="sm"
            className="border-destructive/20 text-destructive hover:bg-destructive/10"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="text-center">
            <CardContent className="p-4">
              <div className="flex items-center justify-center mb-2">
                <AlertTriangle className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold text-foreground">{stats.totalErrors}</div>
              <div className="text-sm text-muted-foreground">
                Total de Errores
                <span className="text-xs block">Total Errors</span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="text-center bg-destructive/5 border-destructive/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-center mb-2">
                <Target className="h-5 w-5 text-destructive" />
              </div>
              <div className="text-2xl font-bold text-destructive">{stats.grammarErrors}</div>
              <div className="text-sm text-destructive">
                Gramática
                <span className="text-xs block opacity-75">Grammar</span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="text-center bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-center mb-2">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div className="text-2xl font-bold text-primary">{stats.vocabularyErrors}</div>
              <div className="text-sm text-primary">
                Vocabulario
                <span className="text-xs block opacity-75">Vocabulary</span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="text-center bg-success/5 border-success/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-center mb-2">
                <Volume2 className="h-5 w-5 text-success" />
              </div>
              <div className="text-2xl font-bold text-success">{stats.pronunciationErrors}</div>
              <div className="text-sm text-success">
                Pronunciación
                <span className="text-xs block opacity-75">Pronunciation</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clipboard className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                Filtrar por tipo • Filter by type
              </span>
            </div>
            <div className="flex space-x-1 p-1 bg-muted rounded-lg">
              {[
                { key: 'all', labelEs: 'Todos', labelEn: 'All Errors', icon: <FileText className="h-4 w-4" /> },
                { key: 'grammar', labelEs: 'Gramática', labelEn: 'Grammar', icon: <Target className="h-4 w-4" /> },
                { key: 'vocabulary', labelEs: 'Vocabulario', labelEn: 'Vocabulary', icon: <BookOpen className="h-4 w-4" /> },
                { key: 'pronunciation', labelEs: 'Pronunciación', labelEn: 'Pronunciation', icon: <Volume2 className="h-4 w-4" /> }
              ].map(tab => (
                <Button
                  key={tab.key}
                  onClick={() => setSelectedType(tab.key)}
                  variant={selectedType === tab.key ? "default" : "ghost"}
                  size="sm"
                  className={`flex-1 gap-2 ${
                    selectedType === tab.key
                      ? 'bg-destructive text-destructive-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.labelEs}</span>
                  <span className="sm:hidden">{tab.labelEn}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Error List */}
        <div className="space-y-3">
          {filteredErrors.length === 0 ? (
            <Card className="text-center py-8">
              <CardContent>
                {selectedType === 'all' ? (
                  <>
                    <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
                    <div className="text-xl text-foreground mb-2">
                      ¡No hay errores registrados aún!
                      <div className="text-sm text-muted-foreground">No errors recorded yet!</div>
                    </div>
                    <p className="text-muted-foreground">
                      Sigue practicando para seguir tu progreso
                      <span className="text-xs block">Keep practicing to track your progress</span>
                    </p>
                  </>
                ) : (
                  <>
                    <Zap className="h-16 w-16 text-success mx-auto mb-4" />
                    <div className="text-xl text-foreground mb-2">
                      ¡No se encontraron errores de {selectedType}!
                      <div className="text-sm text-muted-foreground">No {selectedType} errors found!</div>
                    </div>
                    <p className="text-muted-foreground">
                      ¡Excelente trabajo en esta área!
                      <span className="text-xs block">Great work in this area!</span>
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredErrors.map(error => (
              <Card key={error.id} className="hover:border-destructive/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 bg-destructive/10 rounded-lg text-destructive">
                          {getErrorTypeIcon(error.type)}
                        </div>
                        <Badge className={`${getErrorTypeColor(error.type)} border`}>
                          {error.type}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          ocurrió {error.count} vez{error.count > 1 ? 'es' : ''}
                          <span className="text-xs block">occurred {error.count} time{error.count > 1 ? 's' : ''}</span>
                        </span>
                      </div>
                      
                      <div className="space-y-3">
                        <Card className="bg-destructive/5 border-destructive/20">
                          <CardContent className="p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <X className="h-4 w-4 text-destructive" />
                              <span className="text-sm font-medium text-destructive">Error:</span>
                            </div>
                            <div className="font-mono text-sm text-foreground">
                              {error.spanish}
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card className="bg-success/5 border-success/20">
                          <CardContent className="p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <CheckCircle className="h-4 w-4 text-success" />
                              <span className="text-sm font-medium text-success">Corrección:</span>
                            </div>
                            <div className="text-sm text-foreground">
                              {error.english}
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card className="bg-primary/5 border-primary/20">
                          <CardContent className="p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <Lightbulb className="h-4 w-4 text-primary" />
                              <span className="text-sm font-medium text-primary">
                                Consejo • Tip:
                              </span>
                            </div>
                            <div className="text-sm text-foreground">
                              {error.note}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                    
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center border-2 border-destructive/20">
                        <span className="text-lg font-bold text-destructive">{error.count}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Most Frequent Errors Summary */}
        {stats.mostFrequentErrors.length > 0 && (
          <Card className="mt-6 bg-warning/5 border-warning/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-warning" />
                <CardTitle className="text-lg text-warning">
                  Áreas de Enfoque
                  <span className="text-sm font-normal text-muted-foreground ml-2">Focus Areas (Most Frequent Errors)</span>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.mostFrequentErrors.map((error, index) => (
                  <Card key={error.id} className="hover:border-warning/30 transition-colors">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-warning/10 rounded-full flex items-center justify-center border border-warning/20">
                            <span className="text-xs font-bold text-warning">{index + 1}</span>
                          </div>
                          <div>
                            <div className="font-medium text-foreground">{error.spanish}</div>
                            <div className="text-sm text-muted-foreground">
                              {error.type} • {error.count} veces
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-warning border-warning/20">
                          <TrendingDown className="h-3 w-3 mr-1" />
                          {error.count}x
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}