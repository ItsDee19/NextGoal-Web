"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "@/lib/api";
import { useAuth } from "@/app/providers";
import { Button, ButtonLink } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, ArrowLeft, Save, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

const groups = [
    { key: "experienceLevel", label: "Experience level", options: [
        { value: "fresher", label: "Fresher" }, { value: "1-3", label: "1–3 years" },
        { value: "3-5", label: "3–5 years" }, { value: "5+", label: "5+ years" },
    ] },
    { key: "degree", label: "Degree", options: [
        { value: "btech", label: "B.Tech" }, { value: "ballb", label: "BA LLB" },
        { value: "llb", label: "LLB" }, { value: "any", label: "Any degree" },
    ] },
    { key: "jobType", label: "Job type", options: [
        { value: "full-time", label: "Full-time" }, { value: "internship", label: "Internship" },
    ] },
] as const;

type Preferences = { experienceLevel: string[]; degree: string[]; jobType: string[]; locations: string };
const emptyPreferences: Preferences = { experienceLevel: [], degree: [], jobType: [], locations: "" };
const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

export default function ProfilePage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const submitting = useRef(false);
    const loadedUser = useRef<string | null>(null);
    const currentUser = useRef(user?.id);
    currentUser.current = user?.id;
    const [preferences, setPreferences] = useState<Preferences>(emptyPreferences);
    const [dirty, setDirty] = useState(false);
    const [saved, setSaved] = useState(false);

    const { data: profile, isLoading, isError, refetch, isFetching } = useQuery({
        queryKey: ["profile", user?.id], queryFn: () => usersApi.getProfile(), enabled: !!user,
        retry: 1,
    });

    useEffect(() => {
        if (!authLoading && !user) router.replace("/auth/login?next=%2Fprofile");
    }, [user, authLoading, router]);

    useEffect(() => {
        if (loadedUser.current !== (user?.id ?? null)) {
            loadedUser.current = user?.id ?? null;
            setPreferences(emptyPreferences);
            setDirty(false);
            setSaved(false);
        }
        if (profile && !dirty) {
            setPreferences({
                experienceLevel: strings(profile.preferences?.experienceLevel),
                degree: strings(profile.preferences?.degree),
                jobType: strings(profile.preferences?.jobType),
                locations: strings(profile.preferences?.locations).join(", "),
            });
        }
    }, [profile, dirty, user?.id]);

    useEffect(() => {
        if (!dirty) return;
        const warnOnUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
        window.addEventListener("beforeunload", warnOnUnload);
        return () => window.removeEventListener("beforeunload", warnOnUnload);
    }, [dirty]);

    const updateMutation = useMutation({
        mutationFn: ({ prefs }: { userId: string; prefs: { experienceLevel: string[]; degree: string[]; jobType: string[]; locations: string[] } }) => usersApi.updatePreferences(prefs),
        onSuccess: (updatedProfile, variables) => {
            if (currentUser.current !== variables.userId) return;
            queryClient.setQueryData(["profile", variables.userId], updatedProfile);
            setDirty(false);
            setSaved(true);
            toast({ title: "Preferences saved" });
        },
    });

    const handleSave = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!user || submitting.current || !dirty) return;
        submitting.current = true;
        setSaved(false);
        try {
            await updateMutation.mutateAsync({
                userId: user.id,
                prefs: {
                experienceLevel: preferences.experienceLevel, degree: preferences.degree, jobType: preferences.jobType,
                locations: preferences.locations.split(",").map((location) => location.trim()).filter(Boolean),
                },
            });
        } catch {
            // Mutation error is displayed below, while all edits remain available.
        } finally {
            submitting.current = false;
        }
    };

    const markChanged = () => { setDirty(true); setSaved(false); updateMutation.reset(); };
    const togglePreference = (key: "experienceLevel" | "degree" | "jobType", value: string) => {
        markChanged();
        setPreferences((previous) => ({ ...previous, [key]: previous[key].includes(value)
            ? previous[key].filter((item) => item !== value) : [...previous[key], value] }));
    };

    if (authLoading || isLoading || !user) {
        return <div className="flex min-h-[60vh] items-center justify-center gap-3 py-12" role="status">
            <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Loading your preferences…</span>
        </div>;
    }

    return <div className="account-shell mx-auto max-w-2xl py-10 sm:py-14">
        <Link href="/" className="mb-7 inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Back to jobs
        </Link>
        <h1 className="premium-heading">Your job preferences</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">Keep the roles, experience levels, and locations that matter to you together.</p>
        <div className="account-identity my-7 flex items-center gap-3 border-y py-5">
            <div className="account-mark flex h-11 w-11 shrink-0 items-center justify-center"><UserRound aria-hidden="true" className="h-5 w-5" /></div>
            <div className="min-w-0"><p className="truncate font-medium">{profile?.name || user.name || "Your account"}</p><p className="truncate text-sm text-muted-foreground">{profile?.email || user.email}</p></div>
        </div>
        {isError && <div role="alert" className="mb-5 rounded-xl border border-destructive/25 bg-card p-5">
            <p className="font-medium">We couldn’t load your preferences.</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Check your connection and try again. If your session expired, sign in again.</p>
            <div className="mt-4 flex flex-wrap gap-3">
                <Button type="button" variant="outline" disabled={isFetching} onClick={() => void refetch()}>{isFetching ? "Retrying…" : "Try again"}</Button>
                <ButtonLink variant="ghost" href="/auth/login?next=%2Fprofile">Sign in again</ButtonLink>
            </div>
        </div>}
        {profile && <form noValidate onSubmit={handleSave} aria-busy={updateMutation.isPending} className="account-panel p-6 sm:p-8">
            <fieldset disabled={updateMutation.isPending} className="space-y-7">
                <legend className="sr-only">Job preferences</legend>
                {groups.map((group) => <fieldset key={group.key} className="space-y-3">
                    <legend className="mb-3 text-sm font-semibold">{group.label}</legend>
                    <div className="grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-4">
                        {group.options.map((option) => <div key={option.value} className="flex min-h-11 items-center gap-2">
                            <Checkbox id={`pref-${group.key}-${option.value}`} checked={preferences[group.key].includes(option.value)}
                                onCheckedChange={() => togglePreference(group.key, option.value)} />
                            <Label htmlFor={`pref-${group.key}-${option.value}`} className="flex min-h-11 cursor-pointer items-center text-sm font-normal">{option.label}</Label>
                        </div>)}
                    </div>
                </fieldset>)}
                <div className="space-y-2">
                    <Label htmlFor="preferred-locations">Preferred locations</Label>
                    <Input id="preferred-locations" name="locations" autoComplete="off" className="h-11" placeholder="Bengaluru, Remote, Mumbai" value={preferences.locations}
                        aria-describedby="locations-help" onChange={(event) => { markChanged(); setPreferences({ ...preferences, locations: event.target.value }); }} />
                    <p id="locations-help" className="text-xs text-muted-foreground">Separate multiple locations with commas.</p>
                </div>
            </fieldset>
            <div className="mt-6 min-h-6 text-sm" aria-live="polite">
                {updateMutation.isError ? <p role="alert" className="text-destructive">We couldn’t save your preferences. Your edits are still here; try saving again.</p>
                    : saved ? <p className="text-primary">Preferences saved.</p>
                    : dirty ? <p className="text-muted-foreground">You have unsaved changes.</p> : null}
            </div>
            <Button type="submit" disabled={!dirty || updateMutation.isPending} className="mt-4 h-12 min-w-44 gap-2">
                {updateMutation.isPending ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Save aria-hidden="true" className="h-4 w-4" />}
                {updateMutation.isPending ? "Saving…" : "Save preferences"}
            </Button>
        </form>}
    </div>;
}
