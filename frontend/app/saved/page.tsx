"use client";
import { useQuery } from "@tanstack/react-query";
import { usersApi } from "@/lib/api";
import { useAuth } from "@/app/providers";
import { JobCard } from "@/components/job-card";
import { ResultState } from "@/components/result-state";
import { ButtonLink } from "@/components/ui/button";
import { Bookmark, ArrowLeft, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SavedJobsPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    useEffect(() => { if (!authLoading && !user) router.replace("/auth/login?next=%2Fsaved"); }, [user, authLoading, router]);
    const jobs = useQuery({ queryKey: ["saved-jobs", user?.id], queryFn: ({ signal }) => usersApi.getSavedJobs(signal), enabled: !!user, retry: 1 });
    if (authLoading || !user) return <div className="account-shell max-w-3xl mx-auto py-10"><ResultState kind="loading" title="Loading your shortlist" /></div>;
    return <div className="account-shell max-w-3xl mx-auto py-10">
        <Link href="/" className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-primary"><ArrowLeft size={15} aria-hidden="true" />Back to jobs</Link>
        <header className="collection-header mb-8 flex flex-wrap items-center gap-4">
            <div className="account-mark flex h-12 w-12 items-center justify-center"><Bookmark size={22} aria-hidden="true" /></div>
            <div className="min-w-0 flex-1"><p className="eyebrow mb-2 text-primary">Saved for later</p><h1 className="premium-heading">Your shortlist</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">The roles you want to come back to. Take the next step when you’re ready.</p></div>
            {jobs.data && <span className="collection-count" role="status">{jobs.data.length.toLocaleString("en-IN")} {jobs.data.length === 1 ? "opportunity" : "opportunities"}</span>}
        </header>
        {jobs.isPending ? <ResultState kind="loading" title="Loading saved jobs" /> :
        jobs.isError ? <ResultState kind="error" title="Your shortlist couldn’t be loaded" description="Try again to see your saved jobs." action="Try again" onAction={() => jobs.refetch()} /> :
        !jobs.data?.length ? <div className="result-state"><div className="state-icon flex h-14 w-14 items-center justify-center"><Bookmark size={25} aria-hidden="true" /></div><h2 className="state-title display-font">Make room for your next move</h2><p className="state-description max-w-sm">Save a job while you browse and it will be here when you need it.</p><ButtonLink href="/" className="h-11 gap-2">Find jobs<ArrowUpRight size={16} aria-hidden="true" /></ButtonLink></div> :
        <div className="grid gap-4">{jobs.data.map((job) => <JobCard key={job.id} job={job} isSaved />)}</div>}
    </div>;
}
