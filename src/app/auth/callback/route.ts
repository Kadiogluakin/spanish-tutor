import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { logAuthSecurityEvent } from '@/lib/auth-security';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      logAuthSecurityEvent('SOCIAL_SIGNIN_SUCCESS', { next });
      return NextResponse.redirect(`${origin}${next}`);
    }
    
    logAuthSecurityEvent('SOCIAL_SIGNIN_FAILED', { error: error.message, next });
  }

  // return the user to an error page with instructions
  const error_description = searchParams.get('error_description') || 'Sorry, we could not log you in. Please try again.';
  return NextResponse.redirect(`${origin}/auth/signin?error=${encodeURIComponent(error_description)}`);
}
