import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function configuredClient(): SupabaseClient | null {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
    if (!url || !key) return null;
    try {
        if (!["https:", "http:"].includes(new URL(url).protocol)) return null;
        return createClient(url, key);
    } catch {
        // Google sign-in is optional; discovery and email sign-in still work.
        return null;
    }
}

export const supabase = configuredClient();
