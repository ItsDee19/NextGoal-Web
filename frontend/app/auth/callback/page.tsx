"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/providers";
import { usersApi } from "@/lib/api";
import { Loader2 } from "lucide-react";

function CallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login } = useAuth();

    useEffect(() => {
        const token = searchParams.get("token");

        if (token) {
            // Fetch user info and complete login
            const completeAuth = async () => {
                try {
                    // Store token temporarily to fetch user data
                    document.cookie = `token=${token}; path=/; max-age=${7 * 24 * 60 * 60}`;
                    const user = await usersApi.getProfile();
                    login(token, user);
                    router.push("/");
                } catch (error) {
                    console.error("Failed to complete authentication:", error);
                    router.push("/auth/login?error=callback_failed");
                }
            };
            completeAuth();
        } else {
            router.push("/auth/login?error=no_token");
        }
    }, [searchParams, router, login]);

    return (
        <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
            <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                <p className="mt-4 text-muted-foreground">Completing sign in...</p>
            </div>
        </div>
    );
}

export default function CallbackPage() {
    return (
        <Suspense fallback={
            <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        }>
            <CallbackContent />
        </Suspense>
    );
}
