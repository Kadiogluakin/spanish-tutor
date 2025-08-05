// Secure Placement Analytics Library
// TypeScript interfaces and functions for accessing placement exam analytics

import { createClient } from '@/lib/supabase/client';

// Type definitions for analytics data
export interface PlacementAnalytics {
  recommended_level: string;
  total_exams: number;
  avg_confidence: number;
  avg_completion_rate: number;
  avg_duration_minutes: number;
  most_common_strength: string | null;
  most_common_weakness: string | null;
  month: string;
}

export interface PlacementSummary {
  total_exams: number;
  avg_confidence: number;
  level_distribution: Record<string, number>;
  recent_activity: {
    last_7_days: number;
    last_30_days: number;
    last_90_days: number;
  };
}

export interface PlacementAnalyticsError {
  error: string;
  isPermissionError?: boolean;
}

export type PlacementAnalyticsResult<T> = 
  | { data: T; error: null }
  | { data: null; error: PlacementAnalyticsError };

/**
 * Get comprehensive placement analytics data
 * Requires admin role
 */
export async function getPlacementAnalytics(
  startDate?: Date,
  endDate?: Date
): Promise<PlacementAnalyticsResult<PlacementAnalytics[]>> {
  try {
    const supabase = createClient();
    
    // Call the secure analytics function
    const { data, error } = await supabase.rpc('get_placement_analytics', {
      start_date: startDate?.toISOString() || undefined,
      end_date: endDate?.toISOString() || undefined
    });

    if (error) {
      console.error('Placement analytics error:', error);
      
      // Check if it's a permission error
      const isPermissionError = error.message?.includes('Access denied') || 
                               error.message?.includes('Admin role required');
      
      return {
        data: null,
        error: {
          error: error.message || 'Failed to fetch placement analytics',
          isPermissionError
        }
      };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('Unexpected error in getPlacementAnalytics:', err);
    return {
      data: null,
      error: {
        error: 'An unexpected error occurred',
        isPermissionError: false
      }
    };
  }
}

/**
 * Get placement summary statistics
 * Requires admin role
 */
export async function getPlacementSummary(): Promise<PlacementAnalyticsResult<PlacementSummary>> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase.rpc('get_placement_summary');

    if (error) {
      console.error('Placement summary error:', error);
      
      const isPermissionError = error.message?.includes('Access denied') || 
                               error.message?.includes('Admin role required');
      
      return {
        data: null,
        error: {
          error: error.message || 'Failed to fetch placement summary',
          isPermissionError
        }
      };
    }

    // The function returns an array with a single object, extract it
    const summary = Array.isArray(data) ? data[0] : data;
    
    return { data: summary || null, error: null };
  } catch (err) {
    console.error('Unexpected error in getPlacementSummary:', err);
    return {
      data: null,
      error: {
        error: 'An unexpected error occurred',
        isPermissionError: false
      }
    };
  }
}

/**
 * Get placement analytics using the secure view (alternative method)
 * Requires admin role
 */
export async function getPlacementAnalyticsFromView(): Promise<PlacementAnalyticsResult<PlacementAnalytics[]>> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('placement_analytics_secure')
      .select('*')
      .order('month', { ascending: false })
      .order('recommended_level');

    if (error) {
      console.error('Placement analytics view error:', error);
      
      return {
        data: null,
        error: {
          error: error.message || 'Failed to fetch placement analytics from view',
          isPermissionError: true // View access implies permission issues
        }
      };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('Unexpected error in getPlacementAnalyticsFromView:', err);
    return {
      data: null,
      error: {
        error: 'An unexpected error occurred',
        isPermissionError: false
      }
    };
  }
}

/**
 * Check if current user has admin access to analytics
 */
export async function hasAnalyticsAccess(): Promise<boolean> {
  try {
    const supabase = createClient();
    
    // Try to get user profile and check role
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (error || !profile) return false;
    
    return profile.role === 'admin';
  } catch (err) {
    console.error('Error checking analytics access:', err);
    return false;
  }
}

/**
 * Utility function to format analytics data for charts/display
 */
export function formatAnalyticsForDisplay(analytics: PlacementAnalytics[]) {
  return {
    // Group by level for overview
    byLevel: analytics.reduce((acc, item) => {
      if (!acc[item.recommended_level]) {
        acc[item.recommended_level] = {
          total_exams: 0,
          avg_confidence: 0,
          months: []
        };
      }
      
      acc[item.recommended_level].total_exams += item.total_exams;
      acc[item.recommended_level].months.push({
        month: item.month,
        exams: item.total_exams,
        confidence: item.avg_confidence
      });
      
      return acc;
    }, {} as Record<string, { total_exams: number; avg_confidence: number; months: any[] }>),
    
    // Monthly trend data
    monthlyTrend: analytics.map(item => ({
      ...item,
      monthFormatted: new Date(item.month).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      })
    })),
    
    // Summary stats
    totals: {
      total_exams: analytics.reduce((sum, item) => sum + item.total_exams, 0),
      avg_confidence: Math.round(
        analytics.reduce((sum, item) => sum + item.avg_confidence, 0) / analytics.length
      ),
      levels_covered: [...new Set(analytics.map(item => item.recommended_level))].length
    }
  };
}