'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/app/providers';
import { createClient } from '@/lib/supabase/client';

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
        <div className="text-lg">Loading homework...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            📝 Spanish Homework
          </h1>
          <p className="text-xl text-gray-600">
            Complete your assignments and receive personalized feedback from Profesora Elena
          </p>
        </div>

        <div className="flex space-x-2 mb-8 bg-gray-100 p-2 rounded-xl max-w-md mx-auto">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 px-6 py-3 text-sm font-semibold rounded-lg transition-all duration-200 ${
              activeTab === 'pending'
                ? 'bg-white text-blue-600 shadow-md transform scale-105'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            📋 Pending ({pendingHomework.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`flex-1 px-6 py-3 text-sm font-semibold rounded-lg transition-all duration-200 ${
              activeTab === 'completed'
                ? 'bg-white text-green-600 shadow-md transform scale-105'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            ✅ Completed ({completedSubmissions.length})
          </button>
        </div>

        <main className="space-y-8">

      {activeTab === 'pending' && (
        <div className="space-y-6">
          {pendingHomework.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <div className="text-lg text-gray-600">No pending homework</div>
              <div className="text-sm text-gray-500 mt-2">
                Complete a lesson to receive your next assignment!
              </div>
            </div>
          ) : (
            <>
              {/* Homework Selection */}
              <div className="grid gap-4">
                {pendingHomework.map((hw) => {
                  const isOverdue = new Date(hw.due_at) < new Date();
                  return (
                    <div
                      key={hw.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedHomework?.id === hw.id
                          ? 'border-blue-500 bg-blue-50'
                          : isOverdue
                          ? 'border-red-300 bg-red-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedHomework(hw)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${hw.type === 'writing' ? 'bg-green-100' : 'bg-purple-100'}`}>
                            {hw.type === 'writing' ? '✍️' : '🎤'}
                          </div>
                          <div>
                            <div className="font-medium capitalize">{hw.type} Assignment</div>
                            <div className="text-sm text-gray-600">
                              Due: {new Date(hw.due_at).toLocaleDateString()}
                              {isOverdue && <span className="text-red-600 font-medium ml-2">OVERDUE</span>}
                            </div>
                          </div>
                        </div>
                        {selectedHomework?.id === hw.id && (
                          <div className="text-blue-600 font-medium">Selected</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Assignment Details */}
              {selectedHomework && (
                <div className="bg-white border rounded-lg p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-full ${selectedHomework.type === 'writing' ? 'bg-green-100' : 'bg-purple-100'}`}>
                      {selectedHomework.type === 'writing' ? '✍️' : '🎤'}
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold capitalize">{selectedHomework.type} Assignment</h2>
                      <div className="text-gray-600">
                        Due: {new Date(selectedHomework.due_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium mb-2">Instructions:</h3>
                    <p className="text-gray-700">{selectedHomework.prompt}</p>
                  </div>

                  {/* Writing Interface */}
                  {selectedHomework.type === 'writing' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block font-medium mb-2">Your Response:</label>
                        <textarea
                          value={textContent}
                          onChange={(e) => setTextContent(e.target.value)}
                          className="w-full h-64 p-4 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Write your response here..."
                        />
                        <div className="text-sm text-gray-500 mt-1">
                          Words: {textContent.trim().split(/\s+/).filter(word => word.length > 0).length}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Speaking Interface */}
                  {selectedHomework.type === 'speaking' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block font-medium mb-2">Audio Recording:</label>
                        <div className="flex items-center gap-4">
                          {!isRecording ? (
                            <button
                              onClick={startRecording}
                              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                            >
                              🎤 Start Recording
                            </button>
                          ) : (
                            <button
                              onClick={stopRecording}
                              className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                            >
                              ⏹️ Stop Recording
                            </button>
                          )}
                          {isRecording && (
                            <div className="flex items-center gap-2 text-red-600">
                              <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                              Recording...
                            </div>
                          )}
                        </div>
                        {audioUrl && (
                          <div className="mt-4">
                            <audio controls src={audioUrl} className="w-full" />
                            <div className="text-sm text-gray-600 mt-2">
                              Recording ready for submission
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="pt-4 border-t">
                    <button
                      onClick={submitHomework}
                      disabled={isSubmitting || 
                        (selectedHomework.type === 'writing' && !textContent.trim()) ||
                        (selectedHomework.type === 'speaking' && !audioUrl)
                      }
                      className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Homework'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'completed' && (
        <div className="space-y-4">
          {completedSubmissions.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <div className="text-lg text-gray-600">No completed assignments</div>
              <div className="text-sm text-gray-500 mt-2">
                Submit homework to see your results here
              </div>
            </div>
          ) : (
            completedSubmissions.map((submission) => {
              const hw = homework.find(h => h.id === submission.homework_id);
              if (!hw) return null;

              return (
                <div key={submission.id} className="bg-white border rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${hw.type === 'writing' ? 'bg-green-100' : 'bg-purple-100'}`}>
                        {hw.type === 'writing' ? '✍️' : '🎤'}
                      </div>
                      <div>
                        <div className="font-medium capitalize">{hw.type} Assignment</div>
                        <div className="text-sm text-gray-600">
                          Submitted: {new Date(submission.submitted_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {submission.score !== null ? (
                        <div className="text-lg font-semibold text-blue-600">
                          {submission.score}/100
                        </div>
                      ) : (
                        <div className="text-yellow-600 font-medium">Pending Grade</div>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <h4 className="font-medium mb-2">Assignment:</h4>
                    <p className="text-gray-700 text-sm">{hw.prompt}</p>
                  </div>

                  {submission.text_content && (
                    <div className="mb-4">
                      <h4 className="font-medium mb-2">Your Response:</h4>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <p className="text-gray-700">{submission.text_content}</p>
                      </div>
                    </div>
                  )}

                  {submission.grade_json && (
                    <div className="border-t pt-4 space-y-4">
                      <h4 className="font-medium mb-3">Detailed Feedback:</h4>
                      
                      {/* Overall feedback */}
                      {submission.grade_json.detailed_feedback && (
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <h5 className="font-medium mb-2">Teacher Comments:</h5>
                          <p className="text-gray-700 whitespace-pre-wrap">{submission.grade_json.detailed_feedback}</p>
                        </div>
                      )}

                      {/* Criterion scores */}
                      {submission.grade_json.criterion_scores && (
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h5 className="font-medium mb-3">Detailed Scores:</h5>
                          <div className="space-y-3">
                            {submission.grade_json.criterion_scores.map((criterion: any, index: number) => (
                              <div key={index} className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="font-medium">{criterion.name}</div>
                                  <div className="text-sm text-gray-600">{criterion.feedback}</div>
                                </div>
                                <div className="ml-4 text-right">
                                  <div className="font-bold text-lg">{criterion.score}/5</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Corrections */}
                      {submission.grade_json.corrections && submission.grade_json.corrections.length > 0 && (
                        <div className="bg-red-50 p-4 rounded-lg">
                          <h5 className="font-medium mb-2 text-red-800">Corrections:</h5>
                          <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                            {submission.grade_json.corrections.map((correction: string, index: number) => (
                              <li key={index}>{correction}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Areas to focus on */}
                      {submission.grade_json.next_focus && submission.grade_json.next_focus.length > 0 && (
                        <div className="bg-yellow-50 p-4 rounded-lg">
                          <h5 className="font-medium mb-2 text-yellow-800">Areas for Improvement:</h5>
                          <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700">
                            {submission.grade_json.next_focus.map((focus: string, index: number) => (
                              <li key={index}>{focus}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* New vocabulary to study */}
                      {submission.grade_json.srs_add && submission.grade_json.srs_add.length > 0 && (
                        <div className="bg-green-50 p-4 rounded-lg">
                          <h5 className="font-medium mb-2 text-green-800">New Vocabulary to Practice:</h5>
                          <div className="flex flex-wrap gap-2">
                            {submission.grade_json.srs_add.map((word: string, index: number) => (
                              <span key={index} className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                                {word}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Pronunciation notes for speaking assignments */}
                      {submission.grade_json.pronunciation_notes && submission.grade_json.pronunciation_notes.length > 0 && (
                        <div className="bg-purple-50 p-4 rounded-lg">
                          <h5 className="font-medium mb-2 text-purple-800">Pronunciation Notes:</h5>
                          <ul className="list-disc list-inside space-y-1 text-sm text-purple-700">
                            {submission.grade_json.pronunciation_notes.map((note: string, index: number) => (
                              <li key={index}>{note}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
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
