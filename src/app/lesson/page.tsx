'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import Notebook, { categorizeNote } from '@/components/Notebook';
import VoiceHUD from '@/components/VoiceHUD';
import { useAuth } from '../providers';

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

export default function LessonPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [currentAiMessage, setCurrentAiMessage] = useState('');
  const [notebookEntries, setNotebookEntries] = useState<NotebookEntry[]>([]);
  const [lessonStartTime] = useState(Date.now());
  const [isLessonCompleted, setIsLessonCompleted] = useState(false);
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);
  const [currentLessonData, setCurrentLessonData] = useState<any | null>(null);
  const [lessonProgress, setLessonProgress] = useState<{lessonNumber: number, totalLessons: number, progressPercent: number} | null>(null);
  const [checkingCompletion, setCheckingCompletion] = useState(true);

  // Check for custom lesson selection on page load
  useEffect(() => {
    const selectedLessonId = localStorage.getItem('selectedLessonId');
    if (selectedLessonId) {
      setCurrentLessonId(selectedLessonId);
      localStorage.removeItem('selectedLessonId'); // Clear after using
      console.log('Using custom selected lesson:', selectedLessonId);
    }
  }, []);

  // Handle voice messages from the AI
  const handleMessageReceived = useCallback((message: any) => {
    console.log('Lesson received message:', message);
    
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

  // Handle transcript updates
  const handleTranscriptReceived = useCallback((transcript: string, isUser: boolean, isStreaming?: boolean) => {
    if (!transcript.trim()) return;
    
    if (isUser) {
      // User transcripts are always complete messages
      const newMessage: Message = {
        id: Date.now().toString(),
        timestamp: new Date(),
        type: 'user',
        content: transcript.trim()
      };
      setMessages(prev => [...prev, newMessage]);
      setCurrentTranscript(transcript);
    } else {
      // AI transcripts
      if (isStreaming) {
        // This is a streaming chunk - accumulate it for display but don't add to history
        setCurrentAiMessage(prev => prev + transcript);
      } else {
        // This is a complete AI message - add to conversation history
        if (transcript.trim()) {
          const newMessage: Message = {
            id: Date.now().toString(),
            timestamp: new Date(),
            type: 'ai',
            content: transcript.trim()
          };
          setMessages(prev => [...prev, newMessage]);
          
          // Check if AI is ending the lesson
          checkForLessonCompletion(transcript.trim());
        }
        // Reset the accumulator
        setCurrentAiMessage('');
      }
    }
  }, []);

  // Handle adding entries to the notebook from AI
  const handleNotebookEntry = useCallback((text: string) => {
    const trimmedText = text.trim();
    console.log('Lesson: Attempting to add notebook entry:', trimmedText);
    
    // Check for duplicates (case-insensitive)
    const isDuplicate = notebookEntries.some(entry => 
      entry.text.toLowerCase() === trimmedText.toLowerCase()
    );
    
    if (isDuplicate) {
      console.log('Lesson: Skipping duplicate entry:', trimmedText);
      return;
    }
    
    const newEntry: NotebookEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      text: trimmedText,
      timestamp: new Date(),
      type: categorizeNote(trimmedText)
    };
    
    setNotebookEntries(prev => [...prev, newEntry]);
    console.log('Lesson: Added new notebook entry:', newEntry);
  }, [notebookEntries]);

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
      if (!user) return;

      try {
        setCheckingCompletion(true);
        
        // If we already have a custom lesson selected, use that instead of fetching recommended
        if (currentLessonId) {
          console.log('Using custom selected lesson:', currentLessonId);
          
          // Fetch the lesson data for the custom lesson
          try {
            const lessonResponse = await fetch(`/api/lessons?`);
            if (lessonResponse.ok) {
              const lessonData = await lessonResponse.json();
              const selectedLesson = lessonData.lessons.find((lesson: any) => lesson.id === currentLessonId);
              if (selectedLesson) {
                setCurrentLessonData(selectedLesson);
                console.log('Loaded custom lesson data:', selectedLesson.title);
              }
            }
          } catch (error) {
            console.error('Error fetching custom lesson data:', error);
          }
          
          // Check if this custom lesson is already completed
          const progressResponse = await fetch(`/api/user-progress?lesson_id=${currentLessonId}`);
          if (progressResponse.ok) {
            const progressData = await progressResponse.json();
            if (progressData.completed) {
              setIsLessonCompleted(true);
            }
          }
          setCheckingCompletion(false);
          return;
        }
        
        // Only fetch lesson-of-the-day if no custom lesson is selected
        const lessonResponse = await fetch('/api/lesson-of-day');
        if (!lessonResponse.ok) {
          setCheckingCompletion(false);
          return;
        }
        
        const lessonData = await lessonResponse.json();
        const lesson = lessonData.recommendedLesson?.lesson;
        const reason = lessonData.recommendedLesson?.reason;
        const lessonId = lesson?.id;
        
        if (!lesson || !lessonId) {
          setCheckingCompletion(false);
          return;
        }
        
        setCurrentLessonId(lessonId);
        setCurrentLessonData(lesson);
        
        // Extract progress information from the reason string
        // Format: "Lesson X of Y • Z% complete in LEVEL"
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
        
        // Check if this lesson is already completed
        const progressResponse = await fetch(`/api/user-progress?lesson_id=${lessonId}`);
        if (progressResponse.ok) {
          const progressData = await progressResponse.json();
          if (progressData.completed) {
            setIsLessonCompleted(true);
          }
        }
      } catch (error) {
        console.error('Error checking lesson completion:', error);
      } finally {
        setCheckingCompletion(false);
      }
    };

    checkLessonCompletion();
  }, [user, currentLessonId]);

  // Complete lesson and save progress
  const completeLessonNow = useCallback(async () => {
    if (isLessonCompleted || !user || !currentLessonId) {
      if (isLessonCompleted) {
        alert('This lesson has already been completed! 🎉\n\nGo back to the main menu to see your next lesson.');
      }
      return;
    }
    
    try {
      const durationMin = Math.round((Date.now() - lessonStartTime) / 60000);
      console.log('Completing lesson:', currentLessonId, 'Duration:', durationMin, 'minutes');
      
      // Call the complete lesson API
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
      
      setIsLessonCompleted(true);
      
      // Show completion message with homework assignment
      let completionMessage = `¡Excelente! Lesson completed successfully! 🎉\n\nProgress: ${result.levelProgression?.completionPercentage || 0}% of ${result.levelProgression?.currentLevel || 'A1'} level`;
      
      if (result.homeworkAssigned) {
        const homeworkType = result.homeworkAssigned.type === 'writing' ? 'Writing' : 'Speaking';
        const dueDate = new Date(result.homeworkAssigned.dueAt).toLocaleDateString();
        completionMessage += `\n\n📝 New ${homeworkType} Homework Assigned!\nDue: ${dueDate}\n\nCheck the Homework section to complete your assignment.`;
      }
      
      completionMessage += '\n\nGo back to the main menu to see your next lesson.';
      
      alert(completionMessage);
      
    } catch (error) {
      console.error('Error completing lesson:', error);
      alert('Error saving lesson progress. Please try again.');
    }
  }, [isLessonCompleted, user, lessonStartTime, currentLessonId]);

  // Check if AI is ending the lesson
  const checkForLessonCompletion = useCallback((aiMessage: string) => {
    const lowerMessage = aiMessage.toLowerCase();
    
    // Look for lesson ending phrases
    const endingPhrases = [
      'terminamos la lección',
      'ya terminamos',
      'nos vemos la próxima',
      'chau',
      'adiós',
      'hasta la vista',
      'lesson completed',
      'we\'re done',
      'that\'s all for today',
      'see you next time'
    ];
    
    const isEnding = endingPhrases.some(phrase => lowerMessage.includes(phrase));
    
    if (isEnding && !isLessonCompleted) {
      console.log('AI is ending the lesson, completing now...');
      setTimeout(() => {
        completeLessonNow();
      }, 2000); // Wait 2 seconds to let the AI finish speaking
    }
  }, [completeLessonNow, isLessonCompleted]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          {currentLessonData ? (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {currentLessonData.cefr}
                </span>
                <span className="bg-gray-100 text-gray-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  Unit {currentLessonData.unit}
                </span>
                <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded">
                  Lesson {currentLessonData.lesson}
                </span>
                <span className="text-xs text-neutral-600">
                  ~{currentLessonData.estimatedDuration} min
                </span>
              </div>
              
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {currentLessonData.title}
              </h1>
              
              {lessonProgress && (
                <div className="mb-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      Progress: {lessonProgress.lessonNumber} of {lessonProgress.totalLessons} lessons
                    </span>
                    <span className="text-gray-600 font-medium">
                      {lessonProgress.progressPercent}% complete
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${lessonProgress.progressPercent}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              <p className="text-gray-600">
                ¡Hola {user?.email?.split('@')[0] || 'che'}! Practice conversational Spanish with Profesora Elena.
              </p>
            </div>
          ) : (
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                Spanish Conversation with Profesora Elena
              </h1>
              <p className="text-gray-600">
                ¡Hola {user?.email?.split('@')[0] || 'che'}! Practice conversational Spanish with real-time voice interaction and vocabulary notes.
              </p>
            </div>
          )}
        </div>

        {/* Completion Status */}
        {checkingCompletion ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              <span className="text-blue-800">Checking lesson status...</span>
            </div>
          </div>
        ) : isLessonCompleted ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-green-600 text-xl">✅</span>
                <div>
                  <h3 className="font-semibold text-green-800">
                    {currentLessonData ? 
                      `Lesson ${currentLessonData.lesson} Already Completed!` : 
                      'Lesson Already Completed!'
                    }
                  </h3>
                  <p className="text-sm text-green-700">
                    {currentLessonData ? 
                      `You've already finished "${currentLessonData.title}". Go back to the main menu to see your next lesson.` :
                      "You've already finished this lesson. Go back to the main menu to see your next lesson."
                    }
                  </p>
                </div>
              </div>
              <a 
                href="/"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Back to Menu
              </a>
            </div>
          </div>
        ) : null}

        {/* Main Content Grid - Responsive Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Main Content - Voice and Controls */}
          <div className="xl:col-span-3 space-y-6">
            {/* Voice HUD */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                    🎙️ Voice Practice with Profesora Elena
                  </h2>
                  <div className="flex items-center gap-2 text-sm bg-white/50 px-3 py-1.5 rounded-full">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-green-700 font-medium">Spanish Mode</span>
                  </div>
                </div>
                <p className="text-gray-600 mt-2">
                  Click connect to start your Spanish conversation practice
                </p>
              </div>
              <div className="p-6">
                <VoiceHUD
                  onMessageReceived={handleMessageReceived}
                  onTranscriptReceived={handleTranscriptReceived}
                  onNotebookEntry={handleNotebookEntry}
                  currentLessonData={currentLessonData}
                />
              </div>
            </div>

            {/* Two-column grid for tips and controls */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Session Tips */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-lg">
                  💡 Tips for Success
                </h3>
                <ul className="text-sm text-gray-600 space-y-3">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2 mt-0.5">✓</span>
                    <span><strong>Speak in Spanish</strong> - Natural pronunciation recognized</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2 mt-0.5">✓</span>
                    <span><strong>Take your time</strong> - Profesora Elena waits for you</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2 mt-0.5">✓</span>
                    <span>Don't worry about mistakes - ¡dale que vos podés!</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2 mt-0.5">✓</span>
                    <span>Try: "¡Hola! ¿Todo bien?", "¿Cómo andás?"</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2 mt-0.5">✓</span>
                    <span>Practice <strong>vos</strong> forms: "vos tenés", "¿querés?"</span>
                  </li>
                </ul>
              </div>

              {/* Session Controls */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-bold text-gray-800 mb-4 text-lg">🎮 Session Controls</h3>
                <div className="space-y-3">
                  <button
                    onClick={completeLessonNow}
                    disabled={isLessonCompleted}
                    className={`w-full px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                      isLessonCompleted 
                        ? 'bg-green-100 text-green-800 cursor-not-allowed border border-green-200' 
                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md'
                    }`}
                  >
                    {isLessonCompleted ? 
                      (currentLessonData ? `✅ Lesson ${currentLessonData.lesson} Completed` : '✅ Completed') : 
                      (currentLessonData ? `🎯 Complete Lesson ${currentLessonData.lesson}` : '🎯 Complete Lesson')
                    }
                  </button>
                  
                  {isLessonCompleted && (
                    <a
                      href="/"
                      className="w-full inline-flex items-center justify-center px-4 py-3 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      📚 Go to Next Lesson
                    </a>
                  )}
                  
                  <div className="flex gap-2">
                    <button
                      onClick={clearConversation}
                      className="flex-1 px-3 py-2 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Clear Chat
                    </button>
                    <button
                      onClick={clearNotebook}
                      className="flex-1 px-3 py-2 text-sm bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                    >
                      Clear Notes
                    </button>
                  </div>
                </div>
                
                {isLessonCompleted && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700 font-medium">
                      {currentLessonData ? 
                        `🎉 Great job! Lesson ${currentLessonData.lesson} completed and progress saved.` :
                        '🎉 Great job! Your progress has been saved.'
                      }
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar - Teacher's Notebook */}
          <div className="xl:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden sticky top-28 max-h-[calc(100vh-8rem)]">
              <Notebook 
                entries={notebookEntries}
                onClear={clearNotebook}
              />
            </div>
          </div>
        </div>

        {/* Bottom Section - Conversation History */}
        <div className="mt-6">
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800">Conversation History</h3>
              <p className="text-sm text-gray-600">
                Real-time transcript of your Spanish conversation
              </p>
            </div>
            
            <div className="p-4">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No conversation yet. Connect your voice to start practicing!</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex items-start gap-3 ${
                        message.type === 'user' ? 'justify-start' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`px-3 py-2 rounded-lg max-w-md ${
                          message.type === 'user'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium">
                            {message.type === 'user' ? 'You' : 'Profesora Elena'}
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
                      <div className="px-3 py-2 rounded-lg max-w-md bg-gray-50 text-gray-700 border border-gray-200">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium">Profesora Elena</span>
                          <div className="flex space-x-1">
                            <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></div>
                            <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" style={{animationDelay: '0.1s'}}></div>
                            <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                          </div>
                        </div>
                        <p className="text-sm italic">{currentAiMessage}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Current transcript preview */}
                  {currentTranscript && (
                    <div className="flex items-start gap-3">
                      <div className="px-3 py-2 rounded-lg max-w-md bg-blue-100 text-blue-800 border border-blue-200">
                        <div className="text-xs font-medium mb-1">You (speaking...)</div>
                        <p className="text-sm italic">{currentTranscript}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
