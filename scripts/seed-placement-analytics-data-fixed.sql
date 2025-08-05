-- Seed realistic placement exam data for analytics
-- This version uses actual user IDs from the auth.users table

DO $$
DECLARE
    real_user_ids UUID[];
    user_id UUID;
    i INTEGER;
    user_count INTEGER;
BEGIN
    -- Get actual user IDs from the auth.users table
    SELECT ARRAY_AGG(id) INTO real_user_ids FROM auth.users LIMIT 20;
    
    -- Check if we have any users
    user_count := COALESCE(array_length(real_user_ids, 1), 0);
    
    IF user_count = 0 THEN
        RAISE EXCEPTION 'No users found in auth.users table. Please create some users first or use the fake data version.';
    END IF;
    
    RAISE NOTICE 'Found % users, creating placement data...', user_count;
    
    -- Insert diverse placement exam results using real user IDs
    -- We'll cycle through available users and create multiple records per user if needed
    
    FOR i IN 1..25 LOOP
        -- Cycle through available users (with wraparound)
        user_id := real_user_ids[((i - 1) % user_count) + 1];
        
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
                WHEN i <= 10 THEN 'A1'
                WHEN i <= 17 THEN 'A2'
                WHEN i <= 22 THEN 'B1'
                WHEN i <= 24 THEN 'B2'
                ELSE 'C1'
            END,
            -- Unit based on level
            CASE 
                WHEN i <= 10 THEN 1 + (i % 3)  -- A1: units 1-3
                WHEN i <= 17 THEN 1 + (i % 4) -- A2: units 1-4
                WHEN i <= 22 THEN 1 + (i % 5) -- B1: units 1-5
                ELSE 1 + (i % 6)              -- B2/C1: units 1-6
            END,
            -- Lesson within unit
            1 + (i % 4),
            -- Confidence score (realistic distribution)
            CASE 
                WHEN i <= 10 THEN 45 + (i * 4)  -- A1: 45-85
                WHEN i <= 17 THEN 60 + (i * 2) -- A2: 60-90
                WHEN i <= 22 THEN 70 + (i % 20) -- B1: 70-90
                ELSE 80 + (i % 15)             -- B2/C1: 80-95
            END,
            -- Level scores (JSONB) - realistic progression
            CASE 
                WHEN i <= 10 THEN format('{"A1": %s, "A2": %s, "B1": %s, "B2": %s}', 
                    70 + (i * 2), 30 + i, 15 + (i/2), 5 + (i/3))::jsonb
                WHEN i <= 17 THEN format('{"A1": %s, "A2": %s, "B1": %s, "B2": %s}', 
                    85 + (i % 10), 60 + (i * 2), 35 + i, 15 + (i/2))::jsonb
                WHEN i <= 22 THEN format('{"A1": %s, "A2": %s, "B1": %s, "B2": %s}', 
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
                WHEN i <= 10 AND i % 2 = 0 THEN ARRAY['basic_vocabulary']
                WHEN i <= 10 THEN ARRAY['pronunciation']
                WHEN i <= 17 AND i % 3 = 0 THEN ARRAY['grammar', 'vocabulary']
                WHEN i <= 17 AND i % 3 = 1 THEN ARRAY['vocabulary', 'culture']
                WHEN i <= 17 THEN ARRAY['grammar', 'culture']
                WHEN i <= 22 AND i % 3 = 0 THEN ARRAY['reading', 'grammar']
                WHEN i <= 22 AND i % 3 = 1 THEN ARRAY['grammar', 'vocabulary']
                WHEN i <= 22 THEN ARRAY['reading', 'vocabulary']
                WHEN i % 3 = 0 THEN ARRAY['advanced_grammar', 'reading']
                WHEN i % 3 = 1 THEN ARRAY['reading', 'culture']
                ELSE ARRAY['advanced_grammar', 'culture']
            END,
            -- Weaknesses (opposite pattern)
            CASE 
                WHEN i <= 10 AND i % 2 = 0 THEN ARRAY['grammar']
                WHEN i <= 10 THEN ARRAY['reading']
                WHEN i <= 17 AND i % 3 = 0 THEN ARRAY['reading', 'culture']
                WHEN i <= 17 AND i % 3 = 1 THEN ARRAY['culture', 'pronunciation']
                WHEN i <= 17 THEN ARRAY['reading', 'pronunciation']
                WHEN i <= 22 AND i % 2 = 0 THEN ARRAY['culture']
                WHEN i <= 22 THEN ARRAY['pronunciation']
                WHEN i % 2 = 0 THEN ARRAY['pronunciation']
                ELSE ARRAY['colloquialisms']
            END,
            -- Recommendations
            CASE 
                WHEN i <= 10 THEN ARRAY['Focus on basic verb conjugations', 'Practice common vocabulary']
                WHEN i <= 17 THEN ARRAY['Work on past tenses', 'Expand cultural knowledge']
                WHEN i <= 22 THEN ARRAY['Practice complex sentences', 'Read Spanish literature']
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
    
    RAISE NOTICE 'Successfully inserted 25 placement exam records using % real users', user_count;
END $$;