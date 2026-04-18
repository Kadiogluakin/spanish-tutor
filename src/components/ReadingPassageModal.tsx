'use client';

// Short Spanish reading passage with tappable vocab glosses. Shown when the
// AI calls `request_reading_passage`. The AI is expected to read the text
// aloud in the voice channel and follow up with a comprehension question.
//
// Implementation notes:
//  - We tokenize the passage on whitespace and punctuation lightly. If a
//    token matches a `newVocab` entry (case-insensitive, ignoring trailing
//    punctuation), it becomes a button that toggles the gloss underneath.
//  - Tokenization is deliberately naive — we are not building a parser. Any
//    complex punctuation lands in the non-tappable span, which is fine.

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, X } from 'lucide-react';
import type {
  ReadingPassageGloss,
  RequestReadingPassageArgs,
} from '@/lib/realtime-tools';

interface ReadingPassageModalProps {
  isActive: boolean;
  passage: RequestReadingPassageArgs | null;
  onClose: () => void;
}

// Strip leading/trailing punctuation for matching purposes. Keeps the
// original token intact for display.
function normalizeForMatch(token: string): string {
  return token.replace(/^[¿¡"'(.,!?]+|[.,!?;:)"']+$/g, '').toLowerCase();
}

function buildGlossMap(entries: ReadingPassageGloss[] | undefined): Map<string, string> {
  const map = new Map<string, string>();
  if (!entries) return map;
  for (const e of entries) {
    if (e.spanish) {
      map.set(e.spanish.trim().toLowerCase(), e.english.trim());
    }
  }
  return map;
}

export default function ReadingPassageModal({
  isActive,
  passage,
  onClose,
}: ReadingPassageModalProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    if (isActive) setOpenIndex(null);
  }, [isActive, passage]);

  useEffect(() => {
    if (!isActive) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isActive, onClose]);

  const glossMap = useMemo(
    () => buildGlossMap(passage?.newVocab),
    [passage]
  );

  // Tokenize once per passage.
  const tokens = useMemo(() => {
    if (!passage?.text) return [] as string[];
    return passage.text.split(/(\s+)/);
  }, [passage]);

  if (!isActive || !passage) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl bg-background">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  {passage.title ?? 'Lectura corta'}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Follow along as Profesora reads. Tap any highlighted word for its English meaning.
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="px-4 py-5 rounded-lg bg-primary/5 border border-primary/20 mb-4">
            <p className="text-lg leading-relaxed text-foreground">
              {tokens.map((tok, i) => {
                if (/^\s+$/.test(tok)) return <span key={i}>{tok}</span>;
                const key = normalizeForMatch(tok);
                const gloss = glossMap.get(key);
                if (!gloss) return <span key={i}>{tok}</span>;
                const isOpen = openIndex === i;
                return (
                  <button
                    key={i}
                    onClick={() => setOpenIndex(isOpen ? null : i)}
                    className="inline underline decoration-dotted decoration-primary underline-offset-4 text-primary hover:text-primary/80 focus:outline-none"
                    title={gloss}
                  >
                    {tok}
                    {isOpen && (
                      <sup className="ml-1 text-xs text-muted-foreground not-italic">
                        ({gloss})
                      </sup>
                    )}
                  </button>
                );
              })}
            </p>
          </div>

          {passage.comprehensionQuestion && (
            <div className="px-4 py-3 rounded-lg bg-muted mb-4">
              <p className="text-sm text-muted-foreground mb-1">Pregunta:</p>
              <p className="text-base font-medium text-foreground">
                {passage.comprehensionQuestion}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Responde en voz alta a Profesora.
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={onClose} variant="outline" size="sm">
              Listo
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
