"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Job, usersApi } from "@/lib/api";
import { useAuth } from "@/app/providers";
import { Button, ButtonLink } from "@/components/ui/button";
import { MapPin, Bookmark, BookmarkCheck, ArrowUpRight, Loader2, Clock, Link2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { applicationDestination, displayDate, experienceLabels, jobTypeLabels, sourceLabels } from "@/lib/job-search";

interface JobCardProps { job: Job; onSaveToggle?: () => void; isSaved?: boolean; }

export function JobCard({ job, onSaveToggle, isSaved = false }: JobCardProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [saved, setSaved] = useState(isSaved);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [signInNeeded, setSignInNeeded] = useState(false);
    const pending = useRef(false);
    const requestGeneration = useRef(0);
    const currentUser = useRef(user?.id);
    if (currentUser.current !== user?.id) {
        currentUser.current = user?.id;
        requestGeneration.current += 1;
        pending.current = false;
    }
    useEffect(() => { if (!pending.current) setSaved(isSaved); }, [isSaved]);
    useEffect(() => { setSaved(isSaved); setError(""); setSignInNeeded(false); setSaving(false); }, [user?.id]);
    const destination = applicationDestination(job.applyUrl);
    const posted = displayDate(job.postedDate);
    const checked = displayDate(job.lastVerified);
    const available = destination && job.isActive;
    const source = sourceLabels[job.source] || job.source;
    const cleanDescription = job.description?.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
    const description = cleanDescription && cleanDescription.length > 230 ? cleanDescription.slice(0, 227).trimEnd() + "…" : cleanDescription;

    const toggleSave = async () => {
        if (pending.current) return;
        if (!user) { setSignInNeeded(true); return; }
        pending.current = true;
        const generation = ++requestGeneration.current;
        const isCurrentRequest = () => currentUser.current === user.id && requestGeneration.current === generation;
        setSaving(true); setError("");
        try {
            if (saved) await usersApi.unsaveJob(job.id);
            else await usersApi.saveJob(job.id);
            if (!isCurrentRequest()) return;
            const nextSaved = !saved;
            setSaved(nextSaved);
            queryClient.setQueryData<Job[]>(["saved-jobs", user.id], (existing = []) =>
                nextSaved ? [...existing.filter((item) => item.id !== job.id), job] : existing.filter((item) => item.id !== job.id));
            await queryClient.invalidateQueries({ queryKey: ["saved-jobs", user.id] });
            if (!isCurrentRequest()) return;
            toast({ title: nextSaved ? "Job saved" : "Saved job removed" });
            onSaveToggle?.();
        } catch {
            if (isCurrentRequest()) setError("Couldn’t update your saved jobs. Try again.");
        } finally {
            if (isCurrentRequest()) {
                pending.current = false;
                setSaving(false);
            }
        }
    };

    return <article className="job-card" data-active={job.isActive} aria-labelledby={"job-" + job.id}>
        <div className="job-card-header flex items-center gap-3">
            <div className="company-avatar" aria-hidden="true">{job.company.trim().slice(0, 1).toUpperCase()}</div>
            <div className="job-identity min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                    <span className="job-company break-words">{job.company}</span>
                    <span className="source-tag">{source}</span>
                </div>
            </div>
            <Button size="icon" variant="ghost" className="job-save h-11 w-11 shrink-0" onClick={toggleSave} disabled={saving} aria-busy={saving} aria-pressed={saved} aria-label={(saved ? "Remove saved job: " : "Save job: ") + job.title} title={saved ? "Remove saved job" : "Save job"}>
                {saving ? <Loader2 size={18} aria-hidden="true" className="animate-spin" /> : saved ? <BookmarkCheck size={18} aria-hidden="true" /> : <Bookmark size={18} aria-hidden="true" />}
            </Button>
        </div>
        <h3 id={"job-" + job.id} className="job-title display-font break-words">{job.title}</h3>
        <div className="job-card-metadata flex flex-wrap gap-x-4 gap-y-1.5">
            <span className="job-meta"><MapPin size={13} aria-hidden="true" />{job.location || "Location not specified"}</span>
            <span className="job-meta"><Clock size={13} aria-hidden="true" />{posted ? (job.source === "greenhouse" ? "Updated " : "Posted ") + posted : "Posting date unavailable"}</span>
        </div>
        <div className="job-card-tags flex flex-wrap gap-1.5">
            {job.jobType && <span className="job-tag">{jobTypeLabels[job.jobType] || job.jobType}</span>}
            {job.experienceLevel && <span className="job-tag" title="Estimated from the listing. Check the employer’s requirements.">{experienceLabels[job.experienceLevel] || job.experienceLevel}</span>}
            {job.location?.toLowerCase().includes("remote") && <span className="job-tag" data-tone="accent">Remote</span>}
            {job.isTranslated && <span className="job-tag" data-tone="translation">English translation<span className="sr-only">. The original application page may use another language.</span></span>}
        </div>
        {description && <p className="job-card-description line-clamp-2">{description}</p>}
        <div className="job-card-footer flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
                {destination && <span className="job-destination flex items-center gap-1.5 break-all"><Link2 size={13} className="shrink-0" aria-hidden="true" />{destination.host}</span>}
                <p className="job-check">
                    {!job.isActive ? "This listing is no longer active" : job.availabilityCheckPending || job.lastVerificationError ? "Availability check pending" : checked ? "Last checked " + checked : "Check date unavailable"}
                </p>
            </div>
            {available ? <ButtonLink variant="outline" size="sm" className="job-apply h-11 gap-2 px-4" href={destination.href} target="_blank" rel="noopener noreferrer" aria-label={"Apply for " + job.title + " at " + job.company + " (opens in a new tab)"}>Apply <ArrowUpRight size={16} aria-hidden="true" /></ButtonLink> : <span className="text-xs font-medium text-muted-foreground">Application unavailable</span>}
        </div>
        {error && <p role="alert" className="mt-3 text-xs text-destructive">{error}</p>}
        {signInNeeded && <p role="status" className="mt-3 text-xs text-muted-foreground"><Link href={"/auth/login?next=" + encodeURIComponent(window.location.pathname + window.location.search)} className="text-primary underline font-semibold">Sign in</Link> to keep this job in your shortlist.</p>}
    </article>;
}
