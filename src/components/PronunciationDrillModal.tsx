'use client';

// Visual companion to the voice channel for pronunciation drills. The actual
// audio modeling and feedback happen through the Realtime AI — this modal
// provides the student a clear visual anchor for what they're practicing:
//   - the Spanish items (large, with stress marks preserved)
//   - a short English description of the target phoneme/rule
//   - pronunciation hints (IPA-ish simplifications tailored to English
//     speakers) when we can generate them from the drill type
//   - a dismiss button for when the drill is done
//
// The modal is intentionally light: the AI is still driving the drill in
// speech; we are not trying to re-implement a pronunciation grader.

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Volume2, X } from 'lucide-react';
import type {
  PronunciationDrillType,
  RequestPronunciationDrillArgs,
} from '@/lib/realtime-tools';

interface PronunciationDrillModalProps {
  isActive: boolean;
  drill: RequestPronunciationDrillArgs | null;
  onClose: () => void;
}

// Plain-English hint text for each supported drill type. Shown under the
// Spanish tokens so the student knows what to listen for.
function getDrillHint(drillType: PronunciationDrillType, target: string): string {
  switch (drillType) {
    case 'minimal-pairs':
      return `Two words that differ by ONE sound. Listen for: ${target}.`;
    case 'vowel-purity':
      return `Spanish vowels are pure and short — no glide like in English "day" or "low". Say each vowel crisp and single. Target: ${target}.`;
    case 'stress':
      return `Stress the marked (or last) syllable firmly. Target: ${target}.`;
    case 'rolled-rr':
      return `Trill the tongue tip against the ridge behind your upper teeth. Single "r" (pero) is one tap; "rr" (perro) is a rolled trill. Target: ${target}.`;
    case 'silent-h':
      return `The letter "h" is always silent in Spanish. "Hola" sounds like "oh-lah". Target: ${target}.`;
    case 'soft-d':
      return `Between vowels, "d" becomes a soft "th" like in English "this". Target: ${target}.`;
    default:
      return target;
  }
}

function getDrillLabel(drillType: PronunciationDrillType): string {
  switch (drillType) {
    case 'minimal-pairs':
      return 'Minimal Pairs';
    case 'vowel-purity':
      return 'Vowel Purity';
    case 'stress':
      return 'Stress';
    case 'rolled-rr':
      return 'Rolled RR';
    case 'silent-h':
      return 'Silent H';
    case 'soft-d':
      return 'Soft D';
  }
}

export default function PronunciationDrillModal({
  isActive,
  drill,
  onClose,
}: PronunciationDrillModalProps) {
  // Close on Escape for keyboard users.
  useEffect(() => {
    if (!isActive) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isActive, onClose]);

  if (!isActive || !drill) return null;

  const { drillType, items, target } = drill;
  const hint = getDrillHint(drillType, target);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-lg bg-background">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-primary" />
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  Pronunciación: {getDrillLabel(drillType)}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Listen to Profesora and repeat each item.
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-2 mb-4">
            {items.map((item, i) => (
              <div
                key={`${item}-${i}`}
                className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary/5 border border-primary/20"
              >
                <span className="text-xs font-mono text-primary/80 w-6">
                  {i + 1}
                </span>
                <span className="text-xl font-semibold text-foreground">
                  {item}
                </span>
              </div>
            ))}
          </div>

          <div className="px-4 py-3 rounded-lg bg-muted text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Tip:</span> {hint}
          </div>

          <div className="mt-4 flex justify-end">
            <Button onClick={onClose} variant="outline" size="sm">
              Listo
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
