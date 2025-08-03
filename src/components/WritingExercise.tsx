'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Languages, 
  Edit, 
  PenTool, 
  FileText, 
  Clock, 
  X, 
  Lightbulb, 
  Send, 
  SkipForward,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface WritingExerciseProps {
  isActive: boolean;
  prompt: string;
  expectedAnswer?: string;
  hints?: string[];
  exerciseType: 'translation' | 'conjugation' | 'sentence' | 'fill-blank';
  onSubmit: (answer: string) => void;
  onClose: () => void;
  timeoutSeconds?: number;
}

export default function WritingExercise({
  isActive,
  prompt,
  expectedAnswer,
  hints = [],
  exerciseType,
  onSubmit,
  onClose,
  timeoutSeconds = 60
}: WritingExerciseProps) {
  const [answer, setAnswer] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timeoutSeconds);
  const [showHints, setShowHints] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Focus input when exercise becomes active
  useEffect(() => {
    if (isActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isActive]);

  // Reset state when exercise becomes active
  useEffect(() => {
    if (isActive) {
      setAnswer('');
      setIsSubmitted(false);
      setTimeLeft(timeoutSeconds);
      setShowHints(false);
    }
  }, [isActive, timeoutSeconds]);

  const handleSubmit = useCallback(() => {
    if (isSubmitted) return;
    
    setIsSubmitted(true);
    onSubmit(answer.trim());
  }, [isSubmitted, onSubmit, answer]);

  // Countdown timer
  useEffect(() => {
    if (!isActive || isSubmitted) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Auto-submit when time runs out
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, isSubmitted, handleSubmit]);



  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const getExerciseIcon = () => {
    switch (exerciseType) {
      case 'translation': return <Languages className="w-6 h-6" />;
      case 'conjugation': return <Edit className="w-6 h-6" />;
      case 'sentence': return <PenTool className="w-6 h-6" />;
      case 'fill-blank': return <FileText className="w-6 h-6" />;
      default: return <PenTool className="w-6 h-6" />;
    }
  };

  const getExerciseTypeText = () => {
    switch (exerciseType) {
      case 'translation': return { es: 'Ejercicio de Traducción', en: 'Translation Exercise' };
      case 'conjugation': return { es: 'Ejercicio de Conjugación', en: 'Conjugation Exercise' };
      case 'sentence': return { es: 'Escritura de Oraciones', en: 'Sentence Writing' };
      case 'fill-blank': return { es: 'Completar Espacios', en: 'Fill in the Blank' };
      default: return { es: 'Ejercicio de Escritura', en: 'Writing Exercise' };
    }
  };

  if (!isActive) return null;

  const exerciseText = getExerciseTypeText();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-card border shadow-2xl">
        <CardContent className="p-0">
          {/* Header */}
          <div className="bg-primary/5 border-b border-primary/20 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  {getExerciseIcon()}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">{exerciseText.es}</h2>
                  <p className="text-muted-foreground text-sm">
                    {exerciseText.en} • Escribe tu respuesta en español
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {/* Timer */}
                <Badge variant="outline" className="bg-warning/10 border-warning/20 text-warning">
                  <Clock className="w-3 h-3 mr-1" />
                  <span className="text-sm font-medium">
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </span>
                </Badge>
                {/* Close button */}
                <Button
                  onClick={onClose}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Prompt */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <p className="text-foreground font-medium text-lg leading-relaxed">
                  {prompt}
                </p>
              </CardContent>
            </Card>

            {/* Hints */}
            {hints.length > 0 && (
              <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800/30">
                <CardContent className="p-4">
                  <Button
                    onClick={() => setShowHints(!showHints)}
                    variant="ghost"
                    className="p-0 h-auto font-medium text-blue-700 hover:text-blue-800 hover:bg-transparent dark:text-blue-300 dark:hover:text-blue-200"
                  >
                    <Lightbulb className="w-4 h-4 mr-2" />
                    {showHints ? 'Ocultar' : 'Mostrar'} Pistas ({hints.length})
                    {showHints ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
                  </Button>
                  
                  {showHints && (
                    <div className="mt-4 space-y-3">
                      {hints.map((hint, index) => (
                        <div key={index} className="bg-blue-100 border border-blue-300 rounded-lg p-3 dark:bg-blue-900/30 dark:border-blue-700/50">
                          <p className="text-blue-900 text-sm dark:text-blue-100">
                            <Badge variant="outline" className="mr-2 bg-blue-200 border-blue-400 text-blue-800 dark:bg-blue-800/50 dark:border-blue-600 dark:text-blue-200">
                              Pista {index + 1}
                            </Badge>
                            {hint}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Answer Input */}
            <div className="space-y-3">
              <Label htmlFor="answer-input" className="text-sm font-medium text-foreground">
                Tu Respuesta • Your Answer:
              </Label>
              <Textarea
                id="answer-input"
                ref={inputRef}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isSubmitted}
                placeholder="Escribe tu respuesta en español aquí..."
                className="input-field resize-none h-24 disabled:bg-muted disabled:cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">
                Presiona Enter para enviar, o Shift+Enter para nueva línea
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {answer.trim() && (
                  <Badge variant="outline" className="text-xs">
                    {answer.trim().split(' ').length} palabra{answer.trim().split(' ').length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              
              <div className="flex gap-3">
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="px-4 py-2"
                >
                  <SkipForward className="w-4 h-4 mr-2" />
                  Saltar
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!answer.trim() || isSubmitted}
                  className="btn-primary px-6 py-2"
                >
                  {isSubmitted ? (
                    'Enviado'
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Enviar
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Progress indicator */}
            {timeLeft < timeoutSeconds && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Progreso • Progress</span>
                  <span>{Math.round(((timeoutSeconds - timeLeft) / timeoutSeconds) * 100)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${((timeoutSeconds - timeLeft) / timeoutSeconds) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper function to create different types of writing exercises
export function createWritingExercise(type: WritingExerciseProps['exerciseType'], config: {
  spanish?: string;
  english?: string;
  verb?: string;
  sentence?: string;
  blank?: string;
  context?: string;
}): Omit<WritingExerciseProps, 'isActive' | 'onSubmit' | 'onClose'> {
  
  switch (type) {
    case 'translation':
      return {
        prompt: `Translate this to Spanish: "${config.english}"`,
        expectedAnswer: config.spanish,
        hints: config.spanish ? [
          `The answer has ${config.spanish.length} characters`,
          `It starts with "${config.spanish.charAt(0).toUpperCase()}"`
        ] : [],
        exerciseType: 'translation'
      };

    case 'conjugation':
      return {
        prompt: `Conjugate the verb "${config.verb}" in the present tense for "yo" (I)`,
        expectedAnswer: config.spanish,
        hints: [
          'Remember the ending changes based on whether it\'s -ar, -er, or -ir',
          'For "yo" form, most verbs end in -o'
        ],
        exerciseType: 'conjugation'
      };

    case 'sentence':
      return {
        prompt: `Write a sentence using: ${config.spanish}`,
        hints: [
          'Start with a capital letter and end with a period',
          'Remember subject-verb-object order in Spanish',
          `Try to use "${config.spanish}" naturally in context`
        ],
        exerciseType: 'sentence'
      };

    case 'fill-blank':
      return {
        prompt: `Fill in the blank: ${config.sentence}`,
        expectedAnswer: config.spanish,
        hints: [
          'Think about the context of the sentence',
          config.context ? `Context: ${config.context}` : ''
        ].filter(Boolean),
        exerciseType: 'fill-blank'
      };

    default:
      return {
        prompt: config.sentence || 'Complete this writing exercise',
        exerciseType: 'sentence'
      };
  }
}