'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/app/providers';
import Link from 'next/link';

interface LessonSummary {
  A1: number;
  A2: number;
  B1: number;
  completed: number;
  total: number;
}

export default function LessonCatalogPreview() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<LessonSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchLessonSummary();
    }
  }, [user]);

  const fetchLessonSummary = async () => {
    try {
      const response = await fetch('/api/lessons');
      if (response.ok) {
        const data = await response.json();
        setSummary({
          ...data.summary,
          total: data.total
        });
      }
    } catch (error) {
      console.error('Error fetching lesson summary:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-6 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="text-2xl">📖</div>
            <div>
              <div className="h-5 bg-purple-200 rounded w-28 mb-1"></div>
              <div className="h-4 bg-purple-100 rounded w-36"></div>
            </div>
          </div>
          <div className="px-4 py-2 bg-purple-200 rounded-lg w-20 h-8"></div>
        </div>
        
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center p-2 bg-white/50 rounded-lg">
            <div className="h-6 bg-purple-200 rounded w-6 mx-auto mb-1"></div>
            <div className="h-3 bg-purple-100 rounded w-4 mx-auto"></div>
          </div>
          <div className="text-center p-2 bg-white/50 rounded-lg">
            <div className="h-6 bg-purple-200 rounded w-6 mx-auto mb-1"></div>
            <div className="h-3 bg-purple-100 rounded w-4 mx-auto"></div>
          </div>
          <div className="text-center p-2 bg-white/50 rounded-lg">
            <div className="h-6 bg-purple-200 rounded w-6 mx-auto mb-1"></div>
            <div className="h-3 bg-purple-100 rounded w-4 mx-auto"></div>
          </div>
          <div className="text-center p-2 bg-white/50 rounded-lg">
            <div className="h-6 bg-purple-200 rounded w-6 mx-auto mb-1"></div>
            <div className="h-3 bg-purple-100 rounded w-4 mx-auto"></div>
          </div>
        </div>
        
        <div className="mt-3 h-3 bg-purple-100 rounded w-56"></div>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-2xl">📖</div>
          <div>
            <h3 className="font-semibold text-purple-800">Lesson Catalog</h3>
            <p className="text-sm text-purple-600">
              {summary.total} lessons across {summary.A1 + summary.A2 + summary.B1 > 0 ? 'A1-B1' : 'all'} levels
            </p>
          </div>
        </div>
        <Link 
          href="/lessons"
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium text-sm"
        >
          Browse All
        </Link>
      </div>
      
      <div className="grid grid-cols-4 gap-3">
        <div className="text-center p-2 bg-white/50 rounded-lg">
          <div className="text-lg font-bold text-purple-800">{summary.A1}</div>
          <div className="text-xs text-purple-600">A1</div>
        </div>
        <div className="text-center p-2 bg-white/50 rounded-lg">
          <div className="text-lg font-bold text-purple-800">{summary.A2}</div>
          <div className="text-xs text-purple-600">A2</div>
        </div>
        <div className="text-center p-2 bg-white/50 rounded-lg">
          <div className="text-lg font-bold text-purple-800">{summary.B1}</div>
          <div className="text-xs text-purple-600">B1</div>
        </div>
        <div className="text-center p-2 bg-white/50 rounded-lg">
          <div className="text-lg font-bold text-green-800">{summary.completed}</div>
          <div className="text-xs text-green-600">Done</div>
        </div>
      </div>
      
      <div className="mt-3 text-xs text-purple-600">
        💡 Browse any lesson, any level - go at your own pace!
      </div>
    </div>
  );
}