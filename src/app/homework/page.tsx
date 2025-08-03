'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/app/providers';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  ClipboardList, 
  CheckCircle, 
  PenTool, 
  Mic, 
  Calendar, 
  Clock, 
  AlertTriangle,
  Play,
  Square,
  Send,
  Loader2,
  FileText,
  MessageSquare,
  Target,
  BookOpen,
  Lightbulb,
  TrendingUp,
  Volume2,
  ArrowRight
} from 'lucide-react';

interface Homework {
  id: string;
  type: string;
  prompt: string;
  due_at: string;
  rubric_json: any;
  lesson_id: string | null;
  lesson?: {
    id: string;
    title: string;
    cefr: string;
    unit: number;
    lesson: number;
  };
}

interface Submission {
  id: string;
  homework_id: string;
  text_content: string | null;
  audio_url: string | null;
  transcript: string | null;
  submitted_at: string;
  graded_at: string | null;
  grade_json: any | null;
  teacher_feedback: string | null;
  score: number | null;
}

export default function HomeworkPage() {
  const { user } = useAuth();
  const [homework, setHomework] = useState<Homework[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [expandedHomework, setExpandedHomework] = useState<string | null>(null);
  const [textContent, setTextContent] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [loading, setLoading] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Cleanup function for audio URLs
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Load homework and submissions
  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      const supabase = createClient();
      
      // Load pending homework
      const { data: homeworkData } = await supabase
        .from('homework')
        .select('*')
        .eq('user_id', user.id)
        .order('due_at', { ascending: true });

      // Load submissions
      const { data: submissionsData } = await supabase
        .from('submissions')
        .select('*')
        .eq('user_id', user.id)
        .order('submitted_at', { ascending: false });

      // Fetch lesson information for each homework
      if (homeworkData && homeworkData.length > 0) {
        const lessonIds = [...new Set(homeworkData.map(hw => hw.lesson_id).filter(Boolean))];
        
        if (lessonIds.length > 0) {
          const { data: lessonsData } = await supabase
            .from('lessons')
            .select('id, title, cefr, content_refs')
            .in('id', lessonIds);

          // Enhance homework with lesson data
          const enhancedHomework = homeworkData.map(hw => {
            const lesson = lessonsData?.find(l => l.id === hw.lesson_id);
            if (lesson) {
              let content_refs;
              try {
                content_refs = typeof lesson.content_refs === 'string' 
                  ? JSON.parse(lesson.content_refs) 
                  : lesson.content_refs || {};
              } catch {
                content_refs = {};
              }
              
              return {
                ...hw,
                lesson: {
                  id: lesson.id,
                  title: lesson.title,
                  cefr: lesson.cefr,
                  unit: content_refs.unit || 1,
                  lesson: content_refs.lesson || 1
                }
              };
            }
            return hw;
          });
          
          setHomework(enhancedHomework);
        } else {
          setHomework(homeworkData || []);
        }
      } else {
        setHomework([]);
      }

      setSubmissions(submissionsData || []);
    } catch (error) {
      console.error('Error loading homework:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter homework that hasn't been submitted yet
  const pendingHomework = homework.filter(hw => 
    !submissions.some(sub => sub.homework_id === hw.id)
  );

  // Filter completed submissions
  const completedSubmissions = submissions.filter(sub => 
    homework.some(hw => hw.id === sub.homework_id)
  );

  // Audio recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Determine the best supported MIME type for the browser
      let options: MediaRecorderOptions = {};
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4;codecs=mp4a.40.2',
        'audio/mp4',
        'audio/wav',
        'audio/ogg;codecs=opus'
      ];
      
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          options.mimeType = mimeType;
          break;
        }
      }
      
      // Debug logging for Safari compatibility
      console.log('Starting recording with:', {
        selectedMimeType: options.mimeType,
        supportedTypes: mimeTypes.filter(type => MediaRecorder.isTypeSupported(type)),
        userAgent: navigator.userAgent
      });
      
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        // Use the actual MIME type that was used for recording
        const mimeType = options.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(audioBlob);
        
        // Debug logging for Safari compatibility
        console.log('Recording stopped:', {
          mimeType,
          blobSize: audioBlob.size,
          chunks: audioChunksRef.current.length,
          url,
          userAgent: navigator.userAgent
        });
        
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Unable to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Submit homework
  const submitHomework = async (homeworkId: string) => {
    const homeworkToSubmit = homework.find(hw => hw.id === homeworkId);
    if (!homeworkToSubmit || !user) return;

    if (homeworkToSubmit.type === 'writing' && !textContent.trim()) {
      alert('Please write your response before submitting.');
      return;
    }

    if (homeworkToSubmit.type === 'speaking' && !audioUrl) {
      alert('Please record your response before submitting.');
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();
      let submissionData;

      if (homeworkToSubmit.type === 'speaking' && audioUrl) {
        // Process speaking assignment with audio transcription
        try {
          // Convert blob URL to File
          const response = await fetch(audioUrl);
          const audioBlob = await response.blob();
          const audioFile = new File([audioBlob], 'recording.webm', { type: audioBlob.type });

          console.log('Transcribing audio...', {
            fileSize: audioFile.size,
            fileType: audioFile.type
          });

          // Call speech-to-text API
          const formData = new FormData();
          formData.append('audio', audioFile);

          const transcriptResponse = await fetch('/api/speech-to-text', {
            method: 'POST',
            body: formData,
          });

          if (!transcriptResponse.ok) {
            throw new Error('Speech-to-text failed');
          }

          const { transcript } = await transcriptResponse.json();
          console.log('Transcription successful:', transcript);

          submissionData = {
            homework_id: homeworkToSubmit.id,
            user_id: user.id,
            text_content: null,
            audio_url: 'audio_uploaded', // In production, would be actual storage URL
            transcript: transcript,
          };
        } catch (transcriptionError) {
          console.error('Transcription failed:', transcriptionError);
          alert('Failed to process audio. Please try recording again.');
          return;
        }
      } else {
        // Writing assignment
        submissionData = {
          homework_id: homeworkToSubmit.id,
          user_id: user.id,
          text_content: textContent,
          audio_url: null,
          transcript: null,
        };
      }

      const { error } = await supabase
        .from('submissions')
        .insert(submissionData);

      if (error) {
        console.error('Error submitting homework:', error);
        alert('Failed to submit homework. Please try again.');
        return;
      }

      // Show immediate success feedback
      const message = homeworkToSubmit.type === 'speaking' 
        ? 'Speaking assignment submitted successfully! 🎉\n\n' +
          'Your audio has been transcribed and is being graded automatically. ' +
          'Check back in a moment for your results and pronunciation feedback.'
        : 'Homework submitted successfully! 🎉\n\n' +
          'Your work is being graded automatically. Check back in a moment for your results.';
      
      alert(message);

      // Reset form
      setTextContent('');
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      setAudioUrl(null);
      setExpandedHomework(null);
      
      // Trigger automatic grading and data reload in background (non-blocking)
      Promise.all([
        fetch('/api/auto-grade', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        }).then(response => {
          if (response.ok) {
            console.log('Auto-grading triggered successfully');
          } else {
            console.warn('Auto-grading request failed, but submission was successful');
          }
        }).catch(gradeError => {
          console.warn('Auto-grading failed, but submission was successful:', gradeError);
        }),
        
        loadData().catch(loadError => {
          console.warn('Data reload failed:', loadError);
        })
      ]);
      
    } catch (error) {
      console.error('Error submitting homework:', error);
      alert('Failed to submit homework. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle homework expansion
  const toggleHomeworkExpansion = (homeworkId: string) => {
    if (expandedHomework === homeworkId) {
      setExpandedHomework(null);
      setTextContent('');
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      setAudioUrl(null);
    } else {
      setExpandedHomework(homeworkId);
      setTextContent('');
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      setAudioUrl(null);
    }
  };

  // Get CEFR level color styling
  const getCefrColor = (cefr: string) => {
    switch (cefr) {
      case 'A1': return 'bg-success/10 text-success border-success/20';
      case 'A2': return 'bg-warning/10 text-warning border-warning/20';
      case 'B1': return 'bg-primary/10 text-primary border-primary/20';
      case 'B2': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'C1': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'C2': return 'bg-red-500/10 text-red-600 border-red-500/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary mr-3" />
        <div className="text-muted-foreground">
          Cargando tareas...
          <span className="text-xs block">Loading homework</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto container-padding py-8">
        <Card className="mb-8 bg-primary/5 border-primary/20">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="p-3 bg-primary/10 rounded-lg">
                <ClipboardList className="h-8 w-8 text-primary" />
              </div>
              <div>
                <CardTitle className="text-3xl text-primary">
                  Tareas de Español
                  <div className="text-lg font-normal text-muted-foreground">Spanish Homework</div>
                </CardTitle>
              </div>
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Completa tus tareas y recibe comentarios personalizados de Profesora Elena
              <span className="text-xs block">Complete your assignments and receive personalized feedback from Profesora Elena</span>
            </p>
          </CardHeader>
        </Card>

        <Card className="mb-8">
          <CardContent className="p-2">
            <div className="flex space-x-2">
              <Button
                onClick={() => setActiveTab('pending')}
                variant={activeTab === 'pending' ? 'default' : 'ghost'}
                className={`flex-1 h-12 ${
                  activeTab === 'pending'
                    ? 'bg-warning text-warning-foreground shadow-md'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <ClipboardList className="h-4 w-4 mr-2" />
                Pendientes ({pendingHomework.length})
                <span className="text-xs block">Pending</span>
              </Button>
              <Button
                onClick={() => setActiveTab('completed')}
                variant={activeTab === 'completed' ? 'default' : 'ghost'}
                className={`flex-1 h-12 ${
                  activeTab === 'completed'
                    ? 'bg-success text-success-foreground shadow-md'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Completadas ({completedSubmissions.length})
                <span className="text-xs block">Completed</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        <main className="space-y-8">

      {activeTab === 'pending' && (
        <div className="space-y-4">
          {pendingHomework.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <div className="text-lg text-foreground mb-2">
                  No hay tareas pendientes
                  <div className="text-sm text-muted-foreground">No pending homework</div>
                </div>
                <p className="text-muted-foreground">
                  ¡Completa una lección para recibir tu próxima tarea!
                  <span className="text-xs block">Complete a lesson to receive your next assignment!</span>
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingHomework.map((hw) => {
                const isOverdue = new Date(hw.due_at) < new Date();
                const isExpanded = expandedHomework === hw.id;
                
                return (
                  <Card
                    key={hw.id}
                    className={`transition-all duration-200 ${
                      isExpanded
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                        : isOverdue
                        ? 'border-destructive/50 bg-destructive/5 hover:border-destructive/70'
                        : 'hover:border-primary/30'
                    }`}
                  >
                    {/* Homework Header - Always Visible */}
                    <CardContent 
                      className="p-4 cursor-pointer"
                      onClick={() => toggleHomeworkExpansion(hw.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${
                            hw.type === 'writing' 
                              ? 'bg-success/10 text-success' 
                              : 'bg-purple-500/10 text-purple-600'
                          }`}>
                            {hw.type === 'writing' ? <PenTool className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            {/* Lesson Information */}
                            {hw.lesson && (
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="secondary" className={getCefrColor(hw.lesson.cefr)}>
                                  {hw.lesson.cefr}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  Unidad {hw.lesson.unit}.{hw.lesson.lesson}
                                </Badge>
                                <span className="text-sm font-medium text-foreground truncate">
                                  {hw.lesson.title}
                                </span>
                              </div>
                            )}
                            
                            {/* Assignment Type and Due Date */}
                            <div className="flex items-center gap-4">
                              <div className="font-medium text-foreground">
                                Tarea de {hw.type === 'writing' ? 'Escritura' : 'Expresión Oral'}
                                <div className="text-xs text-muted-foreground capitalize">
                                  {hw.type} Assignment
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                <span>Vence: {new Date(hw.due_at).toLocaleDateString()}</span>
                                {isOverdue && (
                                  <Badge variant="destructive" className="text-xs">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    VENCIDA
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {isExpanded && (
                            <Badge variant="default" className="bg-primary text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Abierta
                            </Badge>
                          )}
                          <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      </div>
                    </CardContent>

                    {/* Expandable Content */}
                    {isExpanded && (
                      <div className="border-t border-border">
                        <CardContent className="p-6 space-y-6">
                          {/* Instructions */}
                          <Card className="bg-muted/30">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <FileText className="h-4 w-4 text-primary" />
                                <h3 className="font-medium">
                                  Instrucciones:
                                  <span className="text-sm font-normal text-muted-foreground ml-2">Instructions</span>
                                </h3>
                              </div>
                              <p className="text-foreground leading-relaxed">{hw.prompt}</p>
                            </CardContent>
                          </Card>

                          {/* Writing Interface */}
                          {hw.type === 'writing' && (
                            <Card>
                              <CardContent className="p-4 space-y-4">
                                <div className="flex items-center gap-2">
                                  <PenTool className="h-4 w-4 text-success" />
                                  <Label className="font-medium">
                                    Tu Respuesta:
                                    <span className="text-sm font-normal text-muted-foreground ml-2">Your Response</span>
                                  </Label>
                                </div>
                                <Textarea
                                  value={textContent}
                                  onChange={(e) => setTextContent(e.target.value)}
                                  className="min-h-64 resize-none"
                                  placeholder="Escribe tu respuesta aquí... / Write your response here..."
                                />
                                <div className="flex items-center justify-between text-sm text-muted-foreground">
                                  <div className="flex items-center gap-2">
                                    <MessageSquare className="h-3 w-3" />
                                    Palabras: {textContent.trim().split(/\s+/).filter(word => word.length > 0).length}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}

                          {/* Speaking Interface */}
                          {hw.type === 'speaking' && (
                            <Card>
                              <CardContent className="p-4 space-y-4">
                                <div className="flex items-center gap-2">
                                  <Mic className="h-4 w-4 text-purple-600" />
                                  <Label className="font-medium">
                                    Grabación de Audio:
                                    <span className="text-sm font-normal text-muted-foreground ml-2">Audio Recording</span>
                                  </Label>
                                </div>
                                <div className="flex items-center gap-4">
                                  {!isRecording ? (
                                    <Button
                                      onClick={startRecording}
                                      className="bg-destructive hover:bg-destructive/90"
                                    >
                                      <Mic className="h-4 w-4 mr-2" />
                                      Empezar Grabación
                                    </Button>
                                  ) : (
                                    <Button
                                      onClick={stopRecording}
                                      variant="secondary"
                                    >
                                      <Square className="h-4 w-4 mr-2" />
                                      Parar Grabación
                                    </Button>
                                  )}
                                  {isRecording && (
                                    <div className="flex items-center gap-2 text-destructive">
                                      <div className="w-3 h-3 bg-destructive rounded-full animate-pulse"></div>
                                      <span className="text-sm font-medium">
                                        Grabando...
                                        <span className="text-xs block text-muted-foreground">Recording</span>
                                      </span>
                                    </div>
                                  )}
                                </div>
                                {audioUrl && (
                                  <Card className="bg-success/5 border-success/20">
                                    <CardContent className="p-4">
                                      <div className="flex items-center gap-2 mb-2">
                                        <Volume2 className="h-4 w-4 text-success" />
                                        <span className="text-sm font-medium text-success">
                                          Grabación Lista
                                          <span className="text-xs block text-muted-foreground">Recording Ready</span>
                                        </span>
                                      </div>
                                      <audio 
                                        controls 
                                        src={audioUrl}
                                        className="w-full"
                                        preload="auto"
                                        onError={(e) => {
                                          console.error('Audio playback error:', e);
                                          console.log('Audio element details:', {
                                            src: audioUrl,
                                            error: e.currentTarget.error
                                          });
                                        }}
                                        onLoadStart={() => console.log('Audio load started')}
                                        onCanPlay={() => console.log('Audio can play')}
                                        onLoadedData={() => console.log('Audio data loaded')}
                                      />
                                    </CardContent>
                                  </Card>
                                )}
                              </CardContent>
                            </Card>
                          )}

                          {/* Submit Button */}
                          <div className="pt-4 border-t">
                            <Button
                              onClick={() => submitHomework(hw.id)}
                              disabled={isSubmitting || 
                                (hw.type === 'writing' && !textContent.trim()) ||
                                (hw.type === 'speaking' && !audioUrl)
                              }
                              className="w-full h-12 btn-primary"
                            >
                              {isSubmitting ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Enviando...
                                </>
                              ) : (
                                <>
                                  <Send className="h-4 w-4 mr-2" />
                                  Enviar Tarea
                                </>
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'completed' && (
        <div className="space-y-4">
          {completedSubmissions.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <div className="text-lg text-foreground mb-2">
                  No hay tareas completadas
                  <div className="text-sm text-muted-foreground">No completed assignments</div>
                </div>
                <p className="text-muted-foreground">
                  Envía tareas para ver tus resultados aquí
                  <span className="text-xs block">Submit homework to see your results here</span>
                </p>
              </CardContent>
            </Card>
          ) : (
            completedSubmissions.map((submission) => {
              const hw = homework.find(h => h.id === submission.homework_id);
              if (!hw) return null;

              return (
                <Card key={submission.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          hw.type === 'writing' 
                            ? 'bg-success/10 text-success' 
                            : 'bg-purple-500/10 text-purple-600'
                        }`}>
                          {hw.type === 'writing' ? <PenTool className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                        </div>
                        <div>
                          {/* Lesson Information */}
                          {hw.lesson && (
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="secondary" className={getCefrColor(hw.lesson.cefr)}>
                                {hw.lesson.cefr}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                Unidad {hw.lesson.unit}.{hw.lesson.lesson}
                              </Badge>
                              <span className="text-sm font-medium text-foreground">
                                {hw.lesson.title}
                              </span>
                            </div>
                          )}
                          <div className="font-medium">
                            Tarea de {hw.type === 'writing' ? 'Escritura' : 'Expresión Oral'}
                            <div className="text-xs text-muted-foreground capitalize">
                              {hw.type} Assignment
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            Enviada: {new Date(submission.submitted_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        {submission.score !== null ? (
                          <Badge variant="default" className="text-lg px-3 py-1">
                            <TrendingUp className="h-4 w-4 mr-1" />
                            {submission.score}/100
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-warning/10 text-warning">
                            <Clock className="h-3 w-3 mr-1" />
                            Calificando...
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">

                    <Card className="bg-muted/30">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Target className="h-4 w-4 text-primary" />
                          <h4 className="font-medium">
                            Tarea:
                            <span className="text-sm font-normal text-muted-foreground ml-2">Assignment</span>
                          </h4>
                        </div>
                        <p className="text-foreground text-sm">{hw.prompt}</p>
                      </CardContent>
                    </Card>

                    {submission.text_content && (
                      <Card className="bg-primary/5 border-primary/20">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <MessageSquare className="h-4 w-4 text-primary" />
                            <h4 className="font-medium">
                              Tu Respuesta:
                              <span className="text-sm font-normal text-muted-foreground ml-2">Your Response</span>
                            </h4>
                          </div>
                          <p className="text-foreground">{submission.text_content}</p>
                        </CardContent>
                      </Card>
                    )}

                    {submission.grade_json && (
                      <div className="space-y-4 pt-4 border-t">
                        <div className="flex items-center gap-2">
                          <Lightbulb className="h-5 w-5 text-primary" />
                          <h4 className="font-medium text-lg">
                            Retroalimentación Detallada:
                            <span className="text-sm font-normal text-muted-foreground ml-2">Detailed Feedback</span>
                          </h4>
                        </div>
                      
                        {/* Overall feedback */}
                        {submission.grade_json.detailed_feedback && (
                          <Card className="bg-primary/5 border-primary/20">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <MessageSquare className="h-4 w-4 text-primary" />
                                <h5 className="font-medium">
                                  Comentarios de la Profesora:
                                  <span className="text-sm font-normal text-muted-foreground ml-2">Teacher Comments</span>
                                </h5>
                              </div>
                              <p className="text-foreground whitespace-pre-wrap">{submission.grade_json.detailed_feedback}</p>
                            </CardContent>
                          </Card>
                        )}

                        {/* Criterion scores */}
                        {submission.grade_json.criterion_scores && (
                          <Card className="bg-muted/30">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <TrendingUp className="h-4 w-4 text-primary" />
                                <h5 className="font-medium">
                                  Puntuaciones Detalladas:
                                  <span className="text-sm font-normal text-muted-foreground ml-2">Detailed Scores</span>
                                </h5>
                              </div>
                              <div className="space-y-3">
                                {submission.grade_json.criterion_scores.map((criterion: any, index: number) => (
                                  <div key={index} className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <div className="font-medium">{criterion.name}</div>
                                      <div className="text-sm text-muted-foreground">{criterion.feedback}</div>
                                    </div>
                                    <Badge variant="outline" className="ml-4">
                                      {criterion.score}/5
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Corrections */}
                        {submission.grade_json.corrections && submission.grade_json.corrections.length > 0 && (
                          <Card className="bg-destructive/5 border-destructive/20">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle className="h-4 w-4 text-destructive" />
                                <h5 className="font-medium text-destructive">
                                  Correcciones:
                                  <span className="text-sm font-normal text-muted-foreground ml-2">Corrections</span>
                                </h5>
                              </div>
                              <ul className="list-disc list-inside space-y-1 text-sm text-destructive/80">
                                {submission.grade_json.corrections.map((correction: string, index: number) => (
                                  <li key={index}>{correction}</li>
                                ))}
                              </ul>
                            </CardContent>
                          </Card>
                        )}

                        {/* Areas to focus on */}
                        {submission.grade_json.next_focus && submission.grade_json.next_focus.length > 0 && (
                          <Card className="bg-warning/5 border-warning/20">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <Target className="h-4 w-4 text-warning" />
                                <h5 className="font-medium text-warning">
                                  Áreas de Mejora:
                                  <span className="text-sm font-normal text-muted-foreground ml-2">Areas for Improvement</span>
                                </h5>
                              </div>
                              <ul className="list-disc list-inside space-y-1 text-sm text-warning/80">
                                {submission.grade_json.next_focus.map((focus: string, index: number) => (
                                  <li key={index}>{focus}</li>
                                ))}
                              </ul>
                            </CardContent>
                          </Card>
                        )}

                        {/* New vocabulary to study */}
                        {submission.grade_json.srs_add && submission.grade_json.srs_add.length > 0 && (
                          <Card className="bg-success/5 border-success/20">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <BookOpen className="h-4 w-4 text-success" />
                                <h5 className="font-medium text-success">
                                  Nuevo Vocabulario para Practicar:
                                  <span className="text-sm font-normal text-muted-foreground ml-2">New Vocabulary to Practice</span>
                                </h5>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {submission.grade_json.srs_add.map((word: string, index: number) => (
                                  <Badge key={index} variant="secondary" className="bg-success/10 text-success border-success/20">
                                    {word}
                                  </Badge>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Pronunciation notes for speaking assignments */}
                        {submission.grade_json.pronunciation_notes && submission.grade_json.pronunciation_notes.length > 0 && (
                          <Card className="bg-purple-500/5 border-purple-500/20">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <Volume2 className="h-4 w-4 text-purple-600" />
                                <h5 className="font-medium text-purple-600">
                                  Notas de Pronunciación:
                                  <span className="text-sm font-normal text-muted-foreground ml-2">Pronunciation Notes</span>
                                </h5>
                              </div>
                              <ul className="list-disc list-inside space-y-1 text-sm text-purple-600/80">
                                {submission.grade_json.pronunciation_notes.map((note: string, index: number) => (
                                  <li key={index}>{note}</li>
                                ))}
                              </ul>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}
        </main>
      </div>
    </div>
  );
}
