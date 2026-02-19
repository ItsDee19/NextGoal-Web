"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase.config";
import { authApi } from "@/lib/api";
import { useAuth } from "@/app/providers";
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
    const router = useRouter();
    const { login } = useAuth();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handleCallback = async () => {
            try {
                // Get the session that Supabase set after the OAuth redirect
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                if (sessionError || !session) {
                    throw new Error(sessionError?.message || "No session found after OAuth redirect");
                }

                // Exchange Supabase access token for our app JWT
                const response = await authApi.supabaseLogin(session.access_token);
                login(response.accessToken, response.user);
                router.push("/");
            } catch (err: any) {
                console.error("OAuth callback error:", err);
                setError(err.message || "Authentication failed");
                setTimeout(() => router.push("/auth/login"), 3000);
            }
        };

        handleCallback();
    }, []);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center space-y-2">
                    <p className="text-red-500 font-medium">Authentication failed</p>
                    <p className="text-muted-foreground text-sm">{error}</p>
                    <p className="text-muted-foreground text-sm">Redirecting to login...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                <p className="text-muted-foreground">Completing sign in...</p>
            </div>
        </div>
    );
}
