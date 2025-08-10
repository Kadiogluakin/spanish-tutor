import { createClient } from '@/lib/supabase/server';
import { updateVocabularyProgress, updateSkillProgress } from '@/lib/progress-tracking';

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

    // 🔗 INTEGRATION: Process homework results for comprehensive learning system
    await processHomeworkResults(userId, submissionId, gradingResult, finalScore, homework);

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

/**
 * Process homework results to integrate with error analysis and SRS systems
 */
async function processHomeworkResults(
  userId: string, 
  submissionId: string, 
  gradingResult: GradingResult, 
  finalScore: number, 
  homework: any
): Promise<void> {
  try {
    const supabase = await createClient();
    console.log(`🔗 Processing homework results for comprehensive learning integration...`);

    // 1. 📝 LOG ERRORS FROM HOMEWORK CORRECTIONS
    if (gradingResult.corrections && gradingResult.corrections.length > 0) {
      console.log(`Found ${gradingResult.corrections.length} corrections to log as errors`);
      
      for (const correction of gradingResult.corrections) {
        try {
          // Extract error type and details from correction
          const { type, spanish, english, note } = parseCorrection(correction);
          
          // Check if this error already exists for the user
          const { data: existingError } = await supabase
            .from('error_logs')
            .select('id, count')
            .eq('user_id', userId)
            .eq('type', type)
            .eq('spanish', spanish)
            .single();

          if (existingError) {
            // Update existing error count
            await supabase
              .from('error_logs')
              .update({ 
                count: existingError.count + 1,
                last_seen: new Date().toISOString(),
                note: note // Update note with the latest correction
              })
              .eq('id', existingError.id);
            
            console.log(`📈 Updated existing error: ${type} (count: ${existingError.count + 1})`);
          } else {
            // Create new error log entry
            await supabase
              .from('error_logs')
              .insert({
                user_id: userId,
                type,
                spanish,
                english,
                note,
                count: 1,
                source: `Homework: ${homework.type} assignment`
              });
            
            console.log(`🆕 Logged new error: ${type}`);
          }
        } catch (errorLogError) {
          console.error('Error logging homework mistake:', errorLogError);
        }
      }
    }

    // 2. 📚 ADD VOCABULARY TO SRS SYSTEM
    if (gradingResult.srs_add && gradingResult.srs_add.length > 0) {
      console.log(`Adding ${gradingResult.srs_add.length} vocabulary items to SRS system`);
      
      for (const vocabTerm of gradingResult.srs_add) {
        try {
          // Find vocabulary item in database
          const { data: vocabItem } = await supabase
            .from('vocabulary')
            .select('id')
            .ilike('spanish', `%${vocabTerm}%`)
            .single();

          if (vocabItem) {
            // Calculate performance score (lower for items that need more practice)
            const performance = Math.max(2, Math.round((finalScore / 100) * 6)); // 2-6 scale
            await updateVocabularyProgress(userId, vocabItem.id, performance);
            console.log(`📖 Added vocabulary to SRS: ${vocabTerm} (performance: ${performance})`);
          } else {
            console.log(`⚠️ Vocabulary item not found in database: ${vocabTerm}`);
          }
        } catch (vocabError) {
          console.error(`Error adding vocabulary to SRS: ${vocabTerm}`, vocabError);
        }
      }
    }

    // 3. 🎯 UPDATE SKILL PROGRESS BASED ON HOMEWORK PERFORMANCE
    const skillUpdates = generateSkillUpdatesFromHomework(homework, gradingResult, finalScore);
    if (skillUpdates.length > 0) {
      console.log(`Updating ${skillUpdates.length} skill progress entries`);
      await updateSkillProgress(userId, skillUpdates);
    }

    // 4. 📊 LOG HOMEWORK COMPLETION FOR ANALYTICS
    await supabase
      .from('learning_analytics')
      .upsert({
        user_id: userId,
        activity_type: 'homework_completion',
        activity_data: {
          homework_type: homework.type,
          score: finalScore,
          errors_corrected: gradingResult.corrections?.length || 0,
          vocab_items_added: gradingResult.srs_add?.length || 0,
          focus_areas: gradingResult.next_focus || []
        },
        timestamp: new Date().toISOString()
      });

    console.log(`✅ Successfully processed homework results for comprehensive learning integration`);

  } catch (error) {
    console.error('Error processing homework results:', error);
    // Don't throw - homework grading should succeed even if integration fails
  }
}

/**
 * Extract error type from correction text
 */
function extractErrorType(correction: string): string {
  const correctionLower = correction.toLowerCase();
  
  if (correctionLower.includes('verb') || correctionLower.includes('conjugat')) {
    return 'verb_conjugation';
  } else if (correctionLower.includes('gender') || correctionLower.includes('el/la') || correctionLower.includes('un/una')) {
    return 'gender_agreement';
  } else if (correctionLower.includes('accent') || correctionLower.includes('tilde') || correctionLower.includes('á|é|í|ó|ú')) {
    return 'accent_marks';
  } else if (correctionLower.includes('ser') || correctionLower.includes('estar')) {
    return 'ser_vs_estar';
  } else if (correctionLower.includes('preposition') || correctionLower.includes('por/para') || correctionLower.includes('a/de/en')) {
    return 'prepositions';
  } else if (correctionLower.includes('spelling') || correctionLower.includes('ortograf')) {
    return 'spelling';
  } else if (correctionLower.includes('word order') || correctionLower.includes('syntax')) {
    return 'word_order';
  } else if (correctionLower.includes('vocabulary') || correctionLower.includes('vocab')) {
    return 'vocabulary_choice';
  } else {
    return 'grammar_general';
  }
}

/**
 * Parses a correction string into structured error data.
 * Example input: "Correction: 'yo soy bien' -> 'yo estoy bien'. Note: Use 'estar' for conditions."
 * @returns { type: string, spanish: string, english: string, note: string }
 */
function parseCorrection(correction: string): { type: string, spanish: string, english: string, note: string } {
  const type = extractErrorType(correction);
  let spanish = '';
  let english = '';
  let note = '';

  const correctionLower = correction.toLowerCase();

  // Standard format: "Correction: '[wrong]' -> '[correct]'. Note: [explanation]"
  const match = correction.match(/correction:\s*'(.*?)'\s*->\s*'(.*?)'\s*\.\s*note:\s*(.*)/i);
  
  if (match) {
    spanish = match[1];
    english = match[2];
    note = match[3];
  } else {
    // Fallback for simpler formats
    const parts = correction.split('->');
    if (parts.length === 2) {
      spanish = parts[0].replace(/correction:|'|"/gi, '').trim();
      english = parts[1].replace(/\./g, '').replace(/'|"/gi, '').trim();
    } else {
      spanish = correction; // Store the full correction if parsing fails
      english = 'N/A';
    }
    
    // Attempt to extract a note
    if (correctionLower.includes('note:')) {
      note = correction.substring(correctionLower.indexOf('note:') + 5).trim();
    } else if (correctionLower.includes('because')) {
      note = correction.substring(correctionLower.indexOf('because')).trim();
    } else {
      note = `Review this ${type} error.`;
    }
  }

  return { type, spanish, english, note };
}

/**
 * Generate skill updates based on homework performance
 */
function generateSkillUpdatesFromHomework(homework: any, gradingResult: GradingResult, finalScore: number): Array<{skillCode: string, performance: number, success: boolean}> {
  const updates = [];
  const basePerformance = Math.round((finalScore / 100) * 10); // Convert to 0-10 scale
  const success = finalScore >= 70;

  // Update skills based on homework type
  if (homework.type === 'writing') {
    updates.push(
      { skillCode: 'grammar_accuracy', performance: basePerformance, success },
      { skillCode: 'vocabulary_range', performance: basePerformance, success },
      { skillCode: 'written_expression', performance: basePerformance, success }
    );
  } else if (homework.type === 'speaking') {
    updates.push(
      { skillCode: 'pronunciation', performance: basePerformance, success },
      { skillCode: 'oral_fluency', performance: basePerformance, success },
      { skillCode: 'conversation_skills', performance: basePerformance, success }
    );
  }

  // Adjust performance based on specific areas of weakness
  if (gradingResult.next_focus) {
    for (const focus of gradingResult.next_focus) {
      const focusLower = focus.toLowerCase();
      if (focusLower.includes('verb') || focusLower.includes('conjugat')) {
        updates.push({ skillCode: 'verb_conjugation', performance: Math.max(1, basePerformance - 2), success: false });
      } else if (focusLower.includes('vocab')) {
        updates.push({ skillCode: 'vocabulary_range', performance: Math.max(1, basePerformance - 2), success: false });
      }
    }
  }

  return updates;
}