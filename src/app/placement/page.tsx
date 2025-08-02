'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import PlacementExam from '@/components/PlacementExam';
import { PlacementResult } from '@/lib/placement-exam';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, GraduationCap, ArrowLeft } from 'lucide-react';

export default function PlacementPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, [supabase.auth]);

  const handlePlacementComplete = async (result: PlacementResult) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/placement-exam', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ result }),
      });

      if (!response.ok) {
        throw new Error('Failed to save placement results');
      }

      const data = await response.json();
      
      // Redirect to the appropriate lesson or dashboard
      if (data.recommended_lesson_id) {
        router.push(`/lesson?id=${data.recommended_lesson_id}&placement=true`);
      } else {
        router.push('/lessons?placement=true');
      }
    } catch (error) {
      console.error('Error saving placement results:', error);
      setError('Hubo un error al guardar tus resultados. Por favor, inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipPlacement = () => {
    router.push('/lessons');
  };

  const handleBackToDashboard = () => {
    router.push('/');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Acceso Requerido</CardTitle>
            <CardDescription>
              Debes iniciar sesión para tomar el examen de ubicación
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => router.push('/auth/signin')}>
              Iniciar Sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <Card className="w-full max-w-md border-red-200">
          <CardHeader className="text-center">
            <CardTitle className="text-red-800">Error</CardTitle>
            <CardDescription className="text-red-600">
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <Button 
              onClick={() => {
                setError(null);
                router.refresh();
              }}
              variant="outline"
            >
              Intentar de Nuevo
            </Button>
            <Button onClick={handleBackToDashboard}>
              Volver al Inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Procesando Resultados
                </h3>
                <p className="text-gray-600">
                  Guardando tu nivel y preparando tu plan de estudio personalizado...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button
                onClick={handleBackToDashboard}
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
              <div className="flex items-center space-x-2">
                <GraduationCap className="w-6 h-6 text-blue-600" />
                <h1 className="text-xl font-semibold text-gray-900">
                  Examen de Ubicación
                </h1>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {user?.email}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-8">
        <PlacementExam 
          onComplete={handlePlacementComplete}
          onSkip={handleSkipPlacement}
        />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-gray-500">
            <p>
              Este examen de ubicación utiliza los estándares del Marco Común Europeo de Referencia (MCER)
            </p>
            <p className="mt-2">
              Diseñado especialmente para estudiantes con experiencia real en países hispanohablantes
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}