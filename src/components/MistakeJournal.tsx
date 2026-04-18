'use client';

// Student-visible panel showing the top recurring mistakes the AI has logged.
// Sits next to the Notebook in the lesson sidebar. It is read-only: the AI
// recycles these items silently via the system prompt, and advances SM-2
// state via mark_item_reviewed. The panel's purpose is motivation —
// students see concrete progress on specific gaps.

import { useEffect, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MistakeItem {
  id: string;
  type: string;
  spanish: string;
  english: string;
  note: string;
  count: number;
  status: string;
  lastSeen: string;
  nextDue: string | null;
}

interface MistakeJournalProps {
  // When non-null, the component refetches whenever the value changes. Parent
  // should bump this on lesson completion so the panel stays fresh.
  refreshKey?: number | string | null;
  limit?: number;
}

export default function MistakeJournal({
  refreshKey = null,
  limit = 5,
}: MistakeJournalProps) {
  const [items, setItems] = useState<MistakeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/mistakes/list?limit=${limit}`);
        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }
        const data = (await response.json()) as { items?: MistakeItem[] };
        if (!cancelled) {
          setItems(data.items ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [refreshKey, limit]);

  return (
    <div className="w-full bg-slate-50 flex flex-col h-full min-h-[300px]">
      <div className="px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <span className="text-xs font-medium text-muted-foreground">
            Cosas para Repasar
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => {
            // force refresh by incrementing a local tick via a fake refreshKey
            // equivalent: just re-call load by resetting loading
            void fetch(`/api/mistakes/list?limit=${limit}`)
              .then((r) => r.json())
              .then((d) => setItems(d.items ?? []))
              .catch(() => {
                /* swallow */
              });
          }}
          title="Refresh"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Actualizar
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {loading ? (
          <div className="text-center text-gray-500 py-8 text-sm">Cargando…</div>
        ) : error ? (
          <div className="text-center text-red-600 py-8 text-sm">
            No se pudo cargar: {error}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center text-gray-500 py-8 text-sm">
            <p className="font-medium text-gray-600 mb-1">¡Sin errores aún!</p>
            <p className="text-xs">Recurring mistakes will appear here.</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-xl border-l-4 shadow-sm bg-amber-50 border-l-amber-500"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs uppercase tracking-wide text-amber-700 font-semibold">
                      {item.type}
                    </span>
                    <span className="text-xs text-gray-500">× {item.count}</span>
                    {item.status === 'improved' && (
                      <span className="text-xs text-green-700 bg-green-100 px-1.5 py-0.5 rounded">
                        improved
                      </span>
                    )}
                  </div>
                  <div className="text-sm">
                    <span className="line-through text-red-600/80">
                      {item.spanish}
                    </span>
                    <span className="mx-2 text-gray-400">→</span>
                    <span className="text-green-700 font-medium">
                      {item.english}
                    </span>
                  </div>
                  {item.note && (
                    <p className="text-xs text-gray-600 mt-1 italic">
                      {item.note}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
