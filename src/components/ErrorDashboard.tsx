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
  Clipboard,
  Clock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface ErrorItem {
  id: string;
  type: string;
  spanish: string;
  english: string;
  note: string;
  count: number;
  created_at: string;
  status?: string;
  improvement_score?: number;
  review_priority?: number;
  last_seen?: string;
  days_since_last_seen?: number;
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
  const [selectedStatus, setSelectedStatus] = useState<string>('active');
  const [showAllErrors, setShowAllErrors] = useState(false);
  const [updatingError, setUpdatingError] = useState<string | null>(null);

  useEffect(() => {
    fetchErrorData();
  }, [selectedStatus, showAllErrors]);

  const fetchErrorData = async () => {
    try {
      const supabase = createClient();
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch user's error logs with enhanced fields
      let query = supabase
        .from('error_logs')
        .select('id, type, spanish, english, note, count, created_at, status, improvement_score, review_priority, last_seen')
        .eq('user_id', user.id);

      // Apply status filter
      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus);
      }

      const { data: errorLogs, error } = await query
        .order('review_priority', { ascending: false })
        .order('count', { ascending: false })
        .limit(showAllErrors ? 100 : 20);

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

  // Update error status
  const updateErrorStatus = async (errorId: string, newStatus: string, improvementScore?: number) => {
    try {
      setUpdatingError(errorId);
      
      const response = await fetch('/api/error-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          errorId,
          status: newStatus,
          improvementScore
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error updating status:', errorData.error);
        console.error('Error details:', errorData.details);
        console.error('Error code:', errorData.code);
        alert(`Failed to update error status: ${errorData.details || errorData.error}`);
        return;
      }

      // Refresh data
      await fetchErrorData();
    } catch (error) {
      console.error('Error updating error status:', error);
    } finally {
      setUpdatingError(null);
    }
  };

  const handleDismiss = (errorId: string) => {
    updateErrorStatus(errorId, 'dismissed');
  };

  // Simplified to just dismiss functionality

  const getErrorTypeIcon = (type: string) => {
    switch (type) {
      case 'grammar': return <Target className="h-4 w-4" />;
      case 'vocabulary': return <BookOpen className="h-4 w-4" />;
      case 'pronunciation': return <Volume2 className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getErrorTypeColor = (type: string) => {
    switch (type) {
      case 'grammar': return 'text-destructive bg-destructive/10 border-destructive/20';
      case 'vocabulary': return 'text-warning bg-warning/10 border-warning/20';
      case 'pronunciation': return 'text-primary bg-primary/10 border-primary/20';
      default: return 'text-muted-foreground bg-muted border-muted';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'dismissed': return 'text-gray-500 bg-gray-50 border-gray-200';
      default: return 'text-orange-600 bg-orange-50 border-orange-200';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary mr-3" />
            <div className="text-muted-foreground">
              Cargando errores...
              <span className="text-xs block">Loading errors</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 rounded-xl">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <CardTitle className="text-xl text-gray-900">
                Errores de Aprendizaje
                <div className="text-sm font-normal text-gray-600">Learning Errors</div>
              </CardTitle>
            </div>
          </div>
          <p className="text-gray-600 mt-2">
            Revisa y gestiona los errores identificados durante tus lecciones
            <span className="text-xs block text-gray-500">Review and manage errors identified during your lessons</span>
          </p>
        </CardHeader>
      </Card>

      {/* Statistics */}
      {stats.totalErrors > 0 && (
        <Card className="bg-white border-gray-200">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600 mb-1">{stats.totalErrors}</div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-1">{stats.grammarErrors}</div>
                <div className="text-sm text-gray-600">Gramática</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-1">{stats.vocabularyErrors}</div>
                <div className="text-sm text-gray-600">Vocabulario</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 mb-1">{stats.pronunciationErrors}</div>
                <div className="text-sm text-gray-600">Pronunciación</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <Card className="bg-white border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            {/* Type Filters */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700 font-medium">Filtrar:</span>
              <div className="flex gap-1">
                <Button
                  variant={selectedType === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedType('all')}
                  className="text-xs h-8"
                >
                  Todos
                </Button>
                <Button
                  variant={selectedType === 'grammar' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedType('grammar')}
                  className="text-xs h-8"
                >
                  Gramática
                </Button>
                <Button
                  variant={selectedType === 'vocabulary' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedType('vocabulary')}
                  className="text-xs h-8"
                >
                  Vocabulario
                </Button>
                <Button
                  variant={selectedType === 'pronunciation' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedType('pronunciation')}
                  className="text-xs h-8"
                >
                  Pronunciación
                </Button>
              </div>
            </div>
            
            {/* Status & Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant={selectedStatus === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStatus('active')}
                className="text-xs h-8"
              >
                Activos
              </Button>
              <Button
                variant={selectedStatus === 'dismissed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStatus('dismissed')}
                className="text-xs h-8"
              >
                Descartados
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchErrorData}
                className="text-xs h-8"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Actualizar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error List */}
      <div className="space-y-3">
        {filteredErrors.length === 0 ? (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-12">
              <div className="text-center">
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <div className="text-xl text-gray-900 mb-2">
                  {selectedStatus === 'active' ? '¡Perfecto! No tienes errores activos' : 'No hay errores aquí'}
                </div>
                <p className="text-gray-600">
                  {selectedStatus === 'active' 
                    ? 'Sigue practicando para mantener tu progreso'
                    : 'Cambia el filtro para ver otros errores'
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredErrors.map(error => (
            <Card key={error.id} className={`transition-all duration-200 ${error.status === 'dismissed' ? 'opacity-50' : 'bg-white'} border-gray-200`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`p-2 rounded-lg ${
                        error.type === 'grammar' ? 'bg-blue-100 text-blue-600' :
                        error.type === 'vocabulary' ? 'bg-green-100 text-green-600' :
                        error.type === 'pronunciation' ? 'bg-purple-100 text-purple-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {getErrorTypeIcon(error.type)}
                      </div>
                      <div>
                        <Badge className={`${getErrorTypeColor(error.type)} text-xs capitalize`}>
                          {error.type}
                        </Badge>
                        <div className="text-sm text-gray-500 mt-1">
                          Ocurrió {error.count} vez{error.count > 1 ? 'es' : ''}
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                        <div className="text-red-800 font-semibold mb-2">
                          ❌ {error.spanish}
                        </div>
                        <div className="text-green-800 font-medium">
                          ✅ {error.english}
                        </div>
                      </div>
                      
                      {error.note && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-start gap-2">
                            <Lightbulb className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-blue-800">{error.note}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Dismiss Button */}
                  {error.status === 'active' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDismiss(error.id)}
                      disabled={updatingError === error.id}
                      className="text-xs text-gray-600 hover:text-red-600 hover:border-red-300 h-8 px-3"
                      title="Descartar este error"
                    >
                      {updatingError === error.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <X className="h-3 w-3 mr-1" />
                          Descartar
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Help Section */}
      {filteredErrors.length === 0 && stats.totalErrors === 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-8">
            <div className="text-center">
              <Brain className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <div className="text-xl text-gray-900 mb-2">
                ¡Comienza a aprender!
              </div>
              <p className="text-gray-600 mb-6">
                Los errores aparecerán aquí cuando practiques lecciones
              </p>
              <div className="max-w-md mx-auto p-4 bg-white border border-blue-200 rounded-xl">
                <div className="text-sm text-blue-800 font-medium mb-3">
                  💡 Sobre los errores
                </div>
                <div className="text-xs text-gray-600 space-y-2 text-left">
                  <div>• Los errores se registran automáticamente durante las lecciones</div>
                  <div>• Puedes descartar errores que no quieras revisar</div>
                  <div>• Los errores te ayudan a identificar áreas de mejora</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}