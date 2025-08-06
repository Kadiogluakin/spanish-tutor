'use client';

import { useState, useEffect } from 'react';
import ErrorDashboard from '@/components/ErrorDashboard';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  BookOpen, 
  Clock, 
  Loader2
} from 'lucide-react';

export default function ProgressPage() {
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

      // Fetch recent learning sessions
      const { data: sessions } = await supabase
        .from('learning_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      setRecentSessions(sessions || []);

    } catch (error) {
      console.error('Error loading progress data:', error);
    } finally {
      setLoading(false);
    }
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
              <Card className="mb-8 bg-gradient-to-r from-indigo-50 via-blue-50 to-cyan-50 border-blue-200">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="p-4 bg-blue-100 rounded-2xl">
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-3xl text-gray-900">
                Progreso de Aprendizaje
                <div className="text-lg font-normal text-gray-600 mt-1">Learning Progress</div>
              </CardTitle>
            </div>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Sigue tu viaje de aprendizaje del español con análisis detallados
          </p>
        </CardHeader>
      </Card>

        {/* Enhanced Error Dashboard - Star Component */}
        <div className="mb-8">
          <ErrorDashboard />
        </div>



        {/* Recent Sessions */}
        <Card className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <CardTitle className="text-lg text-gray-900">
                Sesiones Recientes
                <div className="text-sm font-normal text-gray-600">Recent Learning Sessions</div>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {recentSessions.length > 0 ? (
              <div className="space-y-3">
                {recentSessions.slice(0, 5).map(session => (
                  <Card key={session.id} className="hover:shadow-sm transition-all duration-200 bg-white border-gray-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <BookOpen className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {session.lesson_id || 'Lección'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {new Date(session.created_at).toLocaleDateString()} • {session.duration_min || 0} min
                            </div>
                          </div>
                        </div>
                        <Badge className="bg-green-100 text-green-800 border-green-200">
                          Completada
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                <div className="text-lg text-gray-900 mb-2">
                  No hay sesiones recientes
                </div>
                <p className="text-gray-600">
                  Empieza una lección para ver tu historial
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}