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
  Volume2
} from 'lucide-react';

interface Homework {
  id: string;
  type: string;
  prompt: string;
  due_at: string;
  rubric_json: any;
  lesson_id: string | null;
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
  const [selectedHomework, setSelectedHomework] = useState<Homework | null>(null);
  const [textContent, setTextContent] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [loading, setLoading] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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

      setHomework(homeworkData || []);
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
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
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
  const submitHomework = async () => {
    if (!selectedHomework || !user) return;

    if (selectedHomework.type === 'writing' && !textContent.trim()) {
      alert('Please write your response before submitting.');
      return;
    }

    if (selectedHomework.type === 'speaking' && !audioUrl) {
      alert('Please record your response before submitting.');
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();

      // For speaking assignments, we'll just store a placeholder for audio_url
      // In a real implementation, you'd upload the audio to storage first
      const submissionData = {
        homework_id: selectedHomework.id,
        user_id: user.id,
        text_content: selectedHomework.type === 'writing' ? textContent : null,
        audio_url: selectedHomework.type === 'speaking' ? 'audio_placeholder' : null,
        transcript: selectedHomework.type === 'speaking' ? 'Transcript would be generated from audio' : null,
      };

      const { error } = await supabase
        .from('submissions')
        .insert(submissionData);

      if (error) {
        console.error('Error submitting homework:', error);
        alert('Failed to submit homework. Please try again.');
        return;
      }

      // Reset form
      setTextContent('');
      setAudioUrl(null);
      setSelectedHomework(null);
      
      // Trigger automatic grading
      try {
        const gradeResponse = await fetch('/api/auto-grade', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (gradeResponse.ok) {
          console.log('Auto-grading triggered successfully');
        }
      } catch (gradeError) {
        console.warn('Auto-grading failed, but submission was successful:', gradeError);
      }
      
      // Reload data
      await loadData();
      
      alert('Homework submitted successfully! 🎉\n\nYour work is being graded automatically. Check back in a moment for your results.');
      
    } catch (error) {
      console.error('Error submitting homework:', error);
      alert('Failed to submit homework. Please try again.');
    } finally {
      setIsSubmitting(false);
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
        <div className="space-y-6">
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
            <>
              {/* Homework Selection */}
              <div className="grid gap-4">
                {pendingHomework.map((hw) => {
                  const isOverdue = new Date(hw.due_at) < new Date();
                  return (
                    <Card
                      key={hw.id}
                      className={`cursor-pointer transition-all duration-200 ${
                        selectedHomework?.id === hw.id
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                          : isOverdue
                          ? 'border-destructive/50 bg-destructive/5'
                          : 'hover:border-primary/30'
                      }`}
                      onClick={() => setSelectedHomework(hw)}
                    >
                      <CardContent className="p-4">
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
                              <div className="font-medium">
                                Tarea de {hw.type === 'writing' ? 'Escritura' : 'Expresión Oral'}
                                <div className="text-xs text-muted-foreground capitalize">
                                  {hw.type} Assignment
                                </div>
                              </div>
                              <div className="text-sm text-muted-foreground flex items-center gap-2">
                                <Calendar className="h-3 w-3" />
                                Vence: {new Date(hw.due_at).toLocaleDateString()}
                                {isOverdue && (
                                  <Badge variant="destructive" className="text-xs">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    VENCIDA
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          {selectedHomework?.id === hw.id && (
                            <Badge variant="default" className="bg-primary">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Seleccionada
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Assignment Details */}
              {selectedHomework && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-lg ${
                        selectedHomework.type === 'writing' 
                          ? 'bg-success/10 text-success' 
                          : 'bg-purple-500/10 text-purple-600'
                      }`}>
                        {selectedHomework.type === 'writing' ? <PenTool className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                      </div>
                      <div>
                        <CardTitle className="text-xl">
                          Tarea de {selectedHomework.type === 'writing' ? 'Escritura' : 'Expresión Oral'}
                          <div className="text-sm font-normal text-muted-foreground capitalize">
                            {selectedHomework.type} Assignment
                          </div>
                        </CardTitle>
                        <div className="text-muted-foreground flex items-center gap-2 mt-1">
                          <Calendar className="h-4 w-4" />
                          Vence: {new Date(selectedHomework.due_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-6">
                    <Card className="bg-muted/30">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <h3 className="font-medium">
                            Instrucciones:
                            <span className="text-sm font-normal text-muted-foreground ml-2">Instructions</span>
                          </h3>
                        </div>
                        <p className="text-foreground">{selectedHomework.prompt}</p>
                      </CardContent>
                    </Card>

                    {/* Writing Interface */}
                    {selectedHomework.type === 'writing' && (
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
                    {selectedHomework.type === 'speaking' && (
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
                                <audio controls src={audioUrl} className="w-full" />
                              </CardContent>
                            </Card>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Submit Button */}
                    <div className="pt-4 border-t">
                      <Button
                        onClick={submitHomework}
                        disabled={isSubmitting || 
                          (selectedHomework.type === 'writing' && !textContent.trim()) ||
                          (selectedHomework.type === 'speaking' && !audioUrl)
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
                </Card>
              )}
            </>
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
