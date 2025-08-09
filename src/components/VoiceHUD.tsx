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
  
  // Lesson control/milestones
  const lessonStartAtRef = useRef<number | null>(null);
  const taughtConceptsRef = useRef<Set<string>>(new Set());
  const writingExerciseCountRef = useRef<number>(0);
  const speakingPromptCountRef = useRef<number>(0);
  const endAllowedSentRef = useRef<boolean>(false);
  
  const MIN_LESSON_MS = 25 * 60 * 1000; // 25 minutes

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
            instructions: `Give concise feedback (≤ 3 sentences, ≤ 24 Spanish words total). Use the English/Spanish ratio of the current level; if B2+ respond only in Spanish. Praise if correct; otherwise correct and explain briefly.`,
            max_output_tokens: 350
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
    // Reset lesson control state
    lessonStartAtRef.current = null;
    taughtConceptsRef.current = new Set();
    writingExerciseCountRef.current = 0;
    speakingPromptCountRef.current = 0;
    endAllowedSentRef.current = false;
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
      // Track milestone
      writingExerciseCountRef.current = (writingExerciseCountRef.current || 0) + 1;
      
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
      
      // 🧠 SMART CONTEXT ANALYSIS - Check only the specific escribo sentence for past writing references
      const sentences = originalText.split(/[.!?]/);
      const escriboSentences = sentences.filter(s => s.toLowerCase().includes('escribo'));
      
      const pastWritingIndicators = [
        'ya escribimos', 'ya escribí', 'ya escribo', 'already wrote',
        'escribimos antes', 'escribí antes', 'wrote before', 'escribiste',
        'como puedes ver', 'as you can see', 'ya está', 'already',
        'we wrote', 'we already', 'I wrote', 'I already', 'you can see',
        'habíamos escrito', 'había escrito', 'hemos escrito', 'has escrito',
        'anteriormente', 'before', 'earlier', 'previously', 'previamente',
        'cleared', 'limpiaste', 'borraste', 'limpiado', 'cleared the notebook'
      ];
      
      // Only check for past references in the actual escribo sentences, not the entire transcript
      const hasPastReferenceInEscriboSentence = escriboSentences.some(sentence => 
        pastWritingIndicators.some(indicator => 
          sentence.toLowerCase().includes(indicator.toLowerCase())
        )
      );
      
      if (hasPastReferenceInEscriboSentence) {
        console.log('🧠 Detected past writing reference in escribo sentence, skipping notebook entry');
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
      
      // 📝 FLEXIBLE NOTEBOOK EXTRACTION - Capture vocabulary from various AI writing patterns
      const extractedWords = new Set<string>();
      
      // Enhanced patterns to catch more variations of AI vocabulary writing
      const escriboPatterns = [
        // Primary quoted patterns (handles both words and phrases)
        /escribo\s+'([^']+)'(?:\s+en\s+el\s+cuaderno)?/gi,        // straight single quotes
        /escribo\s+"([^"]+)"(?:\s+en\s+el\s+cuaderno)?/gi,        // straight double quotes
        /escribo\s+'([^']+)'(?:\s+en\s+el\s+cuaderno)?/gi,        // curly single quotes (CORRECT: open ' close ')
        /escribo\s+"([^"]+)"(?:\s+en\s+el\s+cuaderno)?/gi,        // curly double quotes (CORRECT: open " close ")
        
        // Unquoted patterns (more flexible)
        /escribo\s+(?:la\s+palabra\s+)?([a-záéíóúñü]+)(?:\s+en\s+el\s+cuaderno)?/gi,  // "escribo (la palabra) mesa"
        /voy\s+a\s+escribir\s+(?:la\s+palabra\s+)?([a-záéíóúñü]+)(?:\s+en\s+el\s+cuaderno)?/gi,  // "voy a escribir mesa"
        /ahora\s+escribo\s+([a-záéíóúñü]+)/gi,  // "ahora escribo mesa"
        /escriba\s+([a-záéíóúñü]+)/gi,  // "escriba mesa"
        /escribe\s+([a-záéíóúñü]+)/gi,  // "escribe mesa"
        /(?:let me )?write\s+(?:down\s+)?['"]?([a-záéíóúñü]+)['"]?/gi,  // English variants
        /(?:i'll|i\s+will)\s+write\s+(?:down\s+)?['"]?([a-záéíóúñü]+)['"]?/gi,  // "I'll write mesa"
        
        // Additional verb patterns with correct curly quotes
        /voy\s+a\s+escribir\s+'([^']+)'(?:\s+en\s+el\s+cuaderno)?/gi,  // "voy a escribir 'palabra'"
        /voy\s+a\s+escribir\s+'([^']+)'(?:\s+en\s+el\s+cuaderno)?/gi,  // "voy a escribir 'frase'"
        /escriba\s+'([^']+)'(?:\s+en\s+el\s+cuaderno)?/gi,             // "escriba 'palabra'"
        /escriba\s+'([^']+)'(?:\s+en\s+el\s+cuaderno)?/gi,             // "escriba 'frase'"
        
        // Fallback patterns that don't require quotes (MOST RELIABLE)
        /escribo\s+['"'"'"]?([a-záéíóúñü]+)['"'"'"]?\s+en\s+el\s+cuaderno/gi,  // "escribo 'gaseosa' en el cuaderno"
        /voy\s+a\s+escribir\s+['"'"'"]?([a-záéíóúñü]+)['"'"'"]?\s+en\s+el\s+cuaderno/gi,  // "voy a escribir 'gaseosa' en el cuaderno"
        
        // Ultra-flexible patterns - match content between quotes more precisely  
        /escribo\s+.([^''""\n]{1,30})[''""]?\s+en\s+el\s+cuaderno/gi,  // stop at closing quote
        /escribo\s+.([^''""\s]{1,20})/gi,  // single word after any opening quote/char
        
        // Additional fallback patterns for explicit notebook mentions
        /(?:agrego|añado|pongo)\s+['"]?([a-záéíóúñü]+)['"]?\s+(?:al\s+cuaderno|en\s+el\s+cuaderno)/gi,  // "agrego mesa al cuaderno"
        /(?:anoto|escribo)\s+esto\s+(?:en\s+el\s+cuaderno)?[:\s]+['"]?([a-záéíóúñü]+)['"]?/gi,  // "anoto esto: mesa"
        /cuaderno[:\s]+['"]?([a-záéíóúñü]+)['"]?/gi,  // "cuaderno: mesa"
        /vocabulario[:\s]+['"]?([a-záéíóúñü]+)['"]?/gi  // "vocabulario: mesa"
      ];
      
      console.log('🔍 Looking for vocabulary writing patterns in:', originalText);
      
      // Enhanced debugging for any vocabulary writing
      if (originalText.toLowerCase().includes('escribo')) {
        console.log('🧪 DEBUGGING: AI mentioned "escribo"');
        console.log('🔍 Full text with character codes:', JSON.stringify(originalText));
        
        // Find the "escribo" sentence specifically
        const sentences = originalText.split(/[.!?]/);
        const escriboSentence = sentences.find(s => s.toLowerCase().includes('escribo'));
        if (escriboSentence) {
          console.log('🎯 Found escribo sentence:', JSON.stringify(escriboSentence.trim()));
          
          // Show character codes around quotes
          const trimmed = escriboSentence.trim();
          for (let i = 0; i < trimmed.length; i++) {
            const char = trimmed[i];
            if (char.match(/[''""'''""]/)) {
              console.log(`🔍 Quote character at position ${i}: "${char}" (code: ${char.charCodeAt(0)})`);
            }
          }
          
          // Test the simple pattern (straight quotes)
          const simpleTest = /escribo\s+'([^']+)'/gi.exec(trimmed);
          if (simpleTest) {
            console.log('✅ Simple straight quotes pattern matched:', simpleTest[1]);
          } else {
            console.log('❌ Simple straight quotes pattern failed');
            
            // Test curly quotes pattern
            const curlyTest = /escribo\s+'([^']+)'/gi.exec(trimmed);
            if (curlyTest) {
              console.log('✅ Curly quotes pattern matched:', curlyTest[1]);
            } else {
              console.log('❌ Curly quotes pattern failed');
              
              // Test ultra-flexible pattern for phrases
              const ultraFlexible = /escribo\s+.([^''""\s]{1,20})/gi.exec(trimmed);
              if (ultraFlexible) {
                let cleaned = ultraFlexible[1].replace(/\s+en\s+el\s+cuaderno.*$/gi, '').replace(/[^\w\sáéíóúñü¿¡]/gi, '').trim();
                console.log('✅ Ultra-flexible pattern matched:', ultraFlexible[1], '→ cleaned:', cleaned);
              } else {
                console.log('❌ Even ultra-flexible pattern failed');
              }
            }
          }
        }
      }
      
      // Process patterns in priority order - longer phrases first to avoid partial matches
      const allMatches = new Map<string, number>(); // word -> word count (to prioritize longer phrases)
      
      for (const pattern of escriboPatterns) {
        let match;
        while ((match = pattern.exec(originalText)) !== null) {
          const word = match[1].trim();
          if (word && word.length > 0) {
            // Clean the word more aggressively - remove extra text like "en el cuaderno"
            let cleanWord = word
              .replace(/\s+en\s+el\s+cuaderno.*$/gi, '')  // Remove "en el cuaderno" and anything after
              .replace(/[^\w\sáéíóúñü¿¡]/gi, '')         // Remove punctuation
              .trim();
            
            if (cleanWord && cleanWord.length >= 2) {
              // Skip common function words that aren't vocabulary
              const skipWord = skipWords.includes(cleanWord.toLowerCase());
              
              if (!skipWord) {
                // Format with proper capitalization
                const formattedWord = cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1);
                const wordCount = formattedWord.split(' ').length;
                allMatches.set(formattedWord, wordCount);
                console.log('📝 Found potential vocabulary word: "' + formattedWord + '" (words: ' + wordCount + ')');
              } else {
                console.log('⏭️ Skipping function word: "' + cleanWord + '"');
              }
            }
          }
        }
      }
      
      // Filter out individual words if they're part of a longer phrase
      const finalWords = new Set<string>();
      const sortedMatches = Array.from(allMatches.entries()).sort((a, b) => b[1] - a[1]); // Sort by word count, longest first
      
      for (const [word, wordCount] of sortedMatches) {
        // Check if this word is a substring of any already accepted longer phrase
        const isPartOfLongerPhrase = Array.from(finalWords).some(acceptedWord => 
          acceptedWord !== word && 
          acceptedWord.toLowerCase().includes(word.toLowerCase()) &&
          acceptedWord.split(' ').length > word.split(' ').length
        );
        
        if (!isPartOfLongerPhrase) {
          finalWords.add(word);
          console.log('✅ Final vocabulary word: "' + word + '"');
        } else {
          console.log('⏭️ Skipping "' + word + '" - part of longer phrase already captured');
        }
      }
      
      // Add final filtered words to notebook
      if (finalWords.size > 0) {
        console.log('✅ Adding ' + finalWords.size + ' vocabulary words to notebook');
        const wordsArray = Array.from(finalWords);
        console.log('📝 Words to add:', wordsArray);
        // Track taught concepts (unique)
        wordsArray.forEach((word) => {
          taughtConceptsRef.current.add(word);
        });
        
        wordsArray.forEach((word, index) => {
          setTimeout(() => {
            console.log('📝 Adding "' + word + '" to notebook');
            onNotebookEntry?.(word);
          }, index * 500); // Increased timing to prevent race conditions
        });
      } else {
        console.log('⚠️  No vocabulary writing patterns found in:', originalText);
        console.log('🔍 This is normal if the AI was just talking without mentioning specific vocabulary');
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

  // Detect speaking prompts in AI transcript (approximate)
  const trackSpeakingPrompts = useCallback((transcript: string) => {
    const t = transcript.toLowerCase();
    const indicators = [
      'repetí', 'repite', 'repita', 'repite por favor', 'repeat', 'decí', 'dime',
      'di', 'say', 'responde', 'respondé', 'contesta', 'contesta por favor', 'pregunta'
    ];
    const found = indicators.some((p) => t.includes(p));
    if (found) {
      speakingPromptCountRef.current = (speakingPromptCountRef.current || 0) + 1;
    }
  }, []);

  // Enforce controlled ending based on time and milestones
  const enforceEndingControl = useCallback((transcript: string) => {
    const dc = dcRef.current;
    if (!dc || dc.readyState !== 'open') return;
    const t = transcript.toLowerCase();

    const closingPhrases = [
      'hoy aprendiste', 'en resumen', 'para terminar', 'para hoy terminamos',
      'la próxima lección', 'hemos terminado', 'con esto cerramos', 'wrap up',
      'to sum up', 'summary', "we're done", 'we are done', "that's all",
      'goodbye', 'adiós', 'hasta la próxima', 'terminamos', 'fin de la clase'
    ];

    const now = Date.now();
    const start = lessonStartAtRef.current ?? now;
    const elapsed = now - start;

    const conceptCount = taughtConceptsRef.current.size;
    const writingCount = writingExerciseCountRef.current;
    const speakingCount = speakingPromptCountRef.current;

    const timeOk = elapsed >= MIN_LESSON_MS;
    const milestonesOk = conceptCount >= 6 && writingCount >= 1 && speakingCount >= 2;
    const canEnd = timeOk && milestonesOk;

    const isClosingAttempt = closingPhrases.some((p) => t.includes(p));

    // If closing too early, inject system control to continue
    if (isClosingAttempt && !canEnd) {
      console.log('⛔ Early closing detected. Blocking and instructing to continue.');
      const blockMsg = {
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'system',
          content: [
            {
              type: 'input_text',
              text: `CONTROL: END_BLOCKED\nREASON: Not enough time or milestones.\nSTATUS: elapsed=${Math.floor(elapsed/60000)}min, concepts=${conceptCount}, writing=${writingCount}, speaking=${speakingCount}.\nACTION: Continue the lesson with the next concept. Do NOT summarize or end.`
            }
          ]
        }
      } as const;
      dc.send(JSON.stringify(blockMsg));

      const continueMsg = {
        type: 'response.create',
        response: {
          modalities: ['text', 'audio'],
          instructions: 'Continúa con el siguiente concepto de la lección, relacionado con los objetivos. Evita cualquier conclusión o despedida. Enseña solo un punto y luego pide al estudiante que hable o repita.',
          max_output_tokens: 400
        }
      } as const;
      dc.send(JSON.stringify(continueMsg));
      return;
    }

    // If all conditions are satisfied, emit END_ALLOWED once
    if (canEnd && !endAllowedSentRef.current) {
      const allowMsg = {
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'system',
          content: [
            { type: 'input_text', text: 'CONTROL: END_ALLOWED' }
          ]
        }
      } as const;
      dc.send(JSON.stringify(allowMsg));
      endAllowedSentRef.current = true;
      console.log('✅ END_ALLOWED sent to model.');
    }
  }, [MIN_LESSON_MS]);

  // Handle data channel messages
  const handleDataChannelMessage = useCallback((event: MessageEvent) => {
    try {
      const message = JSON.parse(event.data);
      
      // Only log important messages to reduce console spam
      if (message.type === 'error' || message.type === 'session.created' || 
          message.type === 'session.ended' || message.type === 'response.audio_transcript.done' ||
          message.type === 'conversation.item.input_audio_transcription.completed') {
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

          // Track speaking prompts and enforce controlled ending
          trackSpeakingPrompts(message.transcript);
          enforceEndingControl(message.transcript);
          
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

  // Initialize session - but don't auto-start the lesson
  const initializeSession = useCallback(() => {
    if (!dcRef.current) return;

    // Only auto-start if this is a reconnection with conversation history
    // For new sessions, wait for the user to say "Hola" to begin
    const hasConversationHistory = conversationHistory && conversationHistory.length > 0;
    
    if (hasConversationHistory) {
      const reconnectionGreeting = {
        type: 'response.create',
        response: {
          modalities: ['text', 'audio'],
          instructions: 'Reconectando con el estudiante. Saluda brevemente "¡Hola otra vez! Continuamos con nuestra lección." y continúa naturalmente desde donde se quedó la conversación según el contexto proporcionado. No reinicies la lección - retoma donde se quedó. Mantén la proporción de idiomas de tu nivel.',
          max_output_tokens: 200
        }
      };
      
      dcRef.current.send(JSON.stringify(reconnectionGreeting));
    } else {
      // For new sessions, just log that we're ready and waiting for user to start
      console.log('Session ready - waiting for user to say "Hola" to begin lesson');
    }
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
        // Initialize lesson tracking
        lessonStartAtRef.current = Date.now();
        taughtConceptsRef.current = new Set();
        writingExerciseCountRef.current = 0;
        speakingPromptCountRef.current = 0;
        endAllowedSentRef.current = false;
        // Brief delay to ensure connection is stable, then initialize
        // No need for long delays since user will initiate the conversation
        setTimeout(() => {
          if (pc.connectionState === 'connected' && dc.readyState === 'open') {
            console.log('Connection stable - session ready');
            initializeSession();
          }
        }, 1000); // Reduced delay since we're not auto-starting AI speech
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
    const hasConversationHistory = conversationHistory && conversationHistory.length > 0;
    
    switch (status) {
      case 'connected': 
        return hasConversationHistory ? 'Listo - Habla ahora' : 'Di "Hola" para empezar';
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
