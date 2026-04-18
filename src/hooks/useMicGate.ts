'use client';

import { useCallback, useEffect, useRef } from 'react';
import { debug } from '@/lib/debug';

// Fallback buffer if signal-driven unmute doesn't fire in time. We still
// want to unmute eventually even if the audio element's "ended" event is
// suppressed or the analyser can't reach silence threshold.
const FALLBACK_UNMUTE_MS = 1200;

// Silence threshold (0–255 analyser scale) and required dwell time before we
// consider the remote audio "quiet enough" to re-enable the mic.
const SILENCE_RMS_THRESHOLD = 8;
const SILENCE_DWELL_MS = 180;

export interface UseMicGateOptions {
  mediaStream: MediaStream | null;
  remoteAudioElement: HTMLAudioElement | null;
  remoteAudioStream: MediaStream | null;
}

export interface MicGate {
  // Mute the outbound mic track. Called imperatively when the AI starts
  // speaking.
  mute: () => void;
  // Unmute via the normal signal-driven path. Called when the AI response
  // ends; actual unmute is deferred until the speaker tail is quiet.
  scheduleUnmute: () => void;
  // Bypass scheduling and unmute immediately. Used as a failsafe in the
  // error path.
  forceUnmute: () => void;
}

// Gates the outbound mic track on/off to prevent the AI's own speaker output
// from re-entering the mic and triggering server-side VAD hallucinations
// (the classic symptom being a ghost "¡Qué injusto!" in the middle of the
// opening greeting).
//
// Unmute is signal-driven, not timer-driven: we re-enable the mic on
// whichever of these fires first:
//   1. The <audio> element's `ended` or `pause` event.
//   2. An AnalyserNode on the remote audio track reports RMS below
//      SILENCE_RMS_THRESHOLD for SILENCE_DWELL_MS continuous milliseconds.
//   3. A fallback timer (FALLBACK_UNMUTE_MS) as a last-resort failsafe.
export function useMicGate(options: UseMicGateOptions): MicGate {
  const { mediaStream, remoteAudioElement, remoteAudioStream } = options;

  // Pending unmute bookkeeping. A single "pending" flag so concurrent
  // signals (audio ended + analyser silence) don't double-unmute.
  const pendingRef = useRef(false);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dwellStartedAtRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const analyserCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const setMicEnabled = useCallback(
    (enabled: boolean) => {
      if (!mediaStream) return;
      mediaStream.getAudioTracks().forEach((track) => {
        if (track.enabled !== enabled) {
          track.enabled = enabled;
        }
      });
    },
    [mediaStream]
  );

  const clearPending = useCallback(() => {
    pendingRef.current = false;
    dwellStartedAtRef.current = null;
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const completeUnmute = useCallback(
    (source: string) => {
      if (!pendingRef.current) return;
      debug(`useMicGate: unmuting via ${source}`);
      clearPending();
      setMicEnabled(true);
    },
    [clearPending, setMicEnabled]
  );

  const mute = useCallback(() => {
    clearPending();
    setMicEnabled(false);
  }, [clearPending, setMicEnabled]);

  const forceUnmute = useCallback(() => {
    clearPending();
    setMicEnabled(true);
  }, [clearPending, setMicEnabled]);

  // Build a fresh AnalyserNode whenever the remote audio stream identity
  // changes. We tear down the previous context to avoid leaking.
  useEffect(() => {
    if (!remoteAudioStream) return;
    let closed = false;
    try {
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(remoteAudioStream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserCtxRef.current = ctx;
      analyserRef.current = analyser;
    } catch (err) {
      debug('useMicGate: could not build remote analyser', err);
    }
    return () => {
      closed = true;
      const ctx = analyserCtxRef.current;
      analyserRef.current = null;
      analyserCtxRef.current = null;
      if (ctx) {
        ctx.close().catch(() => {
          /* ignored */
        });
      }
      void closed;
    };
  }, [remoteAudioStream]);

  // Wire up audio element events so ended/pause immediately unmute.
  useEffect(() => {
    if (!remoteAudioElement) return;
    const onEnded = () => completeUnmute('audio.ended');
    const onPause = () => completeUnmute('audio.pause');
    remoteAudioElement.addEventListener('ended', onEnded);
    remoteAudioElement.addEventListener('pause', onPause);
    return () => {
      remoteAudioElement.removeEventListener('ended', onEnded);
      remoteAudioElement.removeEventListener('pause', onPause);
    };
  }, [remoteAudioElement, completeUnmute]);

  const scheduleUnmute = useCallback(() => {
    if (pendingRef.current) return;
    pendingRef.current = true;

    // Failsafe fallback timer.
    fallbackTimerRef.current = setTimeout(() => {
      completeUnmute('fallback-timer');
    }, FALLBACK_UNMUTE_MS);

    // Analyser-based silence detection. If we have no analyser (e.g. remote
    // stream hasn't attached yet), the fallback timer is the only guarantee.
    const analyser = analyserRef.current;
    if (!analyser) return;

    const data = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      if (!pendingRef.current || !analyserRef.current) return;
      analyserRef.current.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      const rms = sum / data.length;

      if (rms <= SILENCE_RMS_THRESHOLD) {
        const now = performance.now();
        if (dwellStartedAtRef.current === null) {
          dwellStartedAtRef.current = now;
        } else if (now - dwellStartedAtRef.current >= SILENCE_DWELL_MS) {
          completeUnmute('analyser-silence');
          return;
        }
      } else {
        dwellStartedAtRef.current = null;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [completeUnmute]);

  // Cleanup pending state on unmount.
  useEffect(() => {
    return () => {
      clearPending();
    };
  }, [clearPending]);

  return { mute, scheduleUnmute, forceUnmute };
}
