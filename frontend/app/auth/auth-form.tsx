"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { isAxiosError } from "axios";
import { ArrowLeft, ArrowUpRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase.config";
import { authApi } from "@/lib/api";
import { useAuth } from "@/app/providers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { safeAuthRedirect } from "./redirect";

type Fields = "name" | "email" | "password" | "confirmPassword";

export function AuthLoading() {
    return <div className="flex min-h-[60vh] items-center justify-center gap-3 py-12" role="status">
        <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Loading your account…</span>
    </div>;
}

function GoogleIcon() {
    return <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>;
}

export function AuthForm({ mode }: { mode: "login" | "register" }) {
    const register = mode === "register";
    const router = useRouter();
    const searchParams = useSearchParams();
    const next = safeAuthRedirect(searchParams.get("next"));
    const { login } = useAuth();
    const { toast } = useToast();
    const pending = useRef(false);
    const formRef = useRef<HTMLFormElement>(null);
    const errorRef = useRef<HTMLParagraphElement>(null);
    const [busy, setBusy] = useState<"credentials" | "google" | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
    const [errors, setErrors] = useState<Partial<Record<Fields, string>>>({});
    const [error, setError] = useState<string | null>(null);

    const change = (field: Fields, value: string) => {
        setForm((previous) => ({ ...previous, [field]: value }));
        setErrors((previous) => ({ ...previous, [field]: undefined }));
        setError(null);
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (pending.current) return;
        const validation: Partial<Record<Fields, string>> = {};
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) validation.email = "Enter a valid email address.";
        if (!form.password) validation.password = "Enter your password.";
        else if (register && form.password.length < 6) validation.password = "Use at least 6 characters.";
        if (register && form.password !== form.confirmPassword) validation.confirmPassword = "Enter the same password in both fields.";
        setErrors(validation);
        setError(null);
        const firstError = Object.keys(validation)[0];
        if (firstError) {
            formRef.current?.querySelector<HTMLInputElement>(`[name="${firstError}"]`)?.focus();
            return;
        }
        pending.current = true;
        setBusy("credentials");
        let signedIn = false;
        try {
            const response = register
                ? await authApi.register({ name: form.name.trim() || undefined, email: form.email.trim(), password: form.password })
                : await authApi.login({ email: form.email.trim(), password: form.password });
            login(response.accessToken, response.user);
            signedIn = true;
            toast({ title: register ? "Account created" : "Signed in" });
            router.replace(next);
        } catch (failure) {
            const status = isAxiosError(failure) ? failure.response?.status : undefined;
            if (register && status === 409) {
                setErrors({ email: "This email already has an account. Use the sign-in link below." });
                requestAnimationFrame(() => formRef.current?.querySelector<HTMLInputElement>('[name="email"]')?.focus());
            } else {
                setError(status === 401
                    ? "Sign-in failed. Check your email and password, or use Google if you registered with it."
                    : "We couldn’t connect to your account. Check your connection and try again.");
                requestAnimationFrame(() => errorRef.current?.focus());
            }
        } finally {
            if (!signedIn) {
                pending.current = false;
                setBusy(null);
            }
        }
    };

    const handleGoogle = async () => {
        if (pending.current || !supabase) return;
        pending.current = true;
        setBusy("google");
        setError(null);
        let redirecting = false;
        try {
            const callback = new URL("/auth/callback", window.location.origin);
            callback.searchParams.set("next", next);
            const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
                provider: "google", options: { redirectTo: callback.toString() },
            });
            if (oauthError || !data.url) throw new Error("Google sign-in unavailable");
            redirecting = true;
        } catch {
            setError("Google sign-in couldn’t start. Try again or continue with your email.");
            requestAnimationFrame(() => errorRef.current?.focus());
        } finally {
            if (!redirecting) {
                pending.current = false;
                setBusy(null);
            }
        }
    };

    const fieldError = (field: Fields) => errors[field]
        ? <p id={`${field}-error`} className="text-sm text-destructive">{errors[field]}</p>
        : null;
    const otherRoute = `/auth/${register ? "login" : "register"}?next=${encodeURIComponent(next)}`;

    return <div className="account-shell mx-auto w-full max-w-md py-10 sm:py-16">
        <Link href="/" className="mb-7 inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Back to jobs
        </Link>
        <div className="account-panel p-6 sm:p-8">
            <div className="mb-7">
                <div className="account-mark mb-5 flex h-12 w-12 items-center justify-center">
                    <ArrowUpRight aria-hidden="true" className="h-6 w-6" />
                </div>
                <h1 className="premium-heading">{register ? "Your next move starts here." : "Welcome back."}</h1>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{register
                    ? "Create an account to keep your shortlist and job preferences in one place."
                    : "Sign in to pick up your shortlist and keep your job search moving."}</p>
            </div>
            <form ref={formRef} noValidate onSubmit={handleSubmit} className="space-y-5" aria-busy={busy === "credentials"}>
                <div aria-live="polite">{error && <p ref={errorRef} tabIndex={-1} role="alert" className="rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}</div>
                <fieldset disabled={!!busy} className="space-y-5">
                    <legend className="sr-only">{register ? "Create your account" : "Sign in with email"}</legend>
                    {register && <div className="space-y-2">
                        <Label htmlFor="name">Name <span className="font-normal text-muted-foreground">(optional)</span></Label>
                        <Input id="name" name="name" autoComplete="name" className="h-11" value={form.name} onChange={(event) => change("name", event.target.value)} />
                    </div>}
                    <div className="space-y-2">
                        <Label htmlFor="email">Email address</Label>
                        <Input id="email" name="email" type="email" autoComplete="email" required spellCheck={false} autoCapitalize="none" className="h-11"
                            placeholder="you@example.com" value={form.email} onChange={(event) => change("email", event.target.value)}
                            aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} />
                        {fieldError("email")}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <div className="relative">
                            <Input id="password" name="password" type={showPassword ? "text" : "password"} required
                                autoComplete={register ? "new-password" : "current-password"} minLength={register ? 6 : undefined}
                                className="h-11 pr-12" value={form.password} onChange={(event) => change("password", event.target.value)}
                                aria-invalid={!!errors.password} aria-describedby={errors.password ? "password-error" : register ? "password-help" : undefined} />
                            <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-11 w-11"
                                aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>
                                {showPassword ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
                            </Button>
                        </div>
                        {fieldError("password")}
                        {register && <p id="password-help" className="text-xs text-muted-foreground">Use at least 6 characters.</p>}
                    </div>
                    {register && <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm password</Label>
                        <Input id="confirmPassword" name="confirmPassword" type={showPassword ? "text" : "password"} autoComplete="new-password" required className="h-11"
                            value={form.confirmPassword} onChange={(event) => change("confirmPassword", event.target.value)}
                            aria-invalid={!!errors.confirmPassword} aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined} />
                        {fieldError("confirmPassword")}
                    </div>}
                    <Button type="submit" className="h-12 w-full gap-2" disabled={!!busy}>
                        {busy === "credentials" && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
                        {busy === "credentials" ? (register ? "Creating account…" : "Signing in…") : (register ? "Create account" : "Sign in")}
                    </Button>
                </fieldset>
            </form>
            <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
            <Button type="button" variant="outline" className="h-11 w-full gap-2" disabled={!!busy || !supabase}
                onClick={handleGoogle} aria-describedby={!supabase ? "google-unavailable" : undefined}>
                {busy === "google" ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
                {busy === "google" ? "Opening Google…" : "Continue with Google"}
            </Button>
            {!supabase && <p id="google-unavailable" className="mt-2 text-xs leading-5 text-muted-foreground">Google sign-in is unavailable here. You can continue with email.</p>}
            <p className="mt-6 text-center text-sm text-muted-foreground">{register ? "Already have an account?" : "New to NextGoal?"}{" "}
                <Link href={otherRoute} className="font-medium text-primary underline-offset-4 hover:underline">{register ? "Sign in" : "Create an account"}</Link>
            </p>
        </div>
    </div>;
}
