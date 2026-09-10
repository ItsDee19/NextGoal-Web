"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase.config";
import { authApi } from "@/lib/api";
import { useAuth } from "@/app/providers";
import { Button, ButtonLink } from "@/components/ui/button";
import { AuthLoading } from "../auth-form";
import { safeAuthRedirect } from "../redirect";

function AuthCallback() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const next = safeAuthRedirect(searchParams.get("next"));
    const providerError = searchParams.get("error");
    const { login } = useAuth();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const hashError = new URLSearchParams(window.location.hash.slice(1)).get("error");
        if (providerError || hashError) {
            setError("Google sign-in was cancelled or could not be completed. Try again, or sign in with email.");
            window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}`);
            return;
        }
        if (!supabase) {
            setError("Google sign-in is unavailable here. You can sign in with your email instead.");
            return;
        }

        let active = true;
        let started = false;
        setError(null);
        const handleSession = async (accessToken: string) => {
            if (!active || started) return;
            started = true;
            window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}`);
            try {
                const response = await authApi.supabaseLogin(accessToken);
                if (!active) return;
                login(response.accessToken, response.user);
                router.replace(next);
            } catch {
                if (active) setError("We couldn’t finish signing in. Return to sign in and try again.");
            } finally {
                clearTimeout(timeout);
            }
        };

        const timeout = setTimeout(() => {
            if (!active) return;
            active = false;
            subscription.unsubscribe();
            setError("Sign-in took too long. Check your connection and try again.");
        }, 15000);

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session) void handleSession(session.access_token);
        });

        void supabase.auth.getSession().then(({ data, error: sessionError }) => {
            if (!active || started) return;
            if (sessionError) {
                clearTimeout(timeout);
                setError("Your Google session could not be restored. Return to sign in and try again.");
            } else if (data.session) {
                void handleSession(data.session.access_token);
            }
        }).catch(() => {
            if (active && !started) {
                clearTimeout(timeout);
                setError("We couldn’t reach Google sign-in. Check your connection and try again.");
            }
        });

        return () => {
            active = false;
            subscription.unsubscribe();
            clearTimeout(timeout);
        };
    }, [login, next, providerError, router]);

    if (!error) return <AuthLoading />;

    return <div className="account-shell mx-auto max-w-md py-16">
        <div className="account-panel p-8">
            <h1 className="premium-heading">Let’s try signing in again.</h1>
            <p role="alert" className="mt-4 text-sm leading-6 text-muted-foreground">{error}</p>
            <ButtonLink className="mt-6 h-11 w-full" href={`/auth/login?next=${encodeURIComponent(next)}`}>Back to sign in</ButtonLink>
            <ButtonLink variant="ghost" className="mt-2 h-11 w-full" href="/">Browse jobs</ButtonLink>
        </div>
    </div>;
}

export default function AuthCallbackPage() {
    return <Suspense fallback={<AuthLoading />}><AuthCallback /></Suspense>;
}
