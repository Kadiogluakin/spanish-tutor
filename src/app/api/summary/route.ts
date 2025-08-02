// Enhanced session summarization API for Phase 5
// Generates AI-powered session summaries and persists data to database

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';

interface SummaryRequest {
  sessionId?: string;
  lessonId?: string;
  transcript: string;
  mistakes?: string[];
  duration?: number;
  notebookEntries?: Array<{
    text: string;
    type: 'vocabulary' | 'note' | 'title';
  }>;
}

interface AIResponse {
  summary: string;
  top_errors: Array<{
    type: 'grammar' | 'vocabulary' | 'pronunciation';
    spanish: string;
    english: string;
    note: string;
  }>;
  next_focus: string[];
  srs_add: Array<{
    spanish: string;
    english: string;
    tags: string[];
  }>;
  skill_assessment: {
    grammar: number;
    vocabulary: number;
    pronunciation: number;
    fluency: number;
  };
  discovered_profile?: {
    name?: string;
    age?: number;
    occupation?: string;
    location?: string;
    interests?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    // Get the current user from Supabase
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = user.id;
    const body: SummaryRequest = await request.json();
    const { sessionId, lessonId, transcript, mistakes, duration, notebookEntries } = body;

    if (!transcript) {
      return NextResponse.json(
        { error: 'Transcript is required' },
        { status: 400 }
      );
    }

    // Enhanced AI prompt for comprehensive session analysis
    const system = `You are Profesora Elena, an expert Spanish teacher analyzing a student's lesson session.

Analyze the lesson transcript and provide a comprehensive JSON response with:
1. A concise but insightful summary focusing on learning progress
2. Top errors with specific corrections and explanations
3. Focus areas for next lessons
4. New vocabulary words to add to spaced repetition
5. Skill assessment scores (0-10 scale)
6. Personal information discovered about the student during conversation

Return JSON format:
{
  "summary": "Brief lesson summary highlighting key learning moments",
  "top_errors": [
    {
      "type": "grammar|vocabulary|pronunciation",
      "spanish": "incorrect phrase",
      "english": "translation/explanation", 
      "note": "specific correction advice"
    }
  ],
  "next_focus": ["area1", "area2", "area3"],
  "srs_add": [
    {
      "spanish": "palabra",
      "english": "word",
      "tags": ["lesson", "difficulty_level"]
    }
  ],
  "skill_assessment": {
    "grammar": 0-10,
    "vocabulary": 0-10, 
    "pronunciation": 0-10,
    "fluency": 0-10
  },
  "discovered_profile": {
    "name": "student's name if mentioned, otherwise null",
    "age": "student's age if mentioned, otherwise null", 
    "occupation": "student's job/profession if discussed, otherwise null",
    "location": "student's city/country if mentioned, otherwise null",
    "interests": "hobbies/interests mentioned, otherwise null"
  }
}`;

    const userPrompt = `LESSON TRANSCRIPT:
${transcript}

COMMON MISTAKES (if any):
${JSON.stringify(mistakes || [])}

NOTEBOOK ENTRIES:
${JSON.stringify(notebookEntries || [])}

LESSON DURATION: ${duration || 'Not specified'} minutes

Please analyze this Spanish lesson session and provide comprehensive feedback for the student's progress.`;

    // Call OpenAI API
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.TEXT_MODEL || 'gpt-4o-mini';
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const aiResult = await response.json();
    const aiContent = aiResult?.choices?.[0]?.message?.content;
    
    if (!aiContent) {
      throw new Error('No content received from OpenAI');
    }

    const aiResponse: AIResponse = JSON.parse(aiContent);

    // Update session with summary
    if (sessionId) {
      const { error: sessionUpdateError } = await supabase
        .from('learning_sessions')
        .update({
          summary: aiResponse.summary,
          duration_min: duration
        })
        .eq('id', sessionId)
        .eq('user_id', userId);

      if (sessionUpdateError) {
        console.error('Error updating session:', sessionUpdateError);
      }
    }

    // Add new vocabulary to database
    for (const vocab of aiResponse.srs_add) {
      const vocabId = uuidv4();
      
      // Check if vocabulary already exists
      const { data: existingVocab } = await supabase
        .from('vocabulary')
        .select('id')
        .eq('spanish', vocab.spanish)
        .single();

      if (!existingVocab) {
        const { error: vocabError } = await supabase
          .from('vocabulary')
          .insert({
            id: vocabId,
            spanish: vocab.spanish,
            english: vocab.english,
            tags: {
              tags: vocab.tags,
              lesson: lessonId,
              difficulty: 1,
              source: 'session_analysis'
            }
          });

        if (vocabError) {
          console.error('Error adding vocabulary:', vocabError);
        }
      }
    }

    // Store error analysis in error_logs table
    let errorsLogged = 0;
    for (const error of aiResponse.top_errors) {
      try {
        // Check if this error already exists for this user
        const { data: existingError } = await supabase
          .from('error_logs')
          .select('id, count')
          .eq('user_id', userId)
          .eq('spanish', error.spanish)
          .eq('type', error.type)
          .single();

        if (existingError) {
          // Update count if error exists
          await supabase
            .from('error_logs')
            .update({ count: existingError.count + 1 })
            .eq('id', existingError.id);
          errorsLogged++;
        } else {
          // Insert new error
          await supabase
            .from('error_logs')
            .insert({
              user_id: userId,
              session_id: sessionId,
              type: error.type,
              spanish: error.spanish,
              english: error.english,
              note: error.note,
              count: 1
            });
          errorsLogged++;
        }
      } catch (errorLogError) {
        console.error('Error logging mistake:', errorLogError);
        // Continue processing other errors even if one fails
      }
    }

    // Update user profile with discovered information
    if (aiResponse.discovered_profile) {
      try {
        const profileInfo = aiResponse.discovered_profile;
        
        // Only update if there's actual information discovered
        const hasInfo = profileInfo.name || profileInfo.age || profileInfo.occupation || 
                       profileInfo.location || profileInfo.interests;
        
        if (hasInfo) {
          // Get current profile to only update empty fields
          const { data: currentProfile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', userId)
            .single();

          const updates: any = {
            updated_at: new Date().toISOString()
          };

          // Only add discovered info if current field is empty
          if (profileInfo.name && !currentProfile?.name) {
            updates.name = profileInfo.name;
          }
          if (profileInfo.age && !currentProfile?.age) {
            updates.age = profileInfo.age;
          }
          if (profileInfo.occupation && !currentProfile?.occupation) {
            updates.occupation = profileInfo.occupation;
          }
          if (profileInfo.location && !currentProfile?.location) {
            updates.location = profileInfo.location;
          }
          if (profileInfo.interests && !currentProfile?.interests) {
            updates.interests = profileInfo.interests;
          }

          // Only update if there are actual changes
          if (Object.keys(updates).length > 1) { // > 1 because updated_at is always there
            const { error: profileUpdateError } = await supabase
              .from('user_profiles')
              .upsert({
                id: userId,
                ...updates
              });

            if (profileUpdateError) {
              console.error('Error updating user profile:', profileUpdateError);
            } else {
              console.log('Profile updated from lesson conversation:', Object.keys(updates).filter(key => key !== 'updated_at'));
            }
          }
        }
      } catch (profileError) {
        console.error('Error updating profile from conversation:', profileError);
        // Don't fail the summary if profile update fails
      }
    }

    return NextResponse.json({
      success: true,
      summary: aiResponse.summary,
      errors: aiResponse.top_errors,
      errorsLogged: errorsLogged,
      nextFocus: aiResponse.next_focus,
      newVocabulary: aiResponse.srs_add,
      skillAssessment: aiResponse.skill_assessment,
      sessionUpdated: !!sessionId
    });

  } catch (error) {
    console.error('Error in session summarization:', error);
    
    return NextResponse.json(
      { error: 'Failed to generate session summary' },
      { status: 500 }
    );
  }
}
