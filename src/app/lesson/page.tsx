'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Notebook, { categorizeNote } from '@/components/Notebook';
import MistakeJournal from '@/components/MistakeJournal';
import VoiceHUD from '@/components/VoiceHUD';
import WritingExercise, { createWritingExercise } from '@/components/WritingExercise';
import PronunciationDrillModal from '@/components/PronunciationDrillModal';
import ListeningExerciseModal from '@/components/ListeningExerciseModal';
import ReadingPassageModal from '@/components/ReadingPassageModal';
import FluencySprintModal from '@/components/FluencySprintModal';
import type {
  RequestFluencySprintArgs,
  RequestListeningExerciseArgs,
  RequestPronunciationDrillArgs,
  RequestReadingPassageArgs,
} from '@/lib/realtime-tools';
import { useAuth } from '../providers';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Mic, 
  MessageSquare, 
  BookOpen, 
  Target, 
  CheckCircle, 
  Home, 
  RotateCcw, 
  Trash2, 
  Clock, 
  User, 
  Bot,
  Loader2,
  ArrowRight,
  PlayCircle,
  StopCircle,
  Volume2
} from 'lucide-react';

interface Message {
  id: string;
  timestamp: Date;
  type: 'user' | 'ai';
  content: string;
}

interface NotebookEntry {
  id: string;
  text: string;
  timestamp: Date;
  type: 'vocabulary' | 'note' | 'title';
}

interface WritingExerciseData {
  id: string;
  type:
    | 'translation'
    | 'conjugation'
    | 'sentence'
    | 'fill-blank'
    | 'scene-description'
    | 'opinion-prompt';
  prompt: string;
  expectedAnswer?: string;
  hints?: string[];
  submittedAt?: Date;
  userAnswer?: string;
}

export default function LessonPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [currentAiMessage, setCurrentAiMessage] = useState('');
  const [notebookEntries, setNotebookEntries] = useState<NotebookEntry[]>([]);
  const [lessonStartTime] = useState(Date.now());
  const [isLessonCompleted, setIsLessonCompleted] = useState(false);
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);
  const [currentLessonData, setCurrentLessonData] = useState<any | null>(null);
  const [lessonReady, setLessonReady] = useState(false);
  const [lessonProgress, setLessonProgress] = useState<{lessonNumber: number, totalLessons: number, progressPercent: number} | null>(null);
  const [checkingCompletion, setCheckingCompletion] = useState(true);
  const [loadingNextLesson, setLoadingNextLesson] = useState(false);
  
  // Writing exercise state
  const [currentWritingExercise, setCurrentWritingExercise] = useState<WritingExerciseData | null>(null);
  const [isWritingExerciseActive, setIsWritingExerciseActive] = useState(false);
  const [completedWritingExercises, setCompletedWritingExercises] = useState<WritingExerciseData[]>([]);

  // Drill modal states. Each independently controls its own modal — the AI
  // may open only one at a time in practice, but the prop surface is kept
  // independent so nothing prevents future overlap.
  const [pronunciationDrill, setPronunciationDrill] =
    useState<RequestPronunciationDrillArgs | null>(null);
  const [listeningExercise, setListeningExercise] =
    useState<RequestListeningExerciseArgs | null>(null);
  const [readingPassage, setReadingPassage] =
    useState<RequestReadingPassageArgs | null>(null);
  const [fluencySprint, setFluencySprint] =
    useState<RequestFluencySprintArgs | null>(null);

  const voiceHUDRef = useRef<any>(null);
  const isLoadingLessonRef = useRef<boolean>(false);

  // Check for explicit lesson selection (URL id has highest priority)
  useEffect(() => {
    const queryLessonId =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('id')
        : null;
    if (queryLessonId) {
      setCurrentLessonId(queryLessonId);
      console.log('Using lesson from URL query:', queryLessonId);
      return;
    }

    const selectedLessonId = localStorage.getItem('selectedLessonId');
    if (selectedLessonId) {
      setCurrentLessonId(selectedLessonId);
      // Don't clear localStorage immediately - keep it until user navigates away
      // This allows refreshing to work correctly
      console.log('Using custom selected lesson:', selectedLessonId);
    }
  }, []);

  // Handle voice messages from the AI
  const handleMessageReceived = useCallback((message: any) => {
    // Only log important messages, not every WebSocket message
    if (message.type === 'error' || message.type === 'session.created' || message.type === 'session.ended') {
      console.log('Lesson - Important message:', message.type, message);
    }
    
    // Handle different message types
    switch (message.type) {
      case 'session.created':
        setIsSessionActive(true);
        break;
        
      case 'response.done':
        setIsSessionActive(true);
        break;
        
      case 'error':
        console.error('Voice session error:', message.error);
        setIsSessionActive(false);
        break;
    }
  }, []);

  // Complete lesson and save progress
  const completeLessonNow = useCallback(async () => {
    if (isLessonCompleted || !user || !currentLessonId) {
      if (isLessonCompleted) {
        alert('This lesson has already been completed! 🎉\n\nUse the "Go to Next Lesson" button to continue, or go back to the main menu.');
      }
      return;
    }
    
    try {
      const durationMin = Math.round((Date.now() - lessonStartTime) / 60000);
      console.log('Completing lesson:', currentLessonId, 'Duration:', durationMin, 'minutes');
      
      // Call the complete lesson API first
      const response = await fetch('/api/complete-lesson', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lessonId: currentLessonId,
          durationMin
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to complete lesson');
      }
      
      const result = await response.json();
      console.log('Lesson completed successfully:', result);
      
      // Now perform session analysis for error tracking
      try {
        console.log('Analyzing session for errors...');
        
        // Prepare conversation transcript
        const transcript = messages
          .map(msg => `${msg.type === 'user' ? 'Student' : 'Teacher'}: ${msg.content}`)
          .join('\n');
        
        // Only analyze if we have meaningful conversation data
        if (transcript.length > 50 && messages.length > 2) {
          const analysisResponse = await fetch('/api/summary', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sessionId: result.sessionId || null,
              lessonId: currentLessonId,
              transcript: transcript,
              notebookEntries: notebookEntries.map(entry => ({
                text: entry.text,
                type: entry.type
              })),
              duration: durationMin,
              mistakes: [] // Could add any detected mistakes here
            }),
          });
          
          if (analysisResponse.ok) {
            const analysisResult = await analysisResponse.json();
            console.log('Session analysis completed:', analysisResult);
            
            // Log successful error analysis
            if (analysisResult.errorsLogged > 0) {
              console.log(`✅ Logged ${analysisResult.errorsLogged} errors for future reference`);
            }
          } else {
            console.warn('Session analysis failed, but lesson still completed');
          }
        } else {
          console.log('Skipping session analysis - insufficient conversation data');
        }
      } catch (analysisError) {
        console.warn('Session analysis failed, but lesson still completed:', analysisError);
        // Don't fail the lesson completion if analysis fails
      }
      
      setIsLessonCompleted(true);
      
      // Show completion message with homework assignment
      let completionMessage = `¡Excelente! Lesson completed successfully! 🎉\n\nProgress: ${result.levelProgression?.completionPercentage || 0}% of ${result.levelProgression?.currentLevel || 'A1'} level`;
      
      if (result.homeworkAssigned) {
        const homeworkType = result.homeworkAssigned.type === 'writing' ? 'Writing' : 'Speaking';
        const dueDate = new Date(result.homeworkAssigned.dueAt).toLocaleDateString();
        completionMessage += `\n\n📝 New ${homeworkType} Homework Assigned!\nDue: ${dueDate}\n\nCheck the Homework section to complete your assignment.`;
      }
      
      completionMessage += '\n\nUse the "Go to Next Lesson" button to continue, or go back to the main menu.';
      
      alert(completionMessage);
      
    } catch (error) {
      console.error('Error completing lesson:', error);
      alert('Error saving lesson progress. Please try again.');
    }
  }, [isLessonCompleted, user, lessonStartTime, currentLessonId, messages, notebookEntries]);

  // Lesson completion is now driven by the request_end_lesson tool call in
  // VoiceHUD (via the onLessonComplete prop). We no longer regex-match
  // transcripts for ending phrases — the prompt + tool contract guarantees
  // that the AI cannot end the lesson without first getting permission from
  // the client.
  const handleLessonComplete = useCallback(() => {
    if (isLessonCompleted) return;
    completeLessonNow();
  }, [completeLessonNow, isLessonCompleted]);

  const handleTranscriptReceived = useCallback((transcript: string, isUser: boolean, isStreaming?: boolean) => {
    if (!transcript.trim()) return;

    if (isUser) {
      const newMessage: Message = {
        id: Date.now().toString(),
        timestamp: new Date(),
        type: 'user',
        content: transcript.trim()
      };
      setMessages(prev => [...prev, newMessage]);
      setCurrentTranscript(transcript);
    } else {
      if (isStreaming) {
        setCurrentAiMessage(prev => prev + transcript);
      } else {
        if (transcript.trim()) {
          const newMessage: Message = {
            id: Date.now().toString(),
            timestamp: new Date(),
            type: 'ai',
            content: transcript.trim()
          };
          setMessages(prev => [...prev, newMessage]);
        }
        setCurrentAiMessage('');
      }
    }
  }, []);

  // Handle adding entries to the notebook from AI. The second `english`
  // argument comes from the add_to_notebook tool; we don't display it
  // separately yet (the Notebook UI still just renders the Spanish text),
  // but we persist it server-side via VoiceHUD for SRS purposes.
  const handleNotebookEntry = useCallback((text: string, _english?: string) => {
    void _english;
    const trimmedText = text.trim();
    console.log('Lesson: Attempting to add notebook entry:', trimmedText);
    
    // Use functional setState to avoid race conditions with duplicate checking
    setNotebookEntries(prev => {
      // Check for duplicates (case-insensitive) using the latest state
      const isDuplicate = prev.some(entry => 
        entry.text.toLowerCase() === trimmedText.toLowerCase()
      );
      
      if (isDuplicate) {
        console.log('Lesson: Skipping duplicate entry:', trimmedText);
        return prev; // Return unchanged state
      }
      
      const newEntry: NotebookEntry = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        text: trimmedText,
        timestamp: new Date(),
        type: categorizeNote(trimmedText)
      };
      
      console.log('Lesson: Added new notebook entry:', newEntry);
      return [...prev, newEntry]; // Return new state with added entry
    });
  }, []); // Remove notebookEntries dependency to prevent callback recreation

  // Handle writing exercise requests from the AI (now delivered via the
  // request_writing_exercise tool call rather than parsed from speech).
  const handleWritingExerciseRequest = useCallback(
    (exerciseData: {
      exerciseType:
        | 'translation'
        | 'sentence'
        | 'conjugation'
        | 'fill-blank'
        | 'scene-description'
        | 'opinion-prompt';
      prompt: string;
      expectedAnswer?: string;
      hints?: string[];
    }) => {
      console.log('📝 Writing exercise requested:', exerciseData);

      const exercise: WritingExerciseData = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        type: exerciseData.exerciseType,
        prompt: exerciseData.prompt,
        expectedAnswer: exerciseData.expectedAnswer,
        hints: exerciseData.hints || [],
      };

      setCurrentWritingExercise(exercise);
      setIsWritingExerciseActive(true);
    },
    []
  );

  // Handle writing exercise submission
  const handleWritingExerciseSubmit = useCallback((answer: string) => {
    if (!currentWritingExercise) return;
    
    const completedExercise: WritingExerciseData = {
      ...currentWritingExercise,
      userAnswer: answer,
      submittedAt: new Date()
    };
    
    setCompletedWritingExercises(prev => [...prev, completedExercise]);
    console.log('📝 Writing exercise submitted:', completedExercise);
    
    // Close the exercise
    setIsWritingExerciseActive(false);
    setCurrentWritingExercise(null);
    
    // Add to conversation history so user can see it
    const exerciseMessage: Message = {
      id: Date.now().toString(),
      timestamp: new Date(),
      type: 'user',
      content: `[Writing Exercise] ${currentWritingExercise.prompt} → My answer: "${answer}"`
    };
    setMessages(prev => [...prev, exerciseMessage]);
    
    // Send completion to AI through voice connection
    if (voiceHUDRef.current) {
      voiceHUDRef.current.sendWritingExerciseResult({
        prompt: currentWritingExercise.prompt,
        answer: answer,
        exerciseType: currentWritingExercise.type
      });
    }
  }, [currentWritingExercise]);

  // Drill-modal handlers. Each simply stashes the tool args into state so
  // the corresponding modal renders. Closing a modal just clears its state.
  const handlePronunciationDrill = useCallback(
    (args: RequestPronunciationDrillArgs) => setPronunciationDrill(args),
    []
  );
  const handleListeningExercise = useCallback(
    (args: RequestListeningExerciseArgs) => setListeningExercise(args),
    []
  );
  const handleReadingPassage = useCallback(
    (args: RequestReadingPassageArgs) => setReadingPassage(args),
    []
  );
  const handleFluencySprint = useCallback(
    (args: RequestFluencySprintArgs) => setFluencySprint(args),
    []
  );

  // Handle writing exercise close/skip
  const handleWritingExerciseClose = useCallback(() => {
    console.log('📝 Writing exercise closed/skipped');
    setIsWritingExerciseActive(false);
    setCurrentWritingExercise(null);
    
    // Add skip message to conversation
    const skipMessage: Message = {
      id: Date.now().toString(),
      timestamp: new Date(), 
      type: 'user',
      content: '[Writing Exercise Skipped]'
    };
    setMessages(prev => [...prev, skipMessage]);
  }, []);

  // Navigate to next lesson
  const goToNextLesson = useCallback(async () => {
    if (!user) return;
    
    setLoadingNextLesson(true);
    
    try {
      // Fetch the next recommended lesson
      const response = await fetch('/api/lesson-of-day');
      if (!response.ok) {
        throw new Error('Failed to fetch next lesson');
      }
      
      const lessonData = await response.json();
      const nextLesson = lessonData.recommendedLesson?.lesson;
      
      if (nextLesson?.id) {
        console.log('Navigating to next lesson:', nextLesson.id, nextLesson.title);
        
        // Clear any custom lesson selection to use recommended flow
        localStorage.removeItem('selectedLessonId');
        
        // Reset all lesson-related state
        setIsLessonCompleted(false);
        setMessages([]);
        setNotebookEntries([]);
        setCurrentTranscript('');
        setCurrentAiMessage('');
        setIsSessionActive(false);
        setCurrentWritingExercise(null);
        setIsWritingExerciseActive(false);
        setCompletedWritingExercises([]);
        setCheckingCompletion(true); // Show loading state while new lesson loads
        setLessonProgress(null); // Reset lesson progress
        
        // Update the current lesson data - this will trigger the checkLessonCompletion useEffect
        setCurrentLessonId(nextLesson.id);
        setCurrentLessonData(nextLesson);
        
        console.log('Successfully loaded next lesson:', nextLesson.title);
      } else {
        // Fallback to home page if no lesson found
        console.warn('No next lesson found, redirecting to home');
        router.push('/');
      }
    } catch (error) {
      console.error('Error fetching next lesson:', error);
      // Fallback to home page on error
      router.push('/');
    } finally {
      setLoadingNextLesson(false);
    }
  }, [user, router]);

  // Clear notebook entries
  const clearNotebook = useCallback(() => {
    setNotebookEntries([]);
    console.log('Lesson: Cleared notebook');
  }, []);

  // Clear conversation
  const clearConversation = useCallback(() => {
    setMessages([]);
    setCurrentTranscript('');
  }, []);

  // Check if current lesson is already completed
  useEffect(() => {
    const checkLessonCompletion = async () => {
      if (!user || isLoadingLessonRef.current) return;

      try {
        isLoadingLessonRef.current = true;
        setCheckingCompletion(true);
        setLessonReady(false); // New: Reset lesson ready state
        
        // Determine which lesson to load (URL id takes precedence)
        const queryLessonId =
          typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search).get('id')
            : null;
        const storedLessonId = localStorage.getItem('selectedLessonId');
        const selectedLessonId = queryLessonId || storedLessonId;

        if (selectedLessonId) {
          // Explicit lesson selected via query or catalog
          console.log(
            queryLessonId
              ? 'Attempting to load lesson from URL query:'
              : 'Attempting to load custom lesson:',
            selectedLessonId
          );
          
          // Fetch the full lesson catalog to find the selected lesson data
          const response = await fetch('/api/lessons');
          if (response.ok) {
            const data = await response.json();
            const selectedLesson = data.lessons.find((lesson: any) => lesson.id === selectedLessonId);
            
            if (selectedLesson) {
              setCurrentLessonData(selectedLesson);
              setCurrentLessonId(selectedLessonId);
              // For explicitly selected lessons, we don't show sequence progress bars
              setLessonProgress(null);
              console.log('Loaded lesson data:', selectedLesson.title);

              // Check if this lesson is already completed
              const progressResponse = await fetch(`/api/user-progress?lesson_id=${selectedLessonId}`);
              if (progressResponse.ok) {
                const progressData = await progressResponse.json();
                setIsLessonCompleted(progressData.completed || false);
              }
              setLessonReady(true); // New: Mark lesson as ready
              setCheckingCompletion(false);
              return;
            }
          }
        }
        
        // Fallback to lesson-of-the-day if no specific lesson is found or loaded
        const lessonResponse = await fetch('/api/lesson-of-day');
        if (!lessonResponse.ok) {
          setCheckingCompletion(false);
          setLessonReady(true);
          return;
        }
        
        const lessonData = await lessonResponse.json();
        const lesson = lessonData.recommendedLesson?.lesson;
        const reason = lessonData.recommendedLesson?.reason;
        const lessonId = lesson?.id;
        
        if (!lesson || !lessonId) {
          setCheckingCompletion(false);
          setLessonReady(true);
          return;
        }
        
        setCurrentLessonId(lessonId);
        setCurrentLessonData(lesson);
        
        if (reason) {
          const progressMatch = reason.match(/Lesson (\d+) of (\d+) • (\d+)% complete/);
          if (progressMatch) {
            setLessonProgress({
              lessonNumber: parseInt(progressMatch[1]),
              totalLessons: parseInt(progressMatch[2]),
              progressPercent: parseInt(progressMatch[3])
            });
          }
        }
        
        const progressResponse = await fetch(`/api/user-progress?lesson_id=${lessonId}`);
        if (progressResponse.ok) {
          const progressData = await progressResponse.json();
          setIsLessonCompleted(progressData.completed || false);
        }

      } catch (error) {
        console.error('Error checking lesson completion:', error);
      } finally {
        setCheckingCompletion(false);
        setLessonReady(true); // New: Mark lesson as ready even on error
        isLoadingLessonRef.current = false;
      }
    };

    checkLessonCompletion();
  }, [user]);

  // Cleanup: Clear custom lesson selection when navigating away
  useEffect(() => {
    const handlePopState = () => {
      // Clear when using browser back/forward buttons
      localStorage.removeItem('selectedLessonId');
    };
    
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);





  return (
    <div className="min-h-screen bg-background">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        {currentLessonData ? (
          <Card className="bg-primary/5 border-primary/20 ring-1 ring-primary/10">
            <CardContent className="p-6">
              <div className="flex items-center flex-wrap gap-2 mb-4">
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  {currentLessonData.cefr}
                </Badge>
                <Badge variant="outline">
                  Unit {currentLessonData.unit}
                </Badge>
                <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                  <BookOpen className="w-3 h-3 mr-1" />
                  Lesson {currentLessonData.lesson}
                </Badge>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>~{currentLessonData.estimatedDuration} min</span>
                </div>
              </div>
              
              <h1 className="text-2xl font-bold text-foreground mb-2">
                {currentLessonData.title}
              </h1>
              
              {lessonProgress && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">
                      Progreso: {lessonProgress.lessonNumber} de {lessonProgress.totalLessons} lecciones
                    </span>
                    <span className="text-foreground font-medium">
                      {lessonProgress.progressPercent}% completo
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${lessonProgress.progressPercent}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              <p className="text-muted-foreground">
                ¡Hola {user?.email?.split('@')[0] || 'che'}! Practicá español conversacional con Profesora Milagros.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Practice conversational Spanish with Profesora Milagros
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6">
              <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
                <MessageSquare className="w-8 h-8 text-primary" />
                Conversación en Español con Profesora Milagros
              </h1>
              <p className="text-muted-foreground">
                ¡Hola {user?.email?.split('@')[0] || 'che'}! Practica español conversacional con interacción de voz en tiempo real y notas de vocabulario.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Practice conversational Spanish with real-time voice interaction and vocabulary notes
              </p>
            </CardContent>
          </Card>
        )}

        {/* Completion Status */}
        {checkingCompletion ? (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-primary font-medium">Verificando estado de la lección...</span>
                <span className="text-xs text-muted-foreground">• Checking lesson status</span>
              </div>
            </CardContent>
          </Card>
        ) : isLessonCompleted ? (
          <Card className="bg-success/5 border-success/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-success" />
                  <div>
                    <h3 className="font-semibold text-success">
                      {currentLessonData ? 
                        `¡Lección ${currentLessonData.lesson} Ya Completada!` : 
                        '¡Lección Ya Completada!'
                      }
                    </h3>
                    <p className="text-sm text-success/80">
                      {currentLessonData ? 
                        `Ya terminaste "${currentLessonData.title}". Usa los botones para continuar.` :
                        "Ya terminaste esta lección. Usa los botones para continuar."
                      }
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={goToNextLesson}
                    disabled={loadingNextLesson}
                    className="btn-primary"
                  >
                    {loadingNextLesson ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Cargando...
                      </>
                    ) : (
                      <>
                        <ArrowRight className="w-4 h-4 mr-2" />
                        Siguiente
                      </>
                    )}
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/" onClick={() => localStorage.removeItem('selectedLessonId')}>
                      <Home className="w-4 h-4 mr-2" />
                      Menú
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Top Controls Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          {/* Microphone Connection */}
          <Card className="h-full">
            <CardContent className="p-4 h-full flex flex-col">
              <div className="flex items-center gap-2 mb-3 min-h-[20px]">
                <Mic className="w-4 h-4 text-primary flex-shrink-0" />
                <h3 className="font-medium text-foreground text-sm flex-1 min-w-0">Conectar Micrófono</h3>
                <div className="flex items-center gap-1 text-xs bg-success/10 px-2 py-1 rounded-full flex-shrink-0">
                  <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse"></div>
                  <span className="text-success font-medium">ES</span>
                </div>
              </div>
              <div className="flex-1">
                {lessonReady ? (
                  <VoiceHUD
                    onMessageReceived={handleMessageReceived}
                    onTranscriptReceived={handleTranscriptReceived}
                    onNotebookEntry={handleNotebookEntry}
                    onWritingExerciseRequest={handleWritingExerciseRequest}
                    onWritingExerciseCompleted={handleWritingExerciseSubmit}
                    onPronunciationDrill={handlePronunciationDrill}
                    onListeningExercise={handleListeningExercise}
                    onReadingPassage={handleReadingPassage}
                    onFluencySprint={handleFluencySprint}
                    onLessonComplete={handleLessonComplete}
                    currentLessonData={currentLessonData}
                    lessonId={currentLessonId}
                    conversationHistory={messages}
                    notebookEntries={notebookEntries}
                    ref={voiceHUDRef}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <span className="ml-2 text-muted-foreground">Cargando lección...</span>
                  </div>
                )}
                
                {/* Helpful hint for new lessons */}
                {messages.length === 0 && lessonReady && (
                  <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-primary">
                      <Volume2 className="w-4 h-4 flex-shrink-0" />
                      <span className="font-medium">Para empezar:</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Conectá el micrófono y decí <strong>&quot;Hola&quot;</strong> para comenzar tu lección con Profesora Milagros
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Controls */}
          <Card className="h-full">
            <CardContent className="p-4 h-full flex flex-col">
              <div className="flex items-center gap-2 mb-3 min-h-[20px]">
                <PlayCircle className="w-4 h-4 text-primary flex-shrink-0" />
                <h3 className="font-medium text-foreground text-sm">Controles</h3>
              </div>
              <div className="flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <Button
                    onClick={completeLessonNow}
                    disabled={isLessonCompleted}
                    className={`w-full text-xs px-3 py-2 ${
                      isLessonCompleted 
                        ? 'btn-secondary cursor-not-allowed' 
                        : 'btn-primary'
                    }`}
                  >
                    {isLessonCompleted ? (
                      <>
                        <CheckCircle className="w-3 h-3 mr-1 flex-shrink-0" />
                        <span className="truncate">{currentLessonData ? `Lección ${currentLessonData.lesson} Completada` : 'Completada'}</span>
                      </>
                    ) : (
                      <>
                        <Target className="w-3 h-3 mr-1 flex-shrink-0" />
                        <span className="truncate">{currentLessonData ? `Completar Lección ${currentLessonData.lesson}` : 'Completar Lección'}</span>
                      </>
                    )}
                  </Button>
                  
                  {isLessonCompleted && (
                    <div className="space-y-1">
                      <Button
                        onClick={goToNextLesson}
                        disabled={loadingNextLesson}
                        className="w-full btn-primary text-xs px-3 py-2"
                      >
                        {loadingNextLesson ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin flex-shrink-0" />
                            <span>Cargando...</span>
                          </>
                        ) : (
                          <>
                            <ArrowRight className="w-3 h-3 mr-1 flex-shrink-0" />
                            <span>Siguiente Lección</span>
                          </>
                        )}
                      </Button>
                      <Button asChild variant="outline" className="w-full text-xs px-3 py-2">
                        <Link href="/" onClick={() => localStorage.removeItem('selectedLessonId')}>
                          <Home className="w-3 h-3 mr-1 flex-shrink-0" />
                          <span>Menú Principal</span>
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
                
                {isLessonCompleted && (
                  <div className="mt-3 p-2 bg-success/10 border border-success/20 rounded-lg">
                    <p className="text-xs text-success font-medium flex items-center">
                      <CheckCircle className="w-3 h-3 mr-1 flex-shrink-0" />
                      <span className="truncate">¡Progreso guardado!</span>
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Clear Actions */}
          <Card className="h-full">
            <CardContent className="p-4 h-full flex flex-col">
              <div className="flex items-center gap-2 mb-3 min-h-[20px]">
                <RotateCcw className="w-4 h-4 text-primary flex-shrink-0" />
                <h3 className="font-medium text-foreground text-sm">Limpiar</h3>
              </div>
              <div className="flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <Button
                    onClick={clearConversation}
                    variant="outline"
                    className="w-full text-xs px-3 py-2"
                  >
                    <Trash2 className="w-3 h-3 mr-1 flex-shrink-0" />
                    <span>Conversación</span>
                  </Button>
                  <Button
                    onClick={clearNotebook}
                    variant="outline"
                    className="w-full text-xs px-3 py-2 text-destructive border-destructive/20 hover:bg-destructive/10"
                  >
                    <Trash2 className="w-3 h-3 mr-1 flex-shrink-0" />
                    <span>Notas</span>
                  </Button>
                </div>
                
                {/* Spacer to maintain height consistency */}
                <div className="mt-auto">
                  {isLessonCompleted && (
                    <div className="mt-3 p-2 bg-success/10 border border-success/20 rounded-lg">
                      <p className="text-xs text-success font-medium flex items-center">
                        <CheckCircle className="w-3 h-3 mr-1 flex-shrink-0" />
                        <span className="truncate">¡Progreso guardado!</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main: conversation (primary) + sticky study rail */}
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <Card className="bg-primary/5 border-primary/20 ring-1 ring-primary/10">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <MessageSquare className="w-5 h-5 text-primary shrink-0" />
                    <h2 className="text-lg sm:text-xl font-bold text-foreground">
                      Conversación
                    </h2>
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      • Conversation
                    </span>
                  </div>
                  <Button
                    onClick={clearConversation}
                    variant="outline"
                    size="sm"
                    className="text-xs shrink-0 self-start sm:self-auto"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Limpiar
                  </Button>
                </div>

                <div className="space-y-3 min-h-[320px] max-h-[min(600px,65vh)] sm:max-h-[min(640px,70vh)] overflow-y-auto rounded-lg border border-border/40 bg-card/30 p-2">
                  {messages.length === 0 ? (
                    <div className="text-center py-10 sm:py-12 text-muted-foreground px-2">
                      <MessageSquare className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 opacity-50" />
                      <p className="font-medium text-foreground">Aún no hay conversación</p>
                      <p className="text-sm mt-1">
                        Conectá el micrófono arriba y empezá a hablar con la profesora.
                      </p>
                      <p className="text-xs mt-2 opacity-90">
                        Connect your mic above to start the voice lesson.
                      </p>
                    </div>
                  ) : (
                    <>
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex items-start gap-3 ${
                            message.type === 'user' ? 'justify-start' : 'justify-start'
                          }`}
                        >
                          <div className={`p-1 rounded-full ${
                            message.type === 'user' ? 'bg-primary/10' : 'bg-success/10'
                          }`}>
                            {message.type === 'user' ? (
                              <User className="w-4 h-4 text-primary" />
                            ) : (
                              <Bot className="w-4 h-4 text-success" />
                            )}
                          </div>
                          <div
                            className={`px-4 py-3 rounded-lg max-w-md flex-1 ${
                              message.type === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-card text-card-foreground border'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium">
                                {message.type === 'user' ? 'Vos' : 'Profesora Milagros'}
                              </span>
                              <span className="text-xs opacity-75">
                                {message.timestamp.toLocaleTimeString([], { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </span>
                            </div>
                            <p className="text-sm">{message.content}</p>
                          </div>
                        </div>
                      ))}
                      
                      {/* Current AI streaming message */}
                      {currentAiMessage && (
                        <div className="flex items-start gap-3">
                          <div className="p-1 rounded-full bg-success/10">
                            <Bot className="w-4 h-4 text-success" />
                          </div>
                          <div className="px-4 py-3 rounded-lg max-w-md bg-muted text-muted-foreground border border-dashed">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium">Profesora Milagros</span>
                              <div className="flex space-x-1">
                                <div className="w-1 h-1 bg-success rounded-full animate-pulse"></div>
                                <div className="w-1 h-1 bg-success rounded-full animate-pulse" style={{animationDelay: '0.1s'}}></div>
                                <div className="w-1 h-1 bg-success rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                              </div>
                            </div>
                            <p className="text-sm italic">{currentAiMessage}</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Current transcript preview */}
                      {currentTranscript && (
                        <div className="flex items-start gap-3">
                          <div className="p-1 rounded-full bg-primary/10">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <div className="px-4 py-3 rounded-lg max-w-md bg-primary/10 text-primary border border-dashed border-primary/20">
                            <div className="text-xs font-medium mb-1">Vos (hablando...)</div>
                            <p className="text-sm italic">{currentTranscript}</p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Study rail: notebook + mistakes in one scannable card (sticky on wide screens) */}
          <aside className="xl:sticky xl:top-6 xl:self-start w-full max-h-none xl:max-h-[calc(100dvh-1.5rem)] xl:overflow-y-auto space-y-4">
            <Card className="border-border shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 sm:p-5 border-b border-success/20 bg-success/5">
                <div className="flex items-start gap-3">
                  <BookOpen className="w-6 h-6 text-success shrink-0 mt-0.5" />
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-foreground leading-tight">
                      Tu cuaderno
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      Vocabulario y notas que guarda la profesora durante la lección.
                    </p>
                  </div>
                </div>
              </div>
              <div className="min-h-[200px] max-h-[min(340px,45vh)] sm:max-h-[min(380px,50vh)] overflow-hidden flex flex-col border-b border-border/60">
                <Notebook
                  entries={notebookEntries}
                  onClear={clearNotebook}
                  embedded
                />
              </div>
              <MistakeJournal
                embedded
                refreshKey={isLessonCompleted ? 'done' : 'live'}
                limit={5}
              />
            </Card>
          </aside>
        </div>



        {/* Writing Exercise Modal */}
        {currentWritingExercise && (
          <WritingExercise
            isActive={isWritingExerciseActive}
            prompt={currentWritingExercise.prompt}
            expectedAnswer={currentWritingExercise.expectedAnswer}
            hints={currentWritingExercise.hints}
            exerciseType={currentWritingExercise.type}
            onSubmit={handleWritingExerciseSubmit}
            onClose={handleWritingExerciseClose}
            timeoutSeconds={90} // 1.5 minutes for writing exercises
          />
        )}

        {/* Pronunciation Drill Modal */}
        <PronunciationDrillModal
          isActive={pronunciationDrill !== null}
          drill={pronunciationDrill}
          onClose={() => setPronunciationDrill(null)}
        />

        {/* Listening Comprehension Modal */}
        <ListeningExerciseModal
          isActive={listeningExercise !== null}
          exercise={listeningExercise}
          onClose={() => setListeningExercise(null)}
        />

        {/* Reading Passage Modal */}
        <ReadingPassageModal
          isActive={readingPassage !== null}
          passage={readingPassage}
          onClose={() => setReadingPassage(null)}
        />

        {/* Fluency Sprint Modal */}
        <FluencySprintModal
          isActive={fluencySprint !== null}
          sprint={fluencySprint}
          onClose={() => setFluencySprint(null)}
        />
      </div>
    </div>
  );
}
