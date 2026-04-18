'use client';

import { useEffect, useState } from 'react';

// Tracks the instantaneous volume level of the local mic for the UI meter.
// Builds its own AudioContext + AnalyserNode so it stays independent from the
// remote-audio analyser used by useMicGate.
export function useMicLevel(mediaStream: MediaStream | null): number {
  const [level, setLevel] = useState(0);

  useEffect(() => {
    if (!mediaStream) {
      setLevel(0);
      return;
    }

    let cancelled = false;
    let rafId: number | null = null;
    let ctx: AudioContext | null = null;

    try {
      ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(mediaStream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        if (cancelled) return;
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        setLevel(sum / data.length);
        rafId = requestAnimationFrame(tick);
      };

      rafId = requestAnimationFrame(tick);
    } catch {
      // If the browser denies analyser creation for some reason, just keep
      // level at 0 — the meter will simply not move.
    }

    return () => {
      cancelled = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (ctx) ctx.close().catch(() => undefined);
    };
  }, [mediaStream]);

  return level;
}
