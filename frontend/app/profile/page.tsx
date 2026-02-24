"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "@/lib/api";
import { useAuth } from "@/app/providers";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { User, Settings, Loader2, ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const experienceLevels = [
    { value: "fresher", label: "Fresher" },
    { value: "1-3", label: "1-3 Years" },
    { value: "3-5", label: "3-5 Years" },
    { value: "5+", label: "5+ Years" },
];

const degrees = [
    { value: "btech", label: "B.Tech" },
    { value: "ballb", label: "BA LLB" },
    { value: "llb", label: "LLB" },
    { value: "any", label: "Any Degree" },
];

const jobTypes = [
    { value: "full-time", label: "Full-time" },
    { value: "internship", label: "Internship" },
];

export default function ProfilePage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [preferences, setPreferences] = useState({
        experienceLevel: [] as string[],
        degree: [] as string[],
        jobType: [] as string[],
        locations: "",
    });

    const { data: profile, isLoading } = useQuery({
        queryKey: ["profile"],
        queryFn: () => usersApi.getProfile(),
        enabled: !!user,
    });

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/auth/login");
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (profile?.preferences) {
            setPreferences({
                experienceLevel: profile.preferences.experienceLevel || [],
                degree: profile.preferences.degree || [],
                jobType: profile.preferences.jobType || [],
                locations: (profile.preferences.locations || []).join(", "),
            });
        }
    }, [profile]);

    const updateMutation = useMutation({
        mutationFn: (prefs: Record<string, any>) => usersApi.updatePreferences(prefs),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["profile"] });
            toast({ title: "Preferences saved!" });
        },
        onError: () => {
            toast({ title: "Failed to save preferences", variant: "destructive" });
        },
    });

    const handleSave = () => {
        updateMutation.mutate({
            experienceLevel: preferences.experienceLevel,
            degree: preferences.degree,
            jobType: preferences.jobType,
            locations: preferences.locations.split(",").map((l) => l.trim()).filter(Boolean),
        });
    };

    const togglePreference = (key: "experienceLevel" | "degree" | "jobType", value: string) => {
        setPreferences((prev) => ({
            ...prev,
            [key]: prev[key].includes(value)
                ? prev[key].filter((v: string) => v !== value)
                : [...prev[key], value],
        }));
    };

    if (authLoading || isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back to jobs
                </Link>
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-md">
                        <User className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">{profile?.name || "Your Profile"}</h1>
                        <p className="text-muted-foreground">{profile?.email}</p>
                    </div>
                </div>
            </div>

            {/* Preferences */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-6">
                    <Settings className="h-5 w-5" />
                    <h2 className="text-lg font-semibold">Job Preferences</h2>
                </div>

                <div className="space-y-6">
                    {/* Experience Level */}
                    <div>
                        <h3 className="text-sm font-medium mb-3">Preferred Experience Level</h3>
                        <div className="flex flex-wrap gap-3 sm:gap-4">
                            {experienceLevels.map((level) => (
                                <div key={level.value} className="flex items-center gap-2">
                                    <Checkbox
                                        id={`pref-exp-${level.value}`}
                                        checked={preferences.experienceLevel.includes(level.value)}
                                        onCheckedChange={() => togglePreference("experienceLevel", level.value)}
                                    />
                                    <Label htmlFor={`pref-exp-${level.value}`} className="cursor-pointer">
                                        {level.label}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Degree */}
                    <div>
                        <h3 className="text-sm font-medium mb-3">Preferred Degree</h3>
                        <div className="flex flex-wrap gap-4">
                            {degrees.map((degree) => (
                                <div key={degree.value} className="flex items-center gap-2">
                                    <Checkbox
                                        id={`pref-deg-${degree.value}`}
                                        checked={preferences.degree.includes(degree.value)}
                                        onCheckedChange={() => togglePreference("degree", degree.value)}
                                    />
                                    <Label htmlFor={`pref-deg-${degree.value}`} className="cursor-pointer">
                                        {degree.label}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Job Type */}
                    <div>
                        <h3 className="text-sm font-medium mb-3">Preferred Job Type</h3>
                        <div className="flex flex-wrap gap-4">
                            {jobTypes.map((type) => (
                                <div key={type.value} className="flex items-center gap-2">
                                    <Checkbox
                                        id={`pref-type-${type.value}`}
                                        checked={preferences.jobType.includes(type.value)}
                                        onCheckedChange={() => togglePreference("jobType", type.value)}
                                    />
                                    <Label htmlFor={`pref-type-${type.value}`} className="cursor-pointer">
                                        {type.label}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Locations */}
                    <div>
                        <h3 className="text-sm font-medium mb-3">Preferred Locations</h3>
                        <input
                            type="text"
                            placeholder="e.g. Bangalore, Remote, Mumbai"
                            value={preferences.locations}
                            onChange={(e) => setPreferences({ ...preferences, locations: e.target.value })}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Separate multiple locations with commas</p>
                    </div>
                </div>

                <Button
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                    className="mt-8 bg-gradient-to-r from-blue-600 to-indigo-600"
                >
                    {updateMutation.isPending ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Preferences
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
