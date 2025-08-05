# Secure Placement Analytics Setup

This guide explains how to set up secure placement exam analytics that addresses the Supabase security vulnerability while providing comprehensive analytics functionality.

## 🚨 Security Issue Fixed

**Original Problem**: The `placement_analytics` view was using `SECURITY DEFINER` which bypassed Row Level Security (RLS) policies, potentially allowing unauthorized access to aggregated user data.

**Solution**: Replaced with secure functions using `SECURITY INVOKER` and explicit admin role checks.

## 📁 Files Created

- `scripts/setup-secure-placement-analytics.sql` - Complete setup script
- `scripts/seed-placement-analytics-data.sql` - Sample data for testing
- `scripts/test-placement-analytics.sql` - Test script to verify functionality
- `src/lib/placement-analytics.ts` - TypeScript interface for frontend
- `scripts/fix-placement-analytics-security.sql` - Cleanup script (removes old view)

## 🚀 Quick Setup

### Step 1: Run the Setup Script

Execute this in your Supabase SQL editor:

```sql
-- Run the complete setup
\i scripts/setup-secure-placement-analytics.sql
```

Or copy and paste the contents of `setup-secure-placement-analytics.sql` into your Supabase SQL editor.

### Step 2: Make Yourself an Admin

```sql
-- Replace with your actual user ID
UPDATE public.user_profiles 
SET role = 'admin' 
WHERE id = auth.uid();
```

### Step 3: Add Sample Data (Optional)

For testing purposes, run the seed script:

```sql
\i scripts/seed-placement-analytics-data.sql
```

This creates 25 realistic placement exam records across different levels and time periods.

### Step 4: Test the Analytics

```sql
-- Test basic summary
SELECT * FROM get_placement_summary();

-- Test detailed analytics
SELECT * FROM get_placement_analytics();

-- Test with date range
SELECT * FROM get_placement_analytics(
    '2024-01-01'::timestamp,
    '2024-12-31'::timestamp
);
```

## 🔒 Security Features

### 1. SECURITY INVOKER Functions
- All functions use `SECURITY INVOKER` instead of `SECURITY DEFINER`
- This ensures RLS policies are respected
- Functions run with the permissions of the calling user

### 2. Explicit Admin Checks
Every analytics function includes:
```sql
IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() AND role = 'admin'
) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
END IF;
```

### 3. Secure View Alternative
The `placement_analytics_secure` view uses:
- `WITH (security_invoker = true)`
- Inline admin role checking in WHERE clause

## 📊 Available Analytics Functions

### `get_placement_summary()`
Returns high-level statistics:
- Total exams taken
- Average confidence score
- Level distribution (JSON)
- Recent activity (7/30/90 days)

### `get_placement_analytics(start_date, end_date)`
Returns detailed analytics:
- Breakdown by level and month
- Average confidence scores
- Completion rates
- Most common strengths/weaknesses
- Exam duration statistics

### `placement_analytics_secure` View
Alternative access method via SQL view with same security controls.

## 💻 Frontend Integration

Use the TypeScript library for frontend access:

```typescript
import { 
  getPlacementSummary, 
  getPlacementAnalytics,
  hasAnalyticsAccess 
} from '@/lib/placement-analytics';

// Check if user has admin access
const hasAccess = await hasAnalyticsAccess();

if (hasAccess) {
  // Get summary statistics
  const { data: summary, error } = await getPlacementSummary();
  
  // Get detailed analytics
  const { data: analytics, error: analyticsError } = await getPlacementAnalytics();
  
  if (error?.isPermissionError) {
    console.log('User needs admin role');
  }
}
```

## 🧪 Testing

Run the test script to verify everything works:

```sql
\i scripts/test-placement-analytics.sql
```

### Manual Testing Steps

1. **Test Admin Access**:
   ```sql
   UPDATE public.user_profiles SET role = 'admin' WHERE id = auth.uid();
   SELECT * FROM get_placement_summary();
   ```

2. **Test Security** (should fail):
   ```sql
   UPDATE public.user_profiles SET role = 'student' WHERE id = auth.uid();
   SELECT * FROM get_placement_analytics(); -- Should get "Access denied"
   ```

3. **Reset to Admin**:
   ```sql
   UPDATE public.user_profiles SET role = 'admin' WHERE id = auth.uid();
   ```

## 🎯 Key Benefits

- ✅ **Secure**: Proper RLS enforcement and admin role checks
- ✅ **Comprehensive**: Detailed analytics across levels, time periods, and skills
- ✅ **Flexible**: Multiple access methods (functions and views)
- ✅ **Type-Safe**: Full TypeScript support for frontend
- ✅ **Tested**: Comprehensive test suite included

## 🔧 Customization

### Adding New Analytics

To add new analytics functions, follow this pattern:

```sql
CREATE OR REPLACE FUNCTION your_new_analytics()
RETURNS TABLE (...)
LANGUAGE plpgsql
SECURITY INVOKER  -- Important!
AS $$
BEGIN
    -- Always check admin access first
    IF NOT EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;

    -- Your analytics query here
    RETURN QUERY
    SELECT ...;
END;
$$;
```

### Role Management

You can extend the role system:
```sql
-- Add more roles
ALTER TABLE public.user_profiles 
ALTER COLUMN role TYPE TEXT,
ALTER COLUMN role DROP DEFAULT,
ALTER COLUMN role SET DEFAULT 'student',
ADD CONSTRAINT user_profiles_role_check 
CHECK (role IN ('student', 'teacher', 'admin', 'super_admin'));
```

## 📋 Troubleshooting

### `round()` function does not exist Error
- **Error Message**: `function round(double precision, integer) does not exist`
- **Cause**: This is a PostgreSQL typing issue where `AVG()` returns a `double precision` value, which cannot be directly rounded to a decimal place.
- **Solution**: The SQL scripts have been updated to cast the value to `numeric` before rounding, like this: `ROUND(AVG(...)::numeric, 2)`. Ensure you are running the latest version of the scripts.

### "Access denied" Errors
- Verify user has admin role: `SELECT role FROM user_profiles WHERE id = auth.uid();`
- Make sure RLS is enabled on user_profiles table

### Empty Results
- Check if sample data exists: `SELECT COUNT(*) FROM placement_logs;`
- Verify date ranges in analytics functions

### Function Not Found
- Ensure setup script ran completely
- Check function permissions: `GRANT EXECUTE ON FUNCTION ... TO authenticated;`

## 🚀 Production Deployment

1. Remove sample data before production:
   ```sql
   -- Only if you added test data
   DELETE FROM public.placement_logs WHERE user_id IN (
     -- your test user IDs
   );
   ```

2. Monitor analytics usage:
   ```sql
   -- Add logging if needed
   SELECT schemaname, funcname, calls 
   FROM pg_stat_user_functions 
   WHERE funcname LIKE '%placement%';
   ```

3. Consider adding rate limiting for heavy analytics queries.

## 📈 Next Steps

- Create admin dashboard UI using the TypeScript library
- Add data export functionality
- Implement caching for frequently accessed analytics
- Add email reports for placement trends

---

**Security Note**: This implementation follows security best practices and resolves the original SECURITY DEFINER vulnerability while maintaining full analytics functionality.