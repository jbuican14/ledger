'use client';

import { createClient } from '@/lib/supabase/client';

export async function signInWithGoogle(): Promise< { error: string | null }> {
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    return { error: error? error.message: null };
}
