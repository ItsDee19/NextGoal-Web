"use client";

import { Job, usersApi } from "@/lib/api";
import { useAuth } from "@/app/providers";
import { Button } from "@/components/ui/button";
import {
    MapPin,
    Building2,
    Clock,
    Briefcase,
    GraduationCap,
    Bookmark,
    BookmarkCheck,
    ExternalLink
} from "lucide-react";
import { timeAgo, truncate } from "@/lib/utils";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";

interface JobCardProps {
    job: Job;
    onSaveToggle?: () => void;
    isSaved?: boolean;
}

const experienceLevelLabels: Record<string, string> = {
    fresher: "Fresher",
    "1-3": "1-3 Years",
    "3-5": "3-5 Years",
    "5+": "5+ Years",
};

const degreeLabels: Record<string, string> = {
    btech: "B.Tech",
    ballb: "BA LLB",
    llb: "LLB",
    any: "Any Degree",
};

const jobTypeLabels: Record<string, string> = {
    "full-time": "Full-time",
    internship: "Internship",
    "part-time": "Part-time",
    contract: "Contract",
};

export function JobCard({ job, onSaveToggle, isSaved = false }: JobCardProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [saved, setSaved] = useState(isSaved);
    const [saving, setSaving] = useState(false);

    const handleSaveToggle = async () => {
        if (!user) {
            toast({
                title: "Sign in required",
                description: "Please sign in to save jobs",
                variant: "destructive",
            });
            return;
        }

        setSaving(true);
        try {
            if (saved) {
                await usersApi.unsaveJob(job.id);
                toast({ title: "Job removed from saved" });
            } else {
                await usersApi.saveJob(job.id);
                toast({ title: "Job saved!" });
            }
            setSaved(!saved);
            onSaveToggle?.();
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to update saved job",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="group relative bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                        {job.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                        <Building2 className="h-4 w-4 flex-shrink-0" />
                        <span className="font-medium">{job.company}</span>
                    </div>
                </div>

                {/* Save Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSaveToggle}
                    disabled={saving}
                    className={saved ? "text-blue-600" : "text-muted-foreground hover:text-blue-600"}
                >
                    {saved ? <BookmarkCheck className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
                </Button>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mt-4">
                {job.location && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        <MapPin className="h-3 w-3" />
                        {job.location}
                    </span>
                )}
                {job.jobType && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                        <Briefcase className="h-3 w-3" />
                        {jobTypeLabels[job.jobType] || job.jobType}
                    </span>
                )}
                {job.experienceLevel && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300">
                        <Clock className="h-3 w-3" />
                        {experienceLevelLabels[job.experienceLevel] || job.experienceLevel}
                    </span>
                )}
                {job.degreeRequired && job.degreeRequired !== "any" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                        <GraduationCap className="h-3 w-3" />
                        {degreeLabels[job.degreeRequired] || job.degreeRequired}
                    </span>
                )}
            </div>

            {/* Description */}
            {job.description && (
                <p className="mt-4 text-sm text-muted-foreground line-clamp-2">
                    {truncate(job.description, 200)}
                </p>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {job.postedDate && (
                        <span>{timeAgo(job.postedDate)}</span>
                    )}
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 capitalize">
                        {job.source}
                    </span>
                </div>

                <a
                    href={job.applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                    Apply
                    <ExternalLink className="h-4 w-4" />
                </a>
            </div>
        </div>
    );
}
