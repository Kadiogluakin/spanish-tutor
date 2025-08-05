-- Seed realistic placement exam data for analytics
-- This creates diverse sample data across different levels and time periods

-- First, let's create some sample user IDs (in production, use real user IDs)
-- You'll need to replace these with actual user IDs from your auth.users table

DO $$
DECLARE
    sample_user_ids UUID[] := ARRAY[
        gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
        gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
        gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
        gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()
    ];
    user_id UUID;
    i INTEGER;
BEGIN
    -- Insert diverse placement exam results
    -- Distribute across different levels and time periods for realistic analytics
    
    FOR i IN 1..20 LOOP
        user_id := sample_user_ids[i];
        
        -- Vary the data based on the loop index to create realistic distribution
        INSERT INTO public.placement_logs (
            user_id,
            recommended_level,
            recommended_unit,
            recommended_lesson,
            confidence_score,
            level_scores,
            skill_scores,
            strengths,
            weaknesses,
            recommendations,
            exam_duration_minutes,
            total_questions,
            questions_answered,
            created_at
        ) VALUES (
            user_id,
            -- Distribute levels realistically (more A1/A2, fewer C1/C2)
            CASE 
                WHEN i <= 8 THEN 'A1'
                WHEN i <= 14 THEN 'A2'
                WHEN i <= 18 THEN 'B1'
                WHEN i <= 19 THEN 'B2'
                ELSE 'C1'
            END,
            -- Unit based on level
            CASE 
                WHEN i <= 8 THEN 1 + (i % 3)  -- A1: units 1-3
                WHEN i <= 14 THEN 1 + (i % 4) -- A2: units 1-4
                WHEN i <= 18 THEN 1 + (i % 5) -- B1: units 1-5
                ELSE 1 + (i % 6)              -- B2/C1: units 1-6
            END,
            -- Lesson within unit
            1 + (i % 4),
            -- Confidence score (realistic distribution)
            CASE 
                WHEN i <= 8 THEN 45 + (i * 5)  -- A1: 45-85
                WHEN i <= 14 THEN 60 + (i * 3) -- A2: 60-90
                WHEN i <= 18 THEN 70 + (i * 2) -- B1: 70-95
                ELSE 80 + (i % 15)             -- B2/C1: 80-95
            END,
            -- Level scores (JSONB) - realistic progression
            CASE 
                WHEN i <= 8 THEN format('{"A1": %s, "A2": %s, "B1": %s, "B2": %s}', 
                    70 + (i * 2), 30 + i, 15 + (i/2), 5 + (i/3))::jsonb
                WHEN i <= 14 THEN format('{"A1": %s, "A2": %s, "B1": %s, "B2": %s}', 
                    85 + (i % 10), 60 + (i * 2), 35 + i, 15 + (i/2))::jsonb
                WHEN i <= 18 THEN format('{"A1": %s, "A2": %s, "B1": %s, "B2": %s}', 
                    90 + (i % 5), 80 + (i % 8), 65 + (i % 12), 30 + i)::jsonb
                ELSE format('{"A1": %s, "A2": %s, "B1": %s, "B2": %s}', 
                    95, 90 + (i % 5), 75 + (i % 10), 55 + (i % 15))::jsonb
            END,
            -- Skill scores (JSONB) - varied strengths/weaknesses
            format('{"grammar": %s, "vocabulary": %s, "reading": %s, "culture": %s}',
                50 + (i * 2) + (random() * 20)::int,
                45 + (i * 2) + (random() * 25)::int,
                40 + (i * 3) + (random() * 20)::int,
                35 + (i * 2) + (random() * 30)::int
            )::jsonb,
            -- Strengths (varied by level)
            CASE 
                WHEN i <= 8 AND i % 2 = 0 THEN ARRAY['basic_vocabulary']
                WHEN i <= 8 THEN ARRAY['pronunciation']
                WHEN i <= 14 AND i % 3 = 0 THEN ARRAY['grammar', 'vocabulary']
                WHEN i <= 14 AND i % 3 = 1 THEN ARRAY['vocabulary', 'culture']
                WHEN i <= 14 THEN ARRAY['grammar', 'culture']
                WHEN i <= 18 AND i % 3 = 0 THEN ARRAY['reading', 'grammar']
                WHEN i <= 18 AND i % 3 = 1 THEN ARRAY['grammar', 'vocabulary']
                WHEN i <= 18 THEN ARRAY['reading', 'vocabulary']
                WHEN i % 3 = 0 THEN ARRAY['advanced_grammar', 'reading']
                WHEN i % 3 = 1 THEN ARRAY['reading', 'culture']
                ELSE ARRAY['advanced_grammar', 'culture']
            END,
            -- Weaknesses (opposite pattern)
            CASE 
                WHEN i <= 8 AND i % 2 = 0 THEN ARRAY['grammar']
                WHEN i <= 8 THEN ARRAY['reading']
                WHEN i <= 14 AND i % 3 = 0 THEN ARRAY['reading', 'culture']
                WHEN i <= 14 AND i % 3 = 1 THEN ARRAY['culture', 'pronunciation']
                WHEN i <= 14 THEN ARRAY['reading', 'pronunciation']
                WHEN i <= 18 AND i % 2 = 0 THEN ARRAY['culture']
                WHEN i <= 18 THEN ARRAY['pronunciation']
                WHEN i % 2 = 0 THEN ARRAY['pronunciation']
                ELSE ARRAY['colloquialisms']
            END,
            -- Recommendations
            CASE 
                WHEN i <= 8 THEN ARRAY['Focus on basic verb conjugations', 'Practice common vocabulary']
                WHEN i <= 14 THEN ARRAY['Work on past tenses', 'Expand cultural knowledge']
                WHEN i <= 18 THEN ARRAY['Practice complex sentences', 'Read Spanish literature']
                ELSE ARRAY['Master subjunctive mood', 'Study regional variations']
            END,
            -- Exam duration (realistic range)
            15 + (i % 25) + (random() * 10)::int,
            -- Total questions
            20,
            -- Questions answered (most complete, some partial)
            CASE 
                WHEN i % 5 = 0 THEN 18 + (random() * 2)::int  -- Some didn't finish
                ELSE 20  -- Most completed all questions
            END,
            -- Created at (distribute over last 6 months)
            NOW() - INTERVAL '1 day' * (random() * 180)::int
        );
    END LOOP;
    
    -- Add a few more recent entries for current month analytics
    FOR i IN 1..5 LOOP
        INSERT INTO public.placement_logs (
            user_id,
            recommended_level,
            recommended_unit, 
            recommended_lesson,
            confidence_score,
            level_scores,
            skill_scores,
            strengths,
            weaknesses,
            recommendations,
            exam_duration_minutes,
            total_questions,
            questions_answered,
            created_at
        ) VALUES (
            gen_random_uuid(),
            CASE 
                WHEN random() < 0.4 THEN 'A1'
                WHEN random() < 0.7 THEN 'A2'
                ELSE 'B1'
            END,
            1 + (random() * 3)::int,
            1 + (random() * 4)::int,
            60 + (random() * 30)::int,
            format('{"A1": %s, "A2": %s, "B1": %s, "B2": %s}',
                70 + (random() * 25)::int,
                50 + (random() * 30)::int,
                30 + (random() * 25)::int,
                10 + (random() * 20)::int
            )::jsonb,
            format('{"grammar": %s, "vocabulary": %s, "reading": %s, "culture": %s}',
                60 + (random() * 30)::int,
                65 + (random() * 25)::int,
                55 + (random() * 35)::int,
                50 + (random() * 40)::int
            )::jsonb,
            CASE 
                WHEN random() < 0.5 THEN ARRAY['vocabulary']
                ELSE ARRAY['grammar']
            END,
            CASE 
                WHEN random() < 0.5 THEN ARRAY['reading']
                ELSE ARRAY['culture']
            END,
            ARRAY['Practice daily conversation', 'Focus on verb tenses'],
            18 + (random() * 15)::int,
            20,
            20,
            NOW() - INTERVAL '1 day' * (random() * 30)::int  -- Last 30 days
        );
    END LOOP;
    
    RAISE NOTICE 'Successfully inserted % placement exam records', 25;
END $$;