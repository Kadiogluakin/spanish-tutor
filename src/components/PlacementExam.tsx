'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  PLACEMENT_QUESTIONS, 
  calculatePlacementResult, 
  PlacementQuestion, 
  PlacementResult 
} from '@/lib/placement-exam';
import { 
  GraduationCap, 
  BookOpen, 
  Target, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Star,
  Brain,
  Globe,
  MessageSquare
} from 'lucide-react';

interface PlacementExamProps {
  onComplete: (result: PlacementResult) => void;
  onSkip?: () => void;
}

type ExamPhase = 'intro' | 'questions' | 'results';

export default function PlacementExam({ onComplete, onSkip }: PlacementExamProps) {
  const [phase, setPhase] = useState<ExamPhase>('intro');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [questionId: string]: string }>({});
  const [result, setResult] = useState<PlacementResult | null>(null);
  const [timeStarted, setTimeStarted] = useState<Date | null>(null);
  const [timeCompleted, setTimeCompleted] = useState<Date | null>(null);

  const currentQuestion = PLACEMENT_QUESTIONS[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / PLACEMENT_QUESTIONS.length) * 100;

  const handleAnswer = (answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: answer
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < PLACEMENT_QUESTIONS.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // Exam completed
      const examResult = calculatePlacementResult(answers);
      setResult(examResult);
      setTimeCompleted(new Date());
      setPhase('results');
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleStartExam = () => {
    setPhase('questions');
    setTimeStarted(new Date());
  };

  const renderQuestion = (question: PlacementQuestion) => {
    const currentAnswer = answers[question.id];

    switch (question.type) {
      case 'multiple-choice':
        return (
          <div className="space-y-4">
            <p className="text-lg font-medium">{question.question}</p>
            <RadioGroup 
              value={currentAnswer || ''} 
              onValueChange={handleAnswer}
              className="space-y-3"
            >
              {question.options?.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`option-${index}`} />
                  <Label htmlFor={`option-${index}`} className="text-base cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );

      case 'fill-blank':
        return (
          <div className="space-y-4">
            <p className="text-lg font-medium">{question.question}</p>
            <Input
              value={currentAnswer || ''}
              onChange={(e) => handleAnswer(e.target.value)}
              placeholder="Escribe tu respuesta..."
              className="text-base"
            />
          </div>
        );

      case 'translation':
        return (
          <div className="space-y-4">
            <p className="text-lg font-medium">{question.question}</p>
            <Textarea
              value={currentAnswer || ''}
              onChange={(e) => handleAnswer(e.target.value)}
              placeholder="Escribe tu traducción..."
              className="text-base"
              rows={3}
            />
          </div>
        );

      case 'reading-comprehension':
        return (
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-lg border">
              <p className="text-base leading-relaxed">{question.question.split('¿Cuál')[0]}</p>
            </div>
            <p className="text-lg font-medium">
              ¿Cuál{question.question.split('¿Cuál')[1]}
            </p>
            <RadioGroup 
              value={currentAnswer || ''} 
              onValueChange={handleAnswer}
              className="space-y-3"
            >
              {question.options?.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`option-${index}`} />
                  <Label htmlFor={`option-${index}`} className="text-base cursor-pointer leading-relaxed">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );

      default:
        return null;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'A1': return 'bg-green-100 text-green-800 border-green-200';
      case 'A2': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'B1': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'B2': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'C1': return 'bg-red-100 text-red-800 border-red-200';
      case 'C2': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSkillIcon = (skill: string) => {
    switch (skill) {
      case 'grammar': return <Brain className="w-4 h-4" />;
      case 'vocabulary': return <BookOpen className="w-4 h-4" />;
      case 'reading': return <MessageSquare className="w-4 h-4" />;
      case 'culture': return <Globe className="w-4 h-4" />;
      default: return <Star className="w-4 h-4" />;
    }
  };

  if (phase === 'intro') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="border-2 border-blue-200">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <GraduationCap className="w-8 h-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl text-blue-900">
              Examen de Ubicación de Español
            </CardTitle>
            <CardDescription className="text-lg text-gray-600">
              Encuentra tu nivel perfecto para comenzar tu aprendizaje
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">
                ¿Para quién es este examen?
              </h3>
              <ul className="space-y-2 text-blue-800">
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>Personas que han vivido en países de habla hispana pero tienen conocimiento fragmentado</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>Estudiantes que han aprendido español de forma autodidacta</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>Cualquier persona que quiere encontrar su nivel exacto</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>Estudiantes que retoman el estudio después de un tiempo</span>
                </li>
              </ul>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                  <Target className="w-5 h-5 text-orange-600" />
                  <span>¿Qué evalúa?</span>
                </h3>
                <ul className="space-y-2 text-gray-700">
                  <li>• Gramática básica e intermedia</li>
                  <li>• Vocabulario por niveles (A1-B2)</li>
                  <li>• Comprensión de lectura</li>
                  <li>• Conocimiento cultural argentino</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-green-600" />
                  <span>Detalles del examen</span>
                </h3>
                <ul className="space-y-2 text-gray-700">
                  <li>• {PLACEMENT_QUESTIONS.length} preguntas (A1-C2)</li>
                  <li>• 15-20 minutos aproximadamente</li>
                  <li>• Cultura argentina incluida</li>
                  <li>• Entrada flexible para respuestas escritas</li>
                  <li>• Resultados inmediatos y detallados</li>
                  <li>• Recomendaciones personalizadas</li>
                </ul>
              </div>
            </div>

            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-amber-800 font-medium">Consejo importante:</p>
                  <p className="text-amber-700 text-sm">
                    Responde honestamente según tu conocimiento actual. Si no sabes una respuesta, 
                    está bien dejala en blanco. El examen está diseñado para detectar tu nivel real, 
                    incluyendo conocimiento &quot;patchwork&quot; típico de la experiencia real.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-center space-x-4">
              <Button 
                onClick={handleStartExam}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
              >
                <GraduationCap className="w-5 h-5 mr-2" />
                Comenzar Examen
              </Button>
              {onSkip && (
                <Button 
                  onClick={onSkip}
                  variant="outline"
                  size="lg"
                  className="px-8 py-3"
                >
                  Saltar por ahora
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === 'questions') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg">
                  Pregunta {currentQuestionIndex + 1} de {PLACEMENT_QUESTIONS.length}
                </CardTitle>
                <CardDescription>
                  <Badge className={`${getLevelColor(currentQuestion.level)} border mr-2`}>
                    {currentQuestion.level}
                  </Badge>
                  <Badge variant="outline" className="mr-2">
                    {currentQuestion.skill}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    {currentQuestion.points} punto{currentQuestion.points > 1 ? 's' : ''}
                  </span>
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500 mb-2">Progreso</div>
                <Progress value={progress} className="w-32" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {renderQuestion(currentQuestion)}

            <div className="flex justify-between items-center pt-6 border-t">
              <Button
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
                variant="outline"
              >
                Anterior
              </Button>

              <div className="text-sm text-gray-500">
                {Object.keys(answers).length} de {PLACEMENT_QUESTIONS.length} respondidas
              </div>

              <Button
                onClick={handleNext}
                disabled={!answers[currentQuestion.id]}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {currentQuestionIndex === PLACEMENT_QUESTIONS.length - 1 ? 'Finalizar' : 'Siguiente'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === 'results' && result) {
    const examDuration = timeStarted && timeCompleted 
      ? Math.round((timeCompleted.getTime() - timeStarted.getTime()) / 60000)
      : 0;

    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Overall Results */}
        <Card className="border-2 border-blue-200">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <GraduationCap className="w-8 h-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl text-blue-900">
              ¡Examen Completado!
            </CardTitle>
            <CardDescription className="text-lg">
              Tiempo: {examDuration} minutos • Confianza: {result.confidenceScore}%
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">Tu nivel recomendado es:</h3>
                <Badge className={`${getLevelColor(result.recommendedLevel)} border text-2xl px-6 py-2`}>
                  {result.recommendedLevel}
                </Badge>
                <p className="text-sm text-gray-500 mt-2">
                  Unidad {result.recommendedUnit} • Lección {result.recommendedLesson}
                </p>
              </div>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Tiempo estimado para completar este nivel: <strong>{result.estimatedStudyTime}</strong>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Scores */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <span>Puntuación por Nivel</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(result.detailedScores)
                .filter(([level, score]) => score > 0 || ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(level)) // Show all levels with scores
                .map(([level, score]) => (
                <div key={level} className="flex items-center justify-between">
                  <Badge className={`${getLevelColor(level)} border`}>
                    {level}
                  </Badge>
                  <div className="flex items-center space-x-2 flex-1 ml-4">
                    <Progress value={score} className="flex-1" />
                    <span className="text-sm font-medium w-12 text-right">{score}%</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="w-5 h-5 text-green-600" />
                <span>Habilidades</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(result.skillBreakdown).map(([skill, score]) => (
                <div key={skill} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getSkillIcon(skill)}
                    <span className="capitalize">{skill}</span>
                  </div>
                  <div className="flex items-center space-x-2 flex-1 ml-4">
                    <Progress value={score} className="flex-1" />
                    <span className="text-sm font-medium w-12 text-right">{score}%</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Strengths and Weaknesses */}
        <div className="grid md:grid-cols-2 gap-6">
          {result.strengths.length > 0 && (
            <Card className="border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-green-800">
                  <CheckCircle className="w-5 h-5" />
                  <span>Fortalezas</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.strengths.map((strength, index) => (
                    <Badge key={index} className="bg-green-100 text-green-800 border-green-200 mr-2 mb-2">
                      {strength}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {result.weaknesses.length > 0 && (
            <Card className="border-orange-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-orange-800">
                  <AlertCircle className="w-5 h-5" />
                  <span>Áreas de Mejora</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.weaknesses.map((weakness, index) => (
                    <Badge key={index} className="bg-orange-100 text-orange-800 border-orange-200 mr-2 mb-2">
                      {weakness}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recommendations */}
        {result.recommendations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-purple-600" />
                <span>Recomendaciones Personalizadas</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {result.recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <Star className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{recommendation}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4">
          <Button 
            onClick={() => onComplete(result)}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
          >
            <GraduationCap className="w-5 h-5 mr-2" />
            Comenzar con {result.recommendedLevel}
          </Button>
          <Button 
            onClick={() => setPhase('intro')}
            variant="outline"
            size="lg"
            className="px-8 py-3"
          >
            Repetir Examen
          </Button>
        </div>
      </div>
    );
  }

  return null;
}