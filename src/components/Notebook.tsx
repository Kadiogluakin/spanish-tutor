'use client';

import { useState, useEffect } from 'react';

interface NotebookEntry {
  id: string;
  text: string;
  timestamp: Date;
  type: 'vocabulary' | 'note' | 'title';
}

interface NotebookProps {
  entries: NotebookEntry[];
  onClear?: () => void;
}

export default function Notebook({ entries, onClear }: NotebookProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-full bg-slate-50 animate-pulse h-64 rounded-xl" />;
  }

  return (
    <div className="w-full bg-slate-50 flex flex-col h-full min-h-[500px] max-h-[700px]">
      <div className="border-b bg-white px-6 py-4 flex items-center justify-between">
        <h2 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
          Profesora&apos;s Notes
        </h2>
        {entries.length > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-gray-500 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors font-medium"
            title="Clear all notes"
          >
            🗑️ Clear
          </button>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {entries.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <div className="text-5xl mb-4">📝</div>
            <p className="text-base font-medium text-gray-600 mb-1">Ready for notes!</p>
            <p className="text-sm text-gray-500">Profesora Elena will write</p>
            <p className="text-sm text-gray-500">vocabulary and notes here</p>
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className={`p-4 rounded-xl border-l-4 shadow-sm transition-all hover:shadow-md ${
                entry.type === 'title'
                  ? 'bg-blue-50 border-l-blue-500 hover:bg-blue-100'
                  : entry.type === 'vocabulary'
                  ? 'bg-green-50 border-l-green-500 hover:bg-green-100'
                  : 'bg-gray-50 border-l-gray-500 hover:bg-gray-100'
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
                      ✨ New Vocabulary
                    </div>
                  )}
                  
                  {entry.type === 'title' && (
                    <div className="mt-2 text-xs text-blue-600 flex items-center gap-1 font-medium">
                      📖 Lesson Topic
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
      
      {entries.length > 0 && (
        <div className="border-t bg-white px-6 py-3 text-xs text-gray-500 text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="font-medium">{entries.length} note{entries.length !== 1 ? 's' : ''}</span>
            <span>•</span> 
            <span>Spanish lesson with Profesora Elena</span>
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