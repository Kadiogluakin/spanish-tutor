'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { debug } from '@/lib/debug';
import {
  type KnownRealtimeEvent,
  isKnownRealtimeEvent,
  isRealtimeEvent,
} from '@/types/realtime-events';

export type VoiceStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'speaking'
  | 'listening'
  | 'error'
  | 'disconnecting';

export interface ConnectContext {
  customLessonData?: unknown;
  conversationHistory?: unknown[];
  notebookEntries?: unknown[];
}

export interface UseRealtimeConnectionOptions {
  // Called for every event (known + unknown) before internal dispatch so the
  // parent can forward raw events for observability.
  onEvent?: (event: unknown) => void;
  // Called for every *known* event, narrowed to KnownRealtimeEvent. This is
  // the primary dispatch surface for callers that only care about typed
  // events (e.g. useAiEventRouter).
  onKnownEvent?: (event: KnownRealtimeEvent) => void;
  // Called once the local media stream is ready (after getUserMedia). Enables
  // downstream hooks to attach analysers / monitoring.
  onMediaStream?: (stream: MediaStream) => void;
  // Called once the <audio> element that plays remote audio is mounted. Used
  // by useMicGate for signal-driven unmute.
  onRemoteAudioElement?: (el: HTMLAudioElement) => void;
  // Called when a remote track arrives on the peer connection.
  onRemoteTrack?: (stream: MediaStream) => void;
}

export interface RealtimeConnection {
  status: VoiceStatus;
  isRecording: boolean;
  connect: (ctx: ConnectContext) => Promise<void>;
  disconnect: (options?: { playGoodbye?: boolean }) => Promise<void>;
  // Send a raw event to the data channel. No-op if not connected.
  sendEvent: (event: unknown) => void;
  // Imperative status setter, used by hooks that derive UI state from events
  // (e.g. useMicGate → status='speaking' during response.created).
  setStatus: (status: VoiceStatus) => void;
}

// Encapsulates the full WebRTC lifecycle for the OpenAI Realtime API:
// - getUserMedia + mic stream ownership
// - RTCPeerConnection + RTCDataChannel setup/teardown
// - Session-credential fetch from our own API route
// - SDP exchange
// - JSON parsing of data-channel messages into typed events
//
// Intentionally pure transport: no prompt engineering, no lesson-control
// logic, no regex. Parents subscribe via `onKnownEvent` and decide what to do.
export function useRealtimeConnection(
  options: UseRealtimeConnectionOptions
): RealtimeConnection {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [isRecording, setIsRecording] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const disconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearDisconnectTimer = useCallback(() => {
    if (disconnectTimerRef.current) {
      clearTimeout(disconnectTimerRef.current);
      disconnectTimerRef.current = null;
    }
  }, []);

  // Keep the latest callbacks in refs so we don't need to recreate
  // `handleDataChannelMessage` (which is attached to the DC) on every render.
  const onEventRef = useRef(options.onEvent);
  const onKnownEventRef = useRef(options.onKnownEvent);
  const onMediaStreamRef = useRef(options.onMediaStream);
  const onRemoteAudioElementRef = useRef(options.onRemoteAudioElement);
  const onRemoteTrackRef = useRef(options.onRemoteTrack);
  useEffect(() => {
    onEventRef.current = options.onEvent;
    onKnownEventRef.current = options.onKnownEvent;
    onMediaStreamRef.current = options.onMediaStream;
    onRemoteAudioElementRef.current = options.onRemoteAudioElement;
    onRemoteTrackRef.current = options.onRemoteTrack;
  }, [
    options.onEvent,
    options.onKnownEvent,
    options.onMediaStream,
    options.onRemoteAudioElement,
    options.onRemoteTrack,
  ]);

  const cleanup = useCallback(() => {
    clearDisconnectTimer();
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
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
  }, [clearDisconnectTimer]);

  const sendEvent = useCallback((event: unknown) => {
    const dc = dcRef.current;
    if (!dc || dc.readyState !== 'open') return;
    dc.send(JSON.stringify(event));
  }, []);

  const handleDataChannelMessage = useCallback((event: MessageEvent) => {
    try {
      const raw: unknown = JSON.parse(event.data);
      if (!isRealtimeEvent(raw)) {
        console.error('Received malformed data channel message:', raw);
        return;
      }
      onEventRef.current?.(raw);
      if (isKnownRealtimeEvent(raw)) {
        onKnownEventRef.current?.(raw);
      }
    } catch (error) {
      console.error('Error parsing data channel message:', error);
    }
  }, []);

  const connect = useCallback(
    async (ctx: ConnectContext) => {
      if (status !== 'idle' && status !== 'error') return;
      clearDisconnectTimer();
      cleanup();
      setStatus('connecting');

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 24000,
          },
        });

        mediaStreamRef.current = stream;
        setIsRecording(true);
        onMediaStreamRef.current?.(stream);

        const tokenResponse = await fetch('/api/realtime/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customLessonData: ctx.customLessonData,
            conversationHistory: ctx.conversationHistory,
            notebookEntries: ctx.notebookEntries,
          }),
        });
        if (!tokenResponse.ok) throw new Error('Failed to get session credentials');
        const sessionData = await tokenResponse.json();

        debug('Session data received:', sessionData);

        if (!sessionData.client_secret) {
          throw new Error('No client_secret received from session');
        }

        const pc = new RTCPeerConnection();
        pcRef.current = pc;

        const audioElement = document.createElement('audio');
        audioElement.autoplay = true;
        audioElement.style.display = 'none';
        document.body.appendChild(audioElement);
        audioElementRef.current = audioElement;
        onRemoteAudioElementRef.current?.(audioElement);

        pc.ontrack = (event) => {
          debug('Received remote track');
          const [remoteStream] = event.streams;
          if (audioElementRef.current) {
            audioElementRef.current.srcObject = remoteStream;
          }
          onRemoteTrackRef.current?.(remoteStream);
        };

        const audioTrack = stream.getAudioTracks()[0];
        pc.addTrack(audioTrack, stream);

        const dc = pc.createDataChannel('oai-events');
        dcRef.current = dc;

        dc.addEventListener('open', () => {
          debug('Data channel opened');
        });
        dc.addEventListener('message', handleDataChannelMessage);
        dc.addEventListener('close', () => {
          debug('Data channel closed');
        });

        pc.addEventListener('connectionstatechange', () => {
          debug('Connection state:', pc.connectionState);
          if (pc.connectionState === 'connected') {
            clearDisconnectTimer();
            setStatus('connected');
          } else if (pc.connectionState === 'failed') {
            clearDisconnectTimer();
            if (pcRef.current === pc) {
              console.warn('[Realtime] PeerConnection failed');
              cleanup();
              setStatus('idle');
            }
          } else if (pc.connectionState === 'disconnected') {
            clearDisconnectTimer();
            disconnectTimerRef.current = setTimeout(() => {
              disconnectTimerRef.current = null;
              if (
                pcRef.current === pc &&
                pc.connectionState === 'disconnected'
              ) {
                console.warn(
                  '[Realtime] PeerConnection stayed disconnected; resetting'
                );
                cleanup();
                setStatus('idle');
              }
            }, 2500);
          } else if (pc.connectionState === 'closed') {
            clearDisconnectTimer();
            if (pcRef.current === pc) {
              cleanup();
              setStatus('idle');
            }
          }
        });

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const sdpResponse = await fetch('https://api.openai.com/v1/realtime', {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + sessionData.client_secret.value,
            'Content-Type': 'application/sdp',
          },
          body: offer.sdp,
        });

        if (!sdpResponse.ok) {
          const errorText = await sdpResponse.text();
          console.error('SDP Response error:', errorText);
          throw new Error(
            'SDP exchange failed: ' + sdpResponse.statusText + ' - ' + errorText
          );
        }

        const answerSdp = await sdpResponse.text();
        await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

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

        debug('Successfully connected to OpenAI Realtime API');
      } catch (error) {
        console.error('Connection error:', error);
        setStatus('error');
        cleanup();
      }
    },
    [
      status,
      cleanup,
      clearDisconnectTimer,
      handleDataChannelMessage,
    ]
  );

  const disconnect = useCallback(
    async (disconnectOptions?: { playGoodbye?: boolean }) => {
      setStatus('disconnecting');

      if (disconnectOptions?.playGoodbye && dcRef.current?.readyState === 'open') {
        const goodbye = {
          type: 'response.create',
          response: {
            modalities: ['text', 'audio'],
            instructions:
              'Say a brief goodbye to the student in Spanish, thanking them for practicing. Always complete your farewell message.',
            max_output_tokens: 250,
          },
        };
        dcRef.current.send(JSON.stringify(goodbye));
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      cleanup();
      setStatus('idle');
    },
    [cleanup]
  );

  // Final cleanup on unmount.
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    status,
    isRecording,
    connect,
    disconnect,
    sendEvent,
    setStatus,
  };
}
