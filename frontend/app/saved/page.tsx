"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "@/lib/api";
import { useAuth } from "@/app/providers";
import { JobCard } from "@/components/job-card";
import { Button } from "@/components/ui/button";
import { Bookmark, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SavedJobsPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/auth/login");
        }
    }, [user, authLoading, router]);

    const { data: savedJobs, isLoading } = useQuery({
        queryKey: ["saved-jobs"],
        queryFn: () => usersApi.getSavedJobs(),
        enabled: !!user,
    });

    const refetch = () => {
        queryClient.invalidateQueries({ queryKey: ["saved-jobs"] });
    };

    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back to jobs
                </Link>
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-md">
                        <Bookmark className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Saved Jobs</h1>
                        <p className="text-muted-foreground">
                            {savedJobs?.length || 0} saved job{savedJobs?.length !== 1 ? "s" : ""}
                        </p>
                    </div>
                </div>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="grid gap-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="bg-white dark:bg-slate-900 rounded-xl border p-6 animate-pulse">
                            <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-3/4 mb-4" />
                            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                        </div>
                    ))}
                </div>
            ) : savedJobs?.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl border">
                    <Bookmark className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No saved jobs yet</h3>
                    <p className="text-muted-foreground mb-6">
                        Save jobs you're interested in to review them later
                    </p>
                    <Link href="/">
                        <Button>Browse Jobs</Button>
                    </Link>
                </div>
            ) : (
                <div className="grid gap-4">
                    {savedJobs?.map((job) => (
                        <JobCard
                            key={job.id}
                            job={job}
                            isSaved={true}
                            onSaveToggle={refetch}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
