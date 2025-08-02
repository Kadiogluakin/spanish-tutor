import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * API endpoint to get user context for AI integration
 * This provides personal information to the AI teacher
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error getting user context:', error);
      return NextResponse.json({ error: 'Failed to get user context' }, { status: 500 });
    }

    // Format context for AI
    const userContext = {
      hasProfile: !!profile,
      name: profile?.name || null,
      age: profile?.age || null,
      nativeLanguage: profile?.native_language || null,
      learningGoals: profile?.learning_goals || null,
      interests: profile?.interests || null,
      occupation: profile?.occupation || null,
      location: profile?.location || null,
      cefrLevel: profile?.level_cefr || 'A1'
    };

    return NextResponse.json({ userContext });

  } catch (error) {
    console.error('Error in user context API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * API endpoint to update user context from AI interactions
 * This allows the AI to populate user info discovered during lessons
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { discoveredInfo, source } = body;

    // Only update fields that are currently empty
    const { data: currentProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    const updates: any = {
      updated_at: new Date().toISOString()
    };

    // Only add discovered info if current field is empty
    if (discoveredInfo.name && !currentProfile?.name) {
      updates.name = discoveredInfo.name;
    }
    if (discoveredInfo.age && !currentProfile?.age) {
      updates.age = discoveredInfo.age;
    }
    if (discoveredInfo.occupation && !currentProfile?.occupation) {
      updates.occupation = discoveredInfo.occupation;
    }
    if (discoveredInfo.location && !currentProfile?.location) {
      updates.location = discoveredInfo.location;
    }
    if (discoveredInfo.interests && !currentProfile?.interests) {
      updates.interests = discoveredInfo.interests;
    }

    // Only update if there are actual changes
    if (Object.keys(updates).length > 1) { // > 1 because updated_at is always there
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          ...updates
        });

      if (error) {
        console.error('Error updating user context:', error);
        return NextResponse.json({ error: 'Failed to update user context' }, { status: 500 });
      }

      return NextResponse.json({
        message: 'User context updated from lesson',
        updatedFields: Object.keys(updates).filter(key => key !== 'updated_at'),
        source
      });
    }

    return NextResponse.json({
      message: 'No new information to update'
    });

  } catch (error) {
    console.error('Error updating user context:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}