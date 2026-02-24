"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase.config";
import { authApi } from "@/lib/api";
import { useAuth } from "@/app/providers";
import { Loader2 } from "lucide-react";

function AuthCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login } = useAuth();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let completed = false;

        // Where to send the user after login (e.g. ?next=/profile)
        const next = searchParams.get("next") || "/";

        const handleSession = async (accessToken: string) => {
            try {
                const response = await authApi.supabaseLogin(accessToken);
                login(response.accessToken, response.user);
                // Use replace so the callback page is not in browser history
                router.replace(next);
            } catch (err: any) {
                console.error("OAuth callback error:", err);
                setError(err.message || "Authentication failed");
                setTimeout(() => router.replace("/auth/login"), 3000);
            }
        };

        // Listen for SIGNED_IN — fires reliably after Supabase parses the
        // access_token from the OAuth redirect hash fragment.
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (completed) return;
            if (event === "SIGNED_IN" && session) {
                completed = true;
                subscription.unsubscribe();
                handleSession(session.access_token);
            }
        });

        // Parallel getSession() in case the SIGNED_IN event already fired
        // before the listener was registered.
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (completed || !session) return;
            completed = true;
            subscription.unsubscribe();
            handleSession(session.access_token);
        });

        // Timeout fallback — surface an error if nothing resolves in 10 s
        const timeout = setTimeout(() => {
            if (!completed) {
                completed = true;
                subscription.unsubscribe();
                setError("No session found after OAuth redirect");
                setTimeout(() => router.replace("/auth/login"), 3000);
            }
        }, 10000);

        return () => {
            subscription.unsubscribe();
            clearTimeout(timeout);
        };
    }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

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

export default function AuthCallbackPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center space-y-3">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                        <p className="text-muted-foreground">Loading...</p>
                    </div>
                </div>
            }
        >
            <AuthCallbackContent />
        </Suspense>
    );
}
