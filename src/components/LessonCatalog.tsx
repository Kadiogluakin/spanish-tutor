'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/app/providers';
import Link from 'next/link';

interface LessonData {
  id: string;
  title: string;
  cefr: string;
  unit: number;
  lesson: number;
  objectives: string[];
  content_refs: {
    difficulty: number;
    estimatedDuration: number;
    vocabularyCount: number;
    prerequisites?: string[];
  };
  isCompleted: boolean;
  completedAt?: string;
}

interface LessonSummary {
  A1: number;
  A2: number;
  B1: number;
  completed: number;
}

interface ApiResponse {
  lessons: LessonData[];
  grouped: Record<string, Record<number, LessonData[]>>;
  total: number;
  summary: LessonSummary;
}

export default function LessonCatalog() {
  const { user } = useAuth();
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [showCompleted, setShowCompleted] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    if (user) {
      fetchLessons();
    }
  }, [user, selectedLevel, selectedUnit, showCompleted, searchTerm]);

  const fetchLessons = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedLevel !== 'all') params.append('level', selectedLevel);
      if (selectedUnit !== 'all') params.append('unit', selectedUnit);
      if (showCompleted !== 'all') params.append('completed', showCompleted);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/lessons?${params}`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      } else {
        console.error('Failed to fetch lessons');
      }
    } catch (error) {
      console.error('Error fetching lessons:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLessonStart = (lessonId: string) => {
    // Store selected lesson in localStorage to override recommendation
    localStorage.setItem('selectedLessonId', lessonId);
    console.log('🎯 Selected custom lesson:', lessonId);
    // Navigate to lesson page
    window.location.href = '/lesson';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading lesson catalog...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-2">⚠️ Unable to load lessons</div>
        <button 
          onClick={fetchLessons}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  const levels = ['A1', 'A2', 'B1'];
  const units = [1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl text-white p-6">
        <h1 className="text-3xl font-bold mb-2">📚 Lesson Catalog</h1>
        <p className="text-blue-100 mb-4">
          Browse and select any lesson to practice - go at your own pace!
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/20 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{data.summary.A1}</div>
            <div className="text-sm text-blue-100">A1 Beginner</div>
          </div>
          <div className="bg-white/20 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{data.summary.A2}</div>
            <div className="text-sm text-blue-100">A2 Elementary</div>
          </div>
          <div className="bg-white/20 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{data.summary.B1}</div>
            <div className="text-sm text-blue-100">B1 Intermediate</div>
          </div>
          <div className="bg-white/20 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{data.summary.completed}</div>
            <div className="text-sm text-blue-100">Completed</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-4">
            {/* Level Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Levels</option>
                {levels.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>

            {/* Unit Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Units</option>
                {units.map(unit => (
                  <option key={unit} value={unit.toString()}>Unit {unit}</option>
                ))}
              </select>
            </div>

            {/* Completion Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Progress</label>
              <select
                value={showCompleted}
                onChange={(e) => setShowCompleted(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Lessons</option>
                <option value="false">Not Started</option>
                <option value="true">Completed</option>
              </select>
            </div>
          </div>

          {/* Search and View Controls */}
          <div className="flex gap-3 items-center">
            <input
              type="text"
              placeholder="Search lessons..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-48"
            />
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
              >
                ⊞
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
              >
                ☰
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-600">
        Showing {data.lessons.length} of {data.total} lessons
      </div>

      {/* Lessons Display */}
      {viewMode === 'grid' ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.lessons.map((lesson) => (
            <LessonCard key={lesson.id} lesson={lesson} onStart={handleLessonStart} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {data.lessons.map((lesson) => (
            <LessonRow key={lesson.id} lesson={lesson} onStart={handleLessonStart} />
          ))}
        </div>
      )}

      {data.lessons.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No lessons found</h3>
          <p className="text-gray-600">Try adjusting your filters or search term</p>
        </div>
      )}
    </div>
  );
}

function LessonCard({ lesson, onStart }: { lesson: LessonData; onStart: (id: string) => void }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border-2 transition-all duration-200 hover:shadow-md ${
      lesson.isCompleted ? 'border-green-200 bg-green-50/30' : 'border-gray-200 hover:border-blue-300'
    }`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
              lesson.cefr === 'A1' ? 'bg-green-100 text-green-800' :
              lesson.cefr === 'A2' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {lesson.cefr}
            </span>
            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
              Unit {lesson.unit}.{lesson.lesson}
            </span>
          </div>
          {lesson.isCompleted && (
            <div className="text-green-600 text-xl">✅</div>
          )}
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
          {lesson.title}
        </h3>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
          <div>⏱️ {lesson.content_refs.estimatedDuration}min</div>
          <div>📚 {lesson.content_refs.vocabularyCount} words</div>
          <div>⭐ {lesson.content_refs.difficulty}/10</div>
        </div>

        {/* Objectives Preview */}
        <div className="mb-4">
          <div className="text-xs font-medium text-gray-700 mb-1">Objectives:</div>
          <ul className="text-xs text-gray-600 space-y-1">
            {lesson.objectives.slice(0, 2).map((obj, idx) => (
              <li key={idx} className="flex items-start gap-1">
                <span className="text-blue-500 mt-0.5">•</span>
                <span className="line-clamp-1">{obj}</span>
              </li>
            ))}
            {lesson.objectives.length > 2 && (
              <li className="text-gray-400">+{lesson.objectives.length - 2} more...</li>
            )}
          </ul>
        </div>

        {/* Action Button */}
        <button
          onClick={() => onStart(lesson.id)}
          className={`w-full py-3 rounded-lg font-semibold transition-colors ${
            lesson.isCompleted
              ? 'bg-green-100 text-green-800 hover:bg-green-200'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {lesson.isCompleted ? '🔄 Review Lesson' : '🚀 Start Lesson'}
        </button>
      </div>
    </div>
  );
}

function LessonRow({ lesson, onStart }: { lesson: LessonData; onStart: (id: string) => void }) {
  return (
    <div className={`bg-white rounded-lg border-2 p-4 transition-all duration-200 hover:shadow-sm ${
      lesson.isCompleted ? 'border-green-200 bg-green-50/30' : 'border-gray-200 hover:border-blue-300'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
              lesson.cefr === 'A1' ? 'bg-green-100 text-green-800' :
              lesson.cefr === 'A2' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {lesson.cefr}
            </span>
            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
              Unit {lesson.unit}.{lesson.lesson}
            </span>
            <h3 className="font-semibold text-gray-900">{lesson.title}</h3>
            {lesson.isCompleted && <span className="text-green-600">✅</span>}
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <div>⏱️ {lesson.content_refs.estimatedDuration}min</div>
            <div>📚 {lesson.content_refs.vocabularyCount} words</div>
            <div>⭐ {lesson.content_refs.difficulty}/10</div>
          </div>
        </div>
        <button
          onClick={() => onStart(lesson.id)}
          className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
            lesson.isCompleted
              ? 'bg-green-100 text-green-800 hover:bg-green-200'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {lesson.isCompleted ? 'Review' : 'Start'}
        </button>
      </div>
    </div>
  );
}