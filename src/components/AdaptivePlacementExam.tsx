'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  AdaptivePlacementExam, 
  PlacementQuestion, 
  PlacementResult 
} from '@/lib/placement-exam-improved';
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
  MessageSquare,
  Zap
} from 'lucide-react';

interface AdaptivePlacementExamProps {
  onComplete: (result: PlacementResult) => void;
  onSkip?: () => void;
}

type ExamPhase = 'intro' | 'questions' | 'results';

export default function AdaptivePlacementExamComponent({ onComplete, onSkip }: AdaptivePlacementExamProps) {
  const [phase, setPhase] = useState<ExamPhase>('intro');
  const [exam] = useState(() => new AdaptivePlacementExam());
  const [currentQuestion, setCurrentQuestion] = useState<PlacementQuestion | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState<string>('');
  const [result, setResult] = useState<PlacementResult | null>(null);
  const [timeStarted, setTimeStarted] = useState<Date | null>(null);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);

  const handleStartExam = () => {
    setPhase('questions');
    setTimeStarted(new Date());
    const firstQuestion = exam.getNextQuestion();
    setCurrentQuestion(firstQuestion);
  };

  const handleAnswer = (answer: string) => {
    setCurrentAnswer(answer);
  };

  const handleNext = () => {
    if (!currentQuestion || !currentAnswer) return;

    // Submit answer to adaptive exam
    exam.submitAnswer(currentQuestion.id, currentAnswer);
    setQuestionsAnswered(prev => prev + 1);
    setCurrentAnswer('');

    // Get next question
    const nextQuestion = exam.getNextQuestion();
    
    if (nextQuestion) {
      setCurrentQuestion(nextQuestion);
    } else {
      // Exam completed
      const examResult = exam.calculateFinalResult();
      setResult(examResult);
      setPhase('results');
    }
  };

  const handleSkipExam = () => {
    if (onSkip) {
      onSkip();
    }
  };

  const handleCompleteExam = () => {
    if (result) {
      onComplete(result);
    }
  };

  const renderQuestion = (question: PlacementQuestion) => {
    switch (question.type) {
      case 'multiple-choice':
        return (
          <div className="space-y-4">
            <p className="text-lg font-medium">{question.question}</p>
            <RadioGroup 
              value={currentAnswer} 
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
              value={currentAnswer}
              onChange={(e) => handleAnswer(e.target.value)}
              placeholder="Escribe tu respuesta..."
              className="text-base"
            />
          </div>
        );

      case 'reading-comprehension':
        return (
          <div className="space-y-4">
            <p className="text-lg font-medium whitespace-pre-line">{question.question}</p>
            <RadioGroup 
              value={currentAnswer} 
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

      default:
        return null;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'A1': return 'bg-green-100 text-green-800';
      case 'A2': return 'bg-blue-100 text-blue-800';
      case 'B1': return 'bg-yellow-100 text-yellow-800';
      case 'B2': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSkillIcon = (skill: string) => {
    switch (skill) {
      case 'grammar': return <Brain className="w-4 h-4" />;
      case 'vocabulary': return <BookOpen className="w-4 h-4" />;
      case 'reading': return <MessageSquare className="w-4 h-4" />;
      default: return <Star className="w-4 h-4" />;
    }
  };

  if (phase === 'intro') {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full w-fit">
            <Zap className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Adaptive Spanish Placement Exam</CardTitle>
          <CardDescription className="text-lg">
            Smart testing that adapts to your level - fewer questions, accurate results
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start space-x-3">
              <Target className="w-5 h-5 text-blue-500 mt-1" />
              <div>
                <h3 className="font-semibold">Adaptive Testing</h3>
                <p className="text-sm text-gray-600">Questions adjust to your level for efficient assessment</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Clock className="w-5 h-5 text-green-500 mt-1" />
              <div>
                <h3 className="font-semibold">5-12 Minutes</h3>
                <p className="text-sm text-gray-600">Shorter than traditional placement exams</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Brain className="w-5 h-5 text-purple-500 mt-1" />
              <div>
                <h3 className="font-semibold">3 Core Skills</h3>
                <p className="text-sm text-gray-600">Grammar, vocabulary, and reading comprehension</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <GraduationCap className="w-5 h-5 text-orange-500 mt-1" />
              <div>
                <h3 className="font-semibold">A1-B2 Levels</h3>
                <p className="text-sm text-gray-600">From beginner to upper-intermediate</p>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">How it works:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Questions adapt based on your answers</li>
              <li>• Exam stops when your level is clear</li>
              <li>• Culturally neutral content for universal Spanish</li>
              <li>• Immediate detailed feedback</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleStartExam} className="flex-1">
              <CheckCircle className="w-4 h-4 mr-2" />
              Start Placement Exam
            </Button>
            {onSkip && (
              <Button variant="outline" onClick={handleSkipExam}>
                Skip for Now
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (phase === 'questions' && currentQuestion) {
    const estimatedProgress = Math.min((questionsAnswered / 8) * 100, 90); // Show progress but cap at 90% until done

    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center space-x-2">
              <Badge className={getLevelColor(currentQuestion.level)}>
                {currentQuestion.level}
              </Badge>
              <Badge variant="outline">
                {getSkillIcon(currentQuestion.skill)}
                <span className="ml-1 capitalize">{currentQuestion.skill}</span>
              </Badge>
            </div>
            <div className="text-sm text-gray-500">
              Question {questionsAnswered + 1}
            </div>
          </div>
          <Progress value={estimatedProgress} className="mb-2" />
          <p className="text-sm text-gray-600">
            Adaptive exam - questions adjust to your level
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {renderQuestion(currentQuestion)}
          
          <div className="flex justify-between">
            <div></div>
            <Button 
              onClick={handleNext} 
              disabled={!currentAnswer.trim()}
              className="min-w-24"
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (phase === 'results' && result) {
    const duration = timeStarted ? 
      Math.round((new Date().getTime() - timeStarted.getTime()) / 60000) : 0;

    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-green-100 rounded-full w-fit">
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Your Spanish Level</CardTitle>
          <CardDescription>
            Based on {result.questionsAnswered} adaptive questions in {duration} minutes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Level Result */}
          <div className="text-center">
            <div className={`inline-flex items-center px-6 py-3 rounded-full text-2xl font-bold ${getLevelColor(result.recommendedLevel)}`}>
              {result.recommendedLevel}
            </div>
            <p className="mt-2 text-gray-600">
              Start at Unit {result.recommendedUnit}, Lesson {result.recommendedLesson}
            </p>
            <p className="text-sm text-gray-500">
              Confidence: {result.confidenceScore}% • Est. study time: {result.estimatedStudyTime}
            </p>
          </div>

          {/* Skill Breakdown */}
          <div>
            <h3 className="font-semibold mb-3">Skill Analysis</h3>
            <div className="space-y-3">
              {Object.entries(result.skillBreakdown).map(([skill, score]) => (
                <div key={skill} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getSkillIcon(skill)}
                    <span className="capitalize font-medium">{skill}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${score}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-8">{score}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Strengths and Weaknesses */}
          {(result.strengths.length > 0 || result.weaknesses.length > 0) && (
            <div className="grid md:grid-cols-2 gap-4">
              {result.strengths.length > 0 && (
                <div>
                  <h4 className="font-semibold text-green-700 mb-2">Strengths</h4>
                  <div className="space-y-1">
                    {result.strengths.map((strength, index) => (
                      <Badge key={index} variant="outline" className="mr-1 mb-1 text-green-700 border-green-200">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {strength}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {result.weaknesses.length > 0 && (
                <div>
                  <h4 className="font-semibold text-orange-700 mb-2">Areas to Improve</h4>
                  <div className="space-y-1">
                    {result.weaknesses.map((weakness, index) => (
                      <Badge key={index} variant="outline" className="mr-1 mb-1 text-orange-700 border-orange-200">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        {weakness}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Recommendations */}
          {result.recommendations.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Personalized Recommendations</h3>
              <ul className="space-y-2">
                {result.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <Star className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Button onClick={handleCompleteExam} className="w-full">
            Start Learning at {result.recommendedLevel} Level
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
}