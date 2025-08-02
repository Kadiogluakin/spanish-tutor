import { createClient } from '@/lib/supabase/server';

interface GradingResult {
  overall: number;
  criterion_scores: Array<{
    name: string;
    score: number;
    feedback: string;
  }>;
  corrections: string[];
  next_focus: string[];
  srs_add: string[];
  detailed_feedback: string;
  pronunciation_notes?: string[];
}

export interface GradedSubmission {
  submissionId: string;
  score: number;
  grade: GradingResult;
}

export async function gradeSubmission(submissionId: string, userId: string): Promise<GradedSubmission | null> {
  try {
    const supabase = await createClient();

    // Fetch the submission and related homework
    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .select(`
        *,
        homework (
          id,
          type,
          prompt,
          rubric_json
        )
      `)
      .eq('id', submissionId)
      .eq('user_id', userId)
      .single();

    if (submissionError || !submission) {
      console.error('Submission not found:', submissionError);
      return null;
    }

    if (submission.graded_at) {
      console.log('Submission already graded');
      return null;
    }

    const homework = submission.homework;
    if (!homework) {
      console.error('Homework not found for submission');
      return null;
    }

    // Prepare content for grading
    const contentToGrade = submission.text_content || submission.transcript || '';
    if (!contentToGrade.trim()) {
      console.error('No content to grade');
      return null;
    }

    // Create detailed grading prompt
    const rubric = homework.rubric_json;
    const systemPrompt = `You are Profesora Elena, an expert Spanish language teacher. Grade this ${homework.type} assignment strictly using the provided rubric. 

Your response MUST be valid JSON with this exact structure:
{
  "overall": (0-5 scale),
  "criterion_scores": [
    {
      "name": "criterion name",
      "score": (0-5),
      "feedback": "specific feedback for this criterion"
    }
  ],
  "corrections": ["specific corrections with examples"],
  "next_focus": ["areas for improvement"],
  "srs_add": ["new vocabulary words to study"],
  "detailed_feedback": "comprehensive written feedback in Spanish and English",
  ${homework.type === 'speaking' ? '"pronunciation_notes": ["specific pronunciation feedback"],' : ''}
}

Be constructive but honest. Provide specific examples from the student's work. Use both Spanish and English in your feedback to help comprehension.`;

    const userPrompt = `Assignment Type: ${homework.type}
Assignment Prompt: ${homework.prompt}
Student Response: ${contentToGrade}
Rubric: ${JSON.stringify(rubric, null, 2)}

Please grade this work thoroughly and provide detailed, constructive feedback.`;

    // Call OpenAI API for grading
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.TEXT_MODEL || 'gpt-4o-mini';
    
    if (!apiKey) {
      console.error('OpenAI API key not configured');
      return null;
    }

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!openaiResponse.ok) {
      console.error('OpenAI API error:', await openaiResponse.text());
      return null;
    }

    const openaiData = await openaiResponse.json();
    const gradeContent = openaiData?.choices?.[0]?.message?.content;

    if (!gradeContent) {
      console.error('No grading response received');
      return null;
    }

    let gradingResult: GradingResult;
    try {
      gradingResult = JSON.parse(gradeContent);
    } catch (parseError) {
      console.error('Failed to parse grading result:', parseError);
      return null;
    }

    // Calculate final score (0-100 scale)
    const finalScore = Math.round((gradingResult.overall / 5) * 100);

    // Update submission with grading results
    const { error: updateError } = await supabase
      .from('submissions')
      .update({
        graded_at: new Date().toISOString(),
        grade_json: gradingResult,
        teacher_feedback: gradingResult.detailed_feedback,
        score: finalScore
      })
      .eq('id', submissionId);

    if (updateError) {
      console.error('Error updating submission:', updateError);
      return null;
    }

    return {
      submissionId,
      score: finalScore,
      grade: gradingResult
    };

  } catch (error) {
    console.error('Error in gradeSubmission:', error);
    return null;
  }
}

export async function gradeAllPendingSubmissions(): Promise<{
  success: boolean;
  graded: number;
  total: number;
  results: Array<{ submissionId: string; success: boolean; score?: number; error?: string; }>;
}> {
  try {
    const supabase = await createClient();
    
    // Get all ungraded submissions with user info
    const { data: ungraded, error: fetchError } = await supabase
      .from('submissions')
      .select('id, user_id')
      .is('graded_at', null)
      .limit(10); // Process max 10 at a time to avoid timeouts

    if (fetchError) {
      console.error('Error fetching ungraded submissions:', fetchError);
      return {
        success: false,
        graded: 0,
        total: 0,
        results: []
      };
    }

    if (!ungraded || ungraded.length === 0) {
      return {
        success: true,
        graded: 0,
        total: 0,
        results: []
      };
    }

    let gradedCount = 0;
    const results = [];

    // Grade each submission
    for (const submission of ungraded) {
      try {
        const result = await gradeSubmission(submission.id, submission.user_id);
        
        if (result) {
          gradedCount++;
          results.push({
            submissionId: submission.id,
            success: true,
            score: result.score
          });
        } else {
          results.push({
            submissionId: submission.id,
            success: false,
            error: 'Grading failed'
          });
        }
      } catch (error) {
        console.error(`Error grading submission ${submission.id}:`, error);
        results.push({
          submissionId: submission.id,
          success: false,
          error: 'Grading failed with exception'
        });
      }
    }

    return {
      success: true,
      graded: gradedCount,
      total: ungraded.length,
      results
    };

  } catch (error) {
    console.error('Error in gradeAllPendingSubmissions:', error);
    return {
      success: false,
      graded: 0,
      total: 0,
      results: []
    };
  }
}