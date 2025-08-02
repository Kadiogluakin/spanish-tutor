'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ErrorItem {
  id: string;
  type: string;
  spanish: string;
  english: string;
  note: string;
  count: number;
  created_at: string;
}

interface ErrorStats {
  totalErrors: number;
  grammarErrors: number;
  vocabularyErrors: number;
  pronunciationErrors: number;
  mostFrequentErrors: ErrorItem[];
}

export default function ErrorDashboard() {
  const [errors, setErrors] = useState<ErrorItem[]>([]);
  const [stats, setStats] = useState<ErrorStats>({
    totalErrors: 0,
    grammarErrors: 0,
    vocabularyErrors: 0,
    pronunciationErrors: 0,
    mostFrequentErrors: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('all');

  useEffect(() => {
    fetchErrorData();
  }, []);

  const fetchErrorData = async () => {
    try {
      const supabase = createClient();
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch user's error logs
      const { data: errorLogs, error } = await supabase
        .from('error_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('count', { ascending: false });

      if (error) {
        console.error('Error fetching error logs:', error);
        return;
      }

      const errorList = errorLogs || [];
      setErrors(errorList);

      // Calculate statistics
      const totalErrors = errorList.reduce((sum, error) => sum + error.count, 0);
      const grammarErrors = errorList
        .filter(error => error.type === 'grammar')
        .reduce((sum, error) => sum + error.count, 0);
      const vocabularyErrors = errorList
        .filter(error => error.type === 'vocabulary')
        .reduce((sum, error) => sum + error.count, 0);
      const pronunciationErrors = errorList
        .filter(error => error.type === 'pronunciation')
        .reduce((sum, error) => sum + error.count, 0);

      setStats({
        totalErrors,
        grammarErrors,
        vocabularyErrors,
        pronunciationErrors,
        mostFrequentErrors: errorList.slice(0, 5)
      });

    } catch (error) {
      console.error('Error loading error dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredErrors = selectedType === 'all' 
    ? errors 
    : errors.filter(error => error.type === selectedType);

  const getErrorTypeColor = (type: string) => {
    switch (type) {
      case 'grammar': return 'bg-red-100 text-red-800';
      case 'vocabulary': return 'bg-blue-100 text-blue-800';
      case 'pronunciation': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getErrorTypeIcon = (type: string) => {
    switch (type) {
      case 'grammar': return '📝';
      case 'vocabulary': return '📚';
      case 'pronunciation': return '🗣️';
      default: return '❓';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          📊 Error Analysis Dashboard
        </h2>
        <button
          onClick={fetchErrorData}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{stats.totalErrors}</div>
          <div className="text-sm text-gray-600">Total Errors</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.grammarErrors}</div>
          <div className="text-sm text-red-600">Grammar</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.vocabularyErrors}</div>
          <div className="text-sm text-blue-600">Vocabulary</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.pronunciationErrors}</div>
          <div className="text-sm text-green-600">Pronunciation</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 rounded-lg p-1">
        {[
          { key: 'all', label: 'All Errors', icon: '📋' },
          { key: 'grammar', label: 'Grammar', icon: '📝' },
          { key: 'vocabulary', label: 'Vocabulary', icon: '📚' },
          { key: 'pronunciation', label: 'Pronunciation', icon: '🗣️' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setSelectedType(tab.key)}
            className={`flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              selectedType === tab.key
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="mr-1">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error List */}
      <div className="space-y-3">
        {filteredErrors.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {selectedType === 'all' ? (
              <>
                <div className="text-4xl mb-2">🎉</div>
                <div>No errors recorded yet!</div>
                <div className="text-sm">Keep practicing to track your progress.</div>
              </>
            ) : (
              <>
                <div className="text-4xl mb-2">✨</div>
                <div>No {selectedType} errors found!</div>
                <div className="text-sm">Great work in this area!</div>
              </>
            )}
          </div>
        ) : (
          filteredErrors.map(error => (
            <div
              key={error.id}
              className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{getErrorTypeIcon(error.type)}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getErrorTypeColor(error.type)}`}>
                      {error.type}
                    </span>
                    <span className="text-sm text-gray-500">
                      occurred {error.count} time{error.count > 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  <div className="mb-2">
                    <div className="font-medium text-gray-900 mb-1">
                      ❌ <span className="font-mono">{error.spanish}</span>
                    </div>
                    <div className="text-gray-600 mb-2">
                      💡 {error.english}
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
                    <div className="text-sm text-blue-800">
                      <strong>💡 Tip:</strong> {error.note}
                    </div>
                  </div>
                </div>
                
                <div className="ml-4 text-right">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-red-600">{error.count}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Most Frequent Errors Summary */}
      {stats.mostFrequentErrors.length > 0 && (
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-medium text-yellow-800 mb-3">
            🎯 Focus Areas (Most Frequent Errors)
          </h3>
          <div className="space-y-2">
            {stats.mostFrequentErrors.map((error, index) => (
              <div key={error.id} className="flex items-center justify-between text-sm">
                <span className="text-yellow-700">
                  {index + 1}. {error.spanish} ({error.type})
                </span>
                <span className="font-medium text-yellow-800">
                  {error.count}x
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}