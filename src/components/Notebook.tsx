'use client';

import { Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface NotebookEntry {
  id: string;
  text: string;
  timestamp: Date;
  type: 'vocabulary' | 'note' | 'title';
}

interface NotebookProps {
  entries: NotebookEntry[];
  onClear?: () => void;
  /** Fits inside lesson sidebar: no huge min-height, parent controls scroll. */
  embedded?: boolean;
}

export default function Notebook({ entries, onClear, embedded = false }: NotebookProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={`w-full bg-muted/40 animate-pulse rounded-lg ${
          embedded ? 'h-36' : 'h-64'
        }`}
      />
    );
  }

  const shell = embedded
    ? 'w-full flex flex-col h-full min-h-0 max-h-full bg-muted/15'
    : 'w-full bg-slate-50 flex flex-col h-full min-h-[500px] max-h-[700px]';

  return (
    <div className={shell}>
      <div
        className={`flex items-center justify-between ${
          embedded ? 'px-4 py-2 border-b border-border/50' : 'px-6 py-3'
        }`}
      >
        {!embedded && (
          <span className="text-xs font-medium text-muted-foreground">
            Notebook
          </span>
        )}
        {embedded ? (
          <span className="text-[11px] text-muted-foreground">
            {entries.length} entrada{entries.length !== 1 ? 's' : ''}
          </span>
        ) : null}
        {entries.length > 0 && (
          <Button
            onClick={onClear}
            variant="outline"
            size="sm"
            className="text-xs ml-auto"
            title="Clear all notes"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Limpiar
          </Button>
        )}
      </div>

      <div
        className={`flex-1 min-h-0 overflow-y-auto space-y-3 ${
          embedded ? 'p-3' : 'p-6 space-y-4'
        }`}
      >
        {entries.length === 0 ? (
          <div
            className={`text-center text-muted-foreground ${
              embedded ? 'py-8 px-2' : 'py-12'
            }`}
          >
            {!embedded && (
              <div className="w-16 h-16 bg-muted rounded-full mx-auto mb-4 flex items-center justify-center">
                <div className="w-8 h-8 bg-muted-foreground/20 rounded" />
              </div>
            )}
            <p className="text-sm font-medium text-foreground mb-1">
              {embedded ? 'Todavía no hay notas' : 'Ready for notes!'}
            </p>
            <p className="text-xs leading-relaxed">
              {embedded
                ? 'La profesora va a agregar vocabulario y notas acá durante la clase.'
                : 'Profesora Milagros will write vocabulary and notes here'}
            </p>
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className={`p-4 rounded-xl border-l-4 shadow-sm ${
                entry.type === 'title'
                  ? 'bg-blue-50 border-l-blue-500'
                  : entry.type === 'vocabulary'
                  ? 'bg-green-50 border-l-green-500'
                  : 'bg-gray-50 border-l-gray-500'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <span
                    className={`font-semibold block break-words ${
                      entry.type === 'title'
                        ? 'text-blue-800 text-lg'
                        : entry.type === 'vocabulary'
                        ? 'text-green-800 text-base'
                        : 'text-gray-800 text-sm'
                    }`}
                  >
                    {entry.text}
                  </span>
                  
                  {entry.type === 'vocabulary' && (
                    <div className="mt-2 text-xs text-green-600 flex items-center gap-1 font-medium">
                      New Vocabulary
                    </div>
                  )}
                  
                  {entry.type === 'title' && (
                    <div className="mt-2 text-xs text-blue-600 flex items-center gap-1 font-medium">
                      Lesson Topic
                    </div>
                  )}
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0 bg-white/50 px-2 py-1 rounded-full">
                  {entry.timestamp.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
      
      {entries.length > 0 && !embedded && (
        <div className="border-t bg-white px-6 py-3 text-xs text-gray-500 text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="font-medium">
              {entries.length} note{entries.length !== 1 ? 's' : ''}
            </span>
            <span>•</span>
            <span>Spanish lesson with Profesora Milagros</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to determine entry type from text
export function categorizeNote(text: string): NotebookEntry['type'] {
  const lowerText = text.toLowerCase();
  
  // Check if it's a title (all caps, contains certain keywords, or has special chars)
  if (text === text.toUpperCase() && text.length > 2) return 'title';
  if (lowerText.includes('tema:') || lowerText.includes('lección:')) return 'title';
  if (lowerText.includes('días de la semana') || lowerText.includes('números')) return 'title';
  if (lowerText.includes('voseo') || lowerText.includes('gramática')) return 'title';
  
  // Check if it's Argentine vocabulary (porteño words and expressions)
  const argentineWords = [
    'che', 'boludo', 'pibe', 'piba', 'laburo', 'guita', 'plata', 'bondi', 'subte',
    'departamento', 'pochoclo', 'pilcha', 'morfar', 'mina', 'chabón', 'copado',
    'bárbaro', 'golazo', 'joda', 'quilombo', 'chamuyar', 'fiaca', 'bronca'
  ];
  
  const hasArgentineWord = argentineWords.some(word => lowerText.includes(word));
  if (hasArgentineWord) return 'vocabulary';
  
  // Check if it's vocabulary (single words, common vocabulary patterns)
  if (text.split(' ').length <= 2 && text.length > 2) return 'vocabulary';
  
  // Voseo conjugations
  if (lowerText.includes('tenés') || lowerText.includes('querés') || lowerText.includes('podés') || 
      lowerText.includes('andás') || lowerText.includes('sabés')) return 'vocabulary';
  
  // Everything else is a general note
  return 'note';
}