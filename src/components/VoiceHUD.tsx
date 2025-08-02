'use client';
import { useState, useRef, useCallback, useEffect } from 'react';

type VoiceStatus = 'idle' | 'connecting' | 'connected' | 'speaking' | 'listening' | 'error' | 'disconnecting';

interface VoiceHUDProps {
  onMessageReceived?: (message: any) => void;
  onTranscriptReceived?: (transcript: string, isUser: boolean, isStreaming?: boolean) => void;
  onNotebookEntry?: (text: string) => void;
  currentLessonData?: any; // Current lesson data for context
}

export default function VoiceHUD({ 
  onMessageReceived, 
  onTranscriptReceived,
  onNotebookEntry,
  currentLessonData 
}: VoiceHUDProps) {
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



  // Dynamic Spanish language parser - handles ANY Spanish word
  const handleDrawingCommands = useCallback((transcript: string) => {
    const text = transcript.toLowerCase();
    const originalText = transcript; // Keep original for better word extraction
    
    console.log('🧠 Processing AI transcript:', transcript);
    
    // 📝 DYNAMIC TEXT WRITING - Extract ANY Spanish word
    if (text.includes('escribir') || text.includes('escribo') || text.includes('escriba') || text.includes('escribe')) {
      
      // 🧠 SMART CONTEXT ANALYSIS - Skip references to past writing
      const pastWritingIndicators = [
        'ya escribimos', 'ya escribí', 'ya escribo', 'already wrote',
        'escribimos antes', 'escribí antes', 'wrote before', 'escribiste',
        'como puedes ver', 'as you can see', 'ya tenemos', 'ya tienen',
        'remember', 'recordá', 'recuerda', 'ya está', 'already',
        'we wrote', 'we already', 'I wrote', 'I already', 'you can see',
        'habíamos escrito', 'había escrito', 'hemos escrito', 'has escrito',
        'anteriormente', 'before', 'earlier', 'previously', 'previamente'
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
          }, index * 200);
        });
        return;
      }
      
      // Collect all words from different extraction methods
      const allExtractedWords = new Set<string>(); // Use Set to automatically prevent duplicates
      
      // 🎯 EXTRACT QUOTED WORDS - handles all types of quotes
      const quotedWordsPattern = /['"""''‚„«»‹›]([^'"""''‚„«»‹›]+)['"""''‚„«»‹›]/g;
      let match;
      
      while ((match = quotedWordsPattern.exec(originalText)) !== null) {
        const word = match[1].trim();
        if (word && word.length > 0) {
          const cleanWord = word.replace(/[^\w\sáéíóúñü¿¡]/gi, '').trim();
          if (cleanWord) {
            const formattedWord = cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1);
            allExtractedWords.add(formattedWord);
            console.log('📝 Found quoted word: "' + formattedWord + '"');
          }
        }
      }
      
      // 2. DIRECT COMMAND PATTERNS (specific word after escribir commands)
      const directPatterns = [
        /(?:voy\s+a\s+)?escribir\s+(?:la\s+palabra\s+)?([a-záéíóúñü]+(?:\s+[a-záéíóúñü]+)?)\b/i,
        /escribo\s+([a-záéíóúñü]+(?:\s+[a-záéíóúñü]+)?)\b/i,
        /escriba\s+([a-záéíóúñü]+(?:\s+[a-záéíóúñü]+)?)\b/i,
        /escribe\s+([a-záéíóúñü]+(?:\s+[a-záéíóúñü]+)?)\b/i,
      ];
      
      // Enhanced skip list - avoid common function words and teaching phrases
      const skipWords = [
        'voy', 'que', 'para', 'con', 'una', 'las', 'los', 'del', 'por', 'son', 'muy', 'más', 'está', 'todo', 'bien', 
        'ahora', 'primero', 'listo', 'tienes', 'tiene', 'tengo', 'hacer', 'decir', 'pueden', 'puede', 'podemos',
        'esta', 'esto', 'eso', 'ese', 'esa', 'aquí', 'allí', 'donde', 'cuando', 'como', 'porque', 'pero', 'sin',
        'sobre', 'entre', 'hasta', 'desde', 'hacia', 'contra', 'durante', 'mediante', 'según', 'bajo', 'tras',
        'pizarra', 'ayudarte', 'ayudar', 'practicar', 'hablar', 'escrito', 'escribe', 'escribir', 'escribo'
      ];
      
      for (let i = 0; i < directPatterns.length; i++) {
        const pattern = directPatterns[i];
        const matches = originalText.matchAll(new RegExp(pattern.source, pattern.flags + 'g'));
        
        for (const match of matches) {
          if (match && match[1]) {
            const word = match[1].trim();
            
            if (!skipWords.includes(word.toLowerCase()) && word.length > 1) {
              const cleanWord = word.replace(/[^\w\sáéíóúñü]/gi, '').trim();
              if (cleanWord) {
                const formattedWord = cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1);
                allExtractedWords.add(formattedWord);
                console.log('✅ Extracted "' + formattedWord + '" using pattern ' + (i + 1));
              }
            }
          }
        }
      }
      
      // 3. Add all unique words to notebook
      if (allExtractedWords.size > 0) {
        console.log('✅ Adding ' + allExtractedWords.size + ' unique words to notebook');
        const wordsArray = Array.from(allExtractedWords);
        wordsArray.forEach((word, index) => {
          setTimeout(() => {
            console.log('📝 Adding "' + word + '" to notebook');
            onNotebookEntry?.(word);
          }, index * 300); // Staggered timing for better UX
        });
      } else {
        console.log('⚠️  No suitable words found for notebook in:', originalText);
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
      console.log('Received message:', message);
      
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
          
          // Check if AI mentioned writing in notebook
          const transcript = message.transcript.toLowerCase();
          console.log('AI transcript:', message.transcript);
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
  }, [onMessageReceived, onTranscriptReceived, handleDrawingCommands]);

  // Initialize session with system prompt
  const initializeSession = useCallback(() => {
    if (!dcRef.current) return;
    
    const sessionUpdate = {
      type: 'session.update',
      session: {
        instructions: 'You are Profesora Elena, a friendly Spanish teacher. You help students practice Spanish through conversation. ' +
        '' +
        'IMPORTANT: Expect students to speak primarily in Spanish. They are learning, so they may make mistakes or have pronunciation issues. ' +
        '' +
        'Key behaviors: ' +
        '- Speak clearly and at an appropriate pace for language learners ' +
        '- Respond primarily in Spanish, using simple vocabulary initially ' +
        '- Correct mistakes gently and provide explanations in Spanish first ' +
        '- Encourage students to speak more Spanish, even if imperfect ' +
        '- Use simple vocabulary initially, then gradually increase complexity ' +
        '- Provide positive feedback and encouragement frequently ' +
        '- Mix Spanish and English explanations as needed for clarity',

        voice: 'maple',
        modalities: ['text', 'audio'],
        temperature: 0.8,
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 700  // Wait 700ms of silence - more responsive but still prevents interruption
        },
        input_audio_transcription: { 
          model: 'whisper-1',
          language: 'es' // Spanish language code for better transcription
        }
      }
    };
    
    dcRef.current.send(JSON.stringify(sessionUpdate));
    
    // Send initial greeting
    const greeting = {
      type: 'response.create',
      response: {
        modalities: ['text', 'audio'],
        instructions: 'Greet the student warmly in Spanish with "¡Hola! Soy Profesora Elena. ¿Cómo estás hoy? ¿Qué te gustaría practicar?" Speak slowly and clearly since they are learning Spanish. Keep it brief and encouraging.',
        max_output_tokens: 100
      }
    };
    
    dcRef.current.send(JSON.stringify(greeting));
  }, []);

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
      
      // Get session credentials
      const tokenResponse = await fetch('/api/realtime/token', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customLessonData: currentLessonData
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
          instructions: 'Say a brief goodbye to the student in Spanish, thanking them for practicing.',
          max_output_tokens: 50
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
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'speaking': return 'bg-blue-500';
      case 'listening': return 'bg-purple-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected': return 'Ready - Speak now';
      case 'connecting': return 'Connecting...';
      case 'speaking': return 'Profesora Elena speaking';
      case 'listening': return 'Listening to you...';
      case 'error': return 'Connection Error';
      case 'disconnecting': return 'Disconnecting...';
      default: return 'Connect Voice';
    }
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-lg shadow-sm border">
      {/* Connection Button */}
      <button
        onClick={status === 'idle' ? connect : disconnect}
        disabled={status === 'connecting' || status === 'disconnecting'}
        className={'px-4 py-2 rounded-lg text-white font-medium transition-colors ' + (
          status === 'idle' 
            ? 'bg-emerald-600 hover:bg-emerald-700' 
            : 'bg-red-600 hover:bg-red-700'
        ) + ' disabled:opacity-50 disabled:cursor-not-allowed'}
      >
        {status === 'idle' ? 'Connect Voice' : 'Disconnect'}
      </button>

      {/* Status Indicator */}
      <div className="flex items-center gap-2">
        <div className={'w-3 h-3 rounded-full ' + getStatusColor()} />
        <span className="text-sm font-medium text-gray-700">{getStatusText()}</span>
      </div>

      {/* Microphone Level Indicator */}
      {isRecording && (
        <div className="flex items-center gap-2">
          <div className="text-sm text-gray-600">Mic:</div>
          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-400 to-red-500 transition-all duration-75"
              style={{ width: Math.min(micLevel / 2, 100) + '%' }}
            />
          </div>
        </div>
      )}

      {/* Hidden audio element for playback */}
      <audio ref={audioElementRef} autoPlay className="hidden" />
    </div>
  );
}
