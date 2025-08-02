'use client';
import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';

type VoiceStatus = 'idle' | 'connecting' | 'connected' | 'speaking' | 'listening' | 'error' | 'disconnecting';

interface VoiceHUDProps {
  onMessageReceived?: (message: any) => void;
  onTranscriptReceived?: (transcript: string, isUser: boolean, isStreaming?: boolean) => void;
  onNotebookEntry?: (text: string) => void;
  onWritingExerciseRequest?: (exerciseData: any) => void;
  onWritingExerciseCompleted?: (answer: string) => void;
  currentLessonData?: any; // Current lesson data for context
  conversationHistory?: Array<{
    id: string;
    timestamp: Date;
    type: 'user' | 'ai';
    content: string;
  }>; // Previous conversation for context preservation
  notebookEntries?: Array<{
    id: string;
    text: string;
    timestamp: Date;
    type: string;
  }>; // Current notebook entries for context
}

interface VoiceHUDRef {
  sendWritingExerciseResult: (result: { prompt: string; answer: string; exerciseType: string }) => void;
}

const VoiceHUD = forwardRef<VoiceHUDRef, VoiceHUDProps>(({ 
  onMessageReceived, 
  onTranscriptReceived,
  onNotebookEntry,
  onWritingExerciseRequest,
  onWritingExerciseCompleted,
  currentLessonData,
  conversationHistory = [],
  notebookEntries = []
}, ref) => {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [isRecording, setIsRecording] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number>();

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    sendWritingExerciseResult: (result: { prompt: string; answer: string; exerciseType: string }) => {
      if (dcRef.current?.readyState === 'open') {
        console.log('📝 Sending writing exercise result to AI:', result);
        
        // Create a message that tells the AI about the writing exercise completion
        const completionMessage = {
          type: 'conversation.item.create',
          item: {
            type: 'message',
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: `[WRITING EXERCISE COMPLETED] Exercise: "${result.prompt}" - My written answer: "${result.answer}" - Please provide feedback on my answer.`
              }
            ]
          }
        };
        
        dcRef.current.send(JSON.stringify(completionMessage));
        
        // Also trigger a response from the AI
        const responseMessage = {
          type: 'response.create',
          response: {
            modalities: ['text', 'audio'],
            instructions: `The student just completed a writing exercise. Exercise: "${result.prompt}". Their written answer was: "${result.answer}". Please provide specific feedback on their answer in Spanish and English. If correct, praise them. If incorrect, gently correct and explain. Always complete your full response.`,
            max_output_tokens: 500
          }
        };
        
        dcRef.current.send(JSON.stringify(responseMessage));
      } else {
        console.warn('⚠️  Cannot send writing exercise result - connection not ready');
      }
    }
  }), []);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (dcRef.current) {
      dcRef.current.close();
      dcRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (audioElementRef.current) {
      audioElementRef.current.remove();
      audioElementRef.current = null;
    }
    setIsRecording(false);
    setMicLevel(0);
  }, []);

  // Monitor microphone level
  const monitorMicLevel = useCallback((stream: MediaStream) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    
    const audioContext = audioContextRef.current;
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    
    source.connect(analyser);
    analyserRef.current = analyser;
    
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    const updateLevel = () => {
      if (!analyserRef.current) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      setMicLevel(average);
      
      animationFrameRef.current = requestAnimationFrame(updateLevel);
    };
    
    updateLevel();
  }, []);



  // Comprehensive skip list - avoid function words, teaching commands, and English
  const skipWords = [
    // Spanish function words
    'voy', 'que', 'para', 'con', 'una', 'las', 'los', 'del', 'por', 'son', 'muy', 'más', 'está', 'todo', 'bien', 
    'ahora', 'primero', 'listo', 'tienes', 'tiene', 'tengo', 'hacer', 'decir', 'pueden', 'puede', 'podemos',
    'esta', 'esto', 'eso', 'ese', 'esa', 'aquí', 'allí', 'donde', 'cuando', 'como', 'porque', 'pero', 'sin',
    'sobre', 'entre', 'hasta', 'desde', 'hacia', 'contra', 'durante', 'mediante', 'según', 'bajo', 'tras',
    'soy', 'eres', 'somos', 'son', 'estoy', 'estás', 'estamos', 'están', 'hay', 'ser', 'estar', 'tener',
    
    // Teaching commands and meta-language
    'escribo', 'escribir', 'escriba', 'escribe', 'vamos', 'repetí', 'repite', 'repeat', 'ahora', 'now',
    'cuaderno', 'notebook', 'pizarra', 'board', 'ayudarte', 'ayudar', 'practicar', 'hablar', 'means',
    'listen', 'escuchá', 'escucha', 'dice', 'digo', 'dije', 'palabra', 'word', 'frase', 'phrase',
    
    // English words that commonly appear
    'what', 'your', 'name', 'the', 'and', 'but', 'means', 'hello', 'good', 'thank', 'you', 'please',
    'yes', 'no', 'morning', 'afternoon', 'evening', 'night',
    
    // Common short words that aren't useful
    'el', 'la', 'un', 'en', 'es', 'de', 'te', 'me', 'se', 'le', 'lo', 'mi', 'tu', 'su'
  ];

  // Handle writing exercise requests from AI
  const handleWritingExerciseCommands = useCallback((transcript: string) => {
    const text = transcript.toLowerCase();
    const originalText = transcript;
    
    // Only log when exercise commands are actually detected (reduce spam)
    // console.log('🧠 Checking for writing exercise commands:', transcript);
    
    // Detect writing exercise requests
    const writingExerciseIndicators = [
      'writing exercise', 'ejercicio de escritura', 'exercise', 'ejercicio',
      'write down', 'escribe', 'escribí', 'translation exercise',
      'traducí', 'traduce', 'conjugate', 'conjuga', 'sentence with'
    ];
    
    const hasWritingExercise = writingExerciseIndicators.some(indicator => 
      text.includes(indicator.toLowerCase())
    );
    
    if (hasWritingExercise) {
      console.log('✍️ Writing exercise detected in AI speech!');
      
      // Parse different types of exercises
      let exerciseData: any = {
        type: 'sentence',
        prompt: 'Write a sentence in Spanish',
        hints: []
      };
      
      // Translation exercise detection
      if (text.includes('translate') || text.includes('traduc')) {
        const translateMatch = originalText.match(/translate[^"]*["']([^"']+)["']/i) ||
                             originalText.match(/traduc[^"]*["']([^"']+)["']/i);
        if (translateMatch) {
          exerciseData = {
            type: 'translation',
            prompt: `Translate to Spanish: "${translateMatch[1]}"`,
            hints: ['Think about the vocabulary we just learned', 'Remember Spanish word order']
          };
        }
      }
      
      // Conjugation exercise detection
      else if (text.includes('conjugate') || text.includes('conjuga')) {
        const verbMatch = originalText.match(/conjugate[^"]*["']([^"']+)["']/i) ||
                         originalText.match(/conjuga[^"]*["']([^"']+)["']/i);
        if (verbMatch) {
          exerciseData = {
            type: 'conjugation',
            prompt: `Conjugate the verb "${verbMatch[1]}" for "yo" (I)`,
            hints: ['Remember the verb endings', 'Most "yo" forms end in -o']
          };
        }
      }
      
      // Sentence writing exercise
      else if (text.includes('sentence with') || text.includes('write') || text.includes('escrib')) {
        const wordMatch = originalText.match(/(?:sentence with|write.*with|using)[^"]*["']([^"']+)["']/i) ||
                         originalText.match(/escrib[^"]*["']([^"']+)["']/i);
        if (wordMatch) {
          exerciseData = {
            type: 'sentence',
            prompt: `Write a sentence using: "${wordMatch[1]}"`,
            hints: [`Use "${wordMatch[1]}" naturally in the sentence`, 'Start with capital letter, end with period']
          };
        }
      }
      
      // Fill-in-the-blank exercise
      else if (text.includes('fill') || text.includes('complete') || text.includes('blank')) {
        const blankMatch = originalText.match(/fill[^:]*:(.+)/i) ||
                          originalText.match(/complete[^:]*:(.+)/i);
        if (blankMatch) {
          exerciseData = {
            type: 'fill-blank',
            prompt: blankMatch[1].trim(),
            hints: ['Think about the context', 'What word fits best here?']
          };
        }
      }
      
      console.log('✍️ Parsed writing exercise:', exerciseData);
      onWritingExerciseRequest?.(exerciseData);
      return; // Don't process as notebook command
    }
  }, [onWritingExerciseRequest]);

  // Dynamic Spanish language parser - handles ANY Spanish word
  const handleDrawingCommands = useCallback((transcript: string) => {
    const text = transcript.toLowerCase();
    const originalText = transcript; // Keep original for better word extraction
    
    // Only log when drawing commands are actually found (reduce spam)
    // console.log('🧠 Processing AI transcript:', transcript);
    
    // 📝 DYNAMIC TEXT WRITING - Extract ANY Spanish word
    if (text.includes('escribir') || text.includes('escribo') || text.includes('escriba') || text.includes('escribe')) {
      
      // 🧠 SMART CONTEXT ANALYSIS - Skip references to past writing and clearing
      const pastWritingIndicators = [
        'ya escribimos', 'ya escribí', 'ya escribo', 'already wrote',
        'escribimos antes', 'escribí antes', 'wrote before', 'escribiste',
        'como puedes ver', 'as you can see', 'ya tenemos', 'ya tienen',
        'remember', 'recordá', 'recuerda', 'ya está', 'already',
        'we wrote', 'we already', 'I wrote', 'I already', 'you can see',
        'habíamos escrito', 'había escrito', 'hemos escrito', 'has escrito',
        'anteriormente', 'before', 'earlier', 'previously', 'previamente',
        'cleared', 'limpiaste', 'borraste', 'limpiado', 'cleared the notebook'
      ];
      
      const isPastReference = pastWritingIndicators.some(indicator => 
        text.includes(indicator.toLowerCase())
      );
      
      if (isPastReference) {
        console.log('🧠 Detected past writing reference, skipping notebook entry');
        console.log('🧠 Context:', originalText);
        return;
      }
      
      // Special case: Days of the week list
      if (text.includes('días de la semana') || text.includes('todos los días')) {
        console.log('📅 Adding days of the week to notebook');
        onNotebookEntry?.('DÍAS DE LA SEMANA');
        const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        days.forEach((day, index) => {
          setTimeout(() => {
            onNotebookEntry?.(day);
          }, index * 500);
        });
        return;
      }
      
      // 📝 PRECISE NOTEBOOK EXTRACTION - Only extract words from "Escribo '[word]' en el cuaderno" pattern
      const extractedWords = new Set<string>();
      
      // Look for the exact pattern: Escribo '[word/phrase]' (with various quote types)
      const escriboPatterns = [
        /escribo\s+['"]([^'"]+)['"](?:\s+en\s+el\s+cuaderno)?/gi,  // Standard quotes with optional "en el cuaderno"
        /escribo\s+['"""''‚„«»‹›]([^'"""''‚„«»‹›]+)['"""''‚„«»‹›](?:\s+en\s+el\s+cuaderno)?/gi,  // Various quote types
        /voy\s+a\s+escribir\s+['"]([^'"]+)['"](?:\s+en\s+el\s+cuaderno)?/gi,  // "Voy a escribir" variant
        /escriba\s+['"]([^'"]+)['"](?:\s+en\s+el\s+cuaderno)?/gi,  // "Escriba" variant
        /escribe\s+['"]([^'"]+)['"](?:\s+en\s+el\s+cuaderno)?/gi   // "Escribe" variant
      ];
      
      console.log('🔍 Looking for Escribo patterns in:', originalText);
      
      for (const pattern of escriboPatterns) {
        let match;
        while ((match = pattern.exec(originalText)) !== null) {
          const word = match[1].trim();
          if (word && word.length > 0) {
            // Clean the word but preserve Spanish characters and spaces
            const cleanWord = word.replace(/[^\w\sáéíóúñü¿¡]/gi, '').trim();
            
            if (cleanWord) {
              // Format with proper capitalization
              const formattedWord = cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1);
              extractedWords.add(formattedWord);
              console.log('📝 Found Escribo command: "' + formattedWord + '"');
            }
          }
        }
      }
      
      // Add extracted words to notebook
      if (extractedWords.size > 0) {
        console.log('✅ Adding ' + extractedWords.size + ' vocabulary words to notebook');
        const wordsArray = Array.from(extractedWords);
        console.log('📝 Words to add:', wordsArray);
        
        wordsArray.forEach((word, index) => {
          setTimeout(() => {
            console.log('📝 Adding "' + word + '" to notebook');
            onNotebookEntry?.(word);
          }, index * 500); // Increased timing to prevent race conditions
        });
      } else {
        console.log('⚠️  No "Escribo" commands found for notebook in:', originalText);
        console.log('🔍 This is normal if the AI was just talking without writing vocabulary');
      }
    }
    
    // 🧹 CLEAR NOTEBOOK - Enhanced detection
    else if (text.includes('limpiar') || text.includes('borrar') || text.includes('limpia') || text.includes('borro')) {
      console.log('🧹 AI wants to clear notebook - detected clean command');
      console.log('🧹 Original text:', originalText);
      // Note: We don't clear the notebook automatically here since the AI might just be saying it
      // The actual clearing happens through the UI button or explicit user request
    }
    
  }, [onNotebookEntry]);

  // Handle data channel messages
  const handleDataChannelMessage = useCallback((event: MessageEvent) => {
    try {
      const message = JSON.parse(event.data);
      
      // Only log important messages to reduce console spam
      if (message.type === 'error' || message.type === 'session.created' || 
          message.type === 'session.ended' || message.type?.includes('transcript')) {
        console.log('VoiceHUD - Important message:', message.type, message);
      }
      
      onMessageReceived?.(message);
      
      switch (message.type) {
        case 'session.created':
          console.log('Session created:', message.session);
          break;
          
        case 'input_audio_buffer.speech_started':
          setStatus('listening');
          console.log('Speech started - listening to user');
          break;
          
        case 'input_audio_buffer.speech_stopped':
          setStatus('connected');
          console.log('Speech stopped - processing user input');
          break;
          
        case 'response.audio_transcript.delta':
          // Stream the delta for real-time display, but don't add to conversation history yet
          onTranscriptReceived?.(message.delta, false, true); // true = is streaming
          setStatus('speaking');
          break;
          
        case 'response.audio_transcript.done':
          // Only this complete message should be added to conversation history
          onTranscriptReceived?.(message.transcript, false, false); // false = complete message
          
          // Check for writing exercises first, then notebook entries
          const transcript = message.transcript.toLowerCase();
          // Only log if transcript contains specific keywords (reduce spam)
          if (message.transcript.toLowerCase().includes('exercise') || 
              message.transcript.toLowerCase().includes('escribo')) {
            console.log('AI transcript (contains commands):', message.transcript);
          }
          
          // Check for writing exercise requests
          handleWritingExerciseCommands(message.transcript);
          
          // Then check for notebook writing (vocabulary)
          if (transcript.includes('dibujar') || transcript.includes('escribir') || transcript.includes('escribo') || transcript.includes('escriba') || transcript.includes('escribe') || transcript.includes('pizarra')) {
            console.log('Notebook writing command detected!');
            handleDrawingCommands(message.transcript);
          }
          
          setStatus('connected');
          break;
          
        case 'conversation.item.input_audio_transcription.completed':
          onTranscriptReceived?.(message.transcript, true, false); // User transcripts are always complete
          break;
          
        case 'board_operation':
          // Legacy board operations no longer supported - notebook entries only
          console.log('Ignoring legacy board operation:', message.operation);
          break;
          
        case 'error':
          console.error('Realtime API error:', message.error);
          setStatus('error');
          break;
      }
    } catch (error) {
      console.error('Error parsing data channel message:', error);
    }
  }, [onMessageReceived, onTranscriptReceived, handleDrawingCommands, handleWritingExerciseCommands]);

  // Initialize session
  const initializeSession = useCallback(() => {
    if (!dcRef.current) return;

    // The backend /api/realtime/token endpoint now provides all the necessary
    // instructions when the session is created. Sending a `session.update` here
    // would overwrite the detailed, context-specific prompt with a generic one.
    // We now only need to trigger the initial response from the AI.
    
    // For a new session, we send an empty `response.create` which tells the AI
    // to start the conversation based on its main system prompt.
    // For a reconnection, we provide specific instructions to continue the lesson.
    const hasConversationHistory = conversationHistory && conversationHistory.length > 0;
    
    const greeting = {
      type: 'response.create',
      response: {
        modalities: ['text', 'audio'],
        instructions: hasConversationHistory 
          ? 'You are reconnecting to continue the lesson. Welcome the student back briefly with "¡Hola otra vez! Continuamos con nuestra lección." Then naturally continue from where the conversation left off based on the context provided. Do not restart the lesson - pick up where you left off. Keep it brief and natural.'
          : undefined, // Let the main system prompt from the backend handle the introduction.
        max_output_tokens: hasConversationHistory ? 250 : 400
      }
    };
    
    dcRef.current.send(JSON.stringify(greeting));
  }, [conversationHistory]);

  // Connect to OpenAI Realtime API
  const connect = async () => {
    if (status !== 'idle') return;
    
    setStatus('connecting');
    
    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 24000
        }
      });
      
      mediaStreamRef.current = stream;
      setIsRecording(true);
      monitorMicLevel(stream);
      
      // Get session credentials with conversation context
      const tokenResponse = await fetch('/api/realtime/token', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customLessonData: currentLessonData,
          conversationHistory: conversationHistory,
          notebookEntries: notebookEntries
        })
      });
      if (!tokenResponse.ok) throw new Error('Failed to get session credentials');
      const sessionData = await tokenResponse.json();
      
      console.log('Session data received:', sessionData);
      
      if (!sessionData.client_secret) {
        throw new Error('No client_secret received from session');
      }
      
      // Create RTCPeerConnection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;
      
      // Set up audio output
      const audioElement = document.createElement('audio');
      audioElement.autoplay = true;
      audioElement.style.display = 'none';
      document.body.appendChild(audioElement);
      audioElementRef.current = audioElement;
      
      pc.ontrack = (event) => {
        console.log('Received remote track');
        if (audioElementRef.current) {
          audioElementRef.current.srcObject = event.streams[0];
        }
      };
      
      // Add local audio track
      const audioTrack = stream.getAudioTracks()[0];
      pc.addTrack(audioTrack, stream);
      
      // Create data channel
      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;
      
      dc.addEventListener('open', () => {
        console.log('Data channel opened');
        initializeSession();
      });
      
      dc.addEventListener('message', handleDataChannelMessage);
      
      dc.addEventListener('close', () => {
        console.log('Data channel closed');
      });
      
      // Handle connection state changes
      pc.addEventListener('connectionstatechange', () => {
        console.log('Connection state:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          setStatus('connected');
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          setStatus('error');
        }
      });
      
      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      // Send offer to OpenAI Realtime API
      const sdpResponse = await fetch('https://api.openai.com/v1/realtime', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + sessionData.client_secret.value,
          'Content-Type': 'application/sdp'
        },
        body: offer.sdp
      });
      
      if (!sdpResponse.ok) {
        const errorText = await sdpResponse.text();
        console.error('SDP Response error:', errorText);
        throw new Error('SDP exchange failed: ' + sdpResponse.statusText + ' - ' + errorText);
      }
      
      const answerSdp = await sdpResponse.text();
      await pc.setRemoteDescription({
        type: 'answer',
        sdp: answerSdp
      });
      
      // Wait for connection to be established
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout. State: ' + pc.connectionState));
        }, 10000);
        
        pc.addEventListener('connectionstatechange', () => {
          if (pc.connectionState === 'connected') {
            clearTimeout(timeout);
            resolve();
          } else if (pc.connectionState === 'failed') {
            clearTimeout(timeout);
            reject(new Error('Connection failed'));
          }
        });
      });
      
      console.log('Successfully connected to OpenAI Realtime API');
      
    } catch (error) {
      console.error('Connection error:', error);
      setStatus('error');
      cleanup();
    }
  };

  // Disconnect from API
  const disconnect = async () => {
    setStatus('disconnecting');
    
    // Send goodbye message if connected
    if (dcRef.current?.readyState === 'open') {
      const goodbye = {
        type: 'response.create',
        response: {
          modalities: ['text', 'audio'],
          instructions: 'Say a brief goodbye to the student in Spanish, thanking them for practicing. Always complete your farewell message.',
          max_output_tokens: 250
        }
      };
      
      dcRef.current.send(JSON.stringify(goodbye));
      
      // Wait a moment for the goodbye to be sent
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    cleanup();
    setStatus('idle');
  };

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const getStatusColor = () => {
    switch (status) {
      case 'connected': return 'bg-success';
      case 'connecting': return 'bg-warning';
      case 'speaking': return 'bg-primary';
      case 'listening': return 'bg-purple-500';
      case 'error': return 'bg-destructive';
      default: return 'bg-muted-foreground';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected': return 'Listo - Habla ahora';
      case 'connecting': return 'Conectando...';
      case 'speaking': return 'Profesora habla';
      case 'listening': return 'Escuchando...';
      case 'error': return 'Error conexión';
      case 'disconnecting': return 'Desconectando...';
      default: return 'Conectar voz';
    }
  };

  return (
    <div className="space-y-3">
      {/* Connection Button - Fixed Width */}
      <button
        onClick={status === 'idle' ? connect : disconnect}
        disabled={status === 'connecting' || status === 'disconnecting'}
        className={`w-full px-3 py-2 text-xs font-medium rounded-lg text-white transition-colors ${
          status === 'idle' 
            ? 'bg-success hover:bg-success/90' 
            : 'bg-destructive hover:bg-destructive/90'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {status === 'idle' ? 'Conectar' : 'Desconectar'}
      </button>

      {/* Status Indicator - Fixed Height */}
      <div className="flex items-center gap-2 min-h-[20px]">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusColor()}`} />
        <span className="text-xs text-muted-foreground line-clamp-1 flex-1">
          {getStatusText()}
        </span>
      </div>

      {/* Microphone Level Indicator */}
      {isRecording && (
        <div className="flex items-center gap-2">
          <div className="text-xs text-muted-foreground">Nivel:</div>
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-success to-warning transition-all duration-75"
              style={{ width: Math.min(micLevel / 2, 100) + '%' }}
            />
          </div>
        </div>
      )}

      {/* Hidden audio element for playbook */}
      <audio ref={audioElementRef} autoPlay className="hidden" />
    </div>
  );
});

VoiceHUD.displayName = 'VoiceHUD';

export default VoiceHUD;
