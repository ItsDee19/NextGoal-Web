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
    ExternalLink,
    Zap
} from "lucide-react";
import { timeAgo, truncate } from "@/lib/utils";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";

interface JobCardProps {
    job: Job;
    onSaveToggle?: () => void;
    isSaved?: boolean;
    index?: number;
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
    bba: "BBA LLB",
    bsc: "B.Sc LLB",
    llm: "LLM",
    any: "Any Degree",
};

const jobTypeLabels: Record<string, string> = {
    "full-time": "Full-time",
    internship: "Internship",
    "part-time": "Part-time",
    contract: "Contract",
};

const sourceColors: Record<string, string> = {
    greenhouse: "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300",
    lever: "bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300",
    workday: "bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300",
    ashby: "bg-pink-50 dark:bg-pink-950 text-pink-700 dark:text-pink-300",
    smartrecruiters: "bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300",
};

export function JobCard({ job, onSaveToggle, isSaved = false, index = 0 }: JobCardProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [saved, setSaved] = useState(isSaved);
    const [saving, setSaving] = useState(false);
    const [hovered, setHovered] = useState(false);

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

    const sourceColorClass = sourceColors[job.source] || "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400";

    return (
        <div
            className="job-card-stagger animate-fade-in-up opacity-0 group relative job-card-glow rounded-2xl border border-slate-200/80 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-4 sm:p-6 transition-all duration-300 cursor-default"
            style={{ animationFillMode: "forwards" }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* Subtle top accent line that animates on hover */}
            <div
                className={`absolute top-0 left-6 right-6 h-0.5 rounded-full transition-all duration-500 ${hovered
                    ? "bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 opacity-100"
                    : "bg-transparent opacity-0"
                    }`}
            />

            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-200 line-clamp-2 leading-snug">
                        {job.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5 text-slate-500 dark:text-slate-400">
                        <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="text-sm font-medium">{job.company}</span>
                    </div>
                </div>

                {/* Save Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSaveToggle}
                    disabled={saving}
                    className={`flex-shrink-0 h-8 w-8 rounded-full transition-all duration-200 ${saved
                        ? "text-indigo-600 bg-indigo-50 dark:bg-indigo-950 hover:bg-indigo-100"
                        : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950"
                        }`}
                >
                    {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                </Button>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 mt-4">
                {job.location && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors">
                        <MapPin className="h-3 w-3" />
                        {job.location}
                    </span>
                )}
                {job.jobType && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/50">
                        <Briefcase className="h-3 w-3" />
                        {jobTypeLabels[job.jobType] || job.jobType}
                    </span>
                )}
                {job.experienceLevel && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/50">
                        <Clock className="h-3 w-3" />
                        {experienceLevelLabels[job.experienceLevel] || job.experienceLevel}
                    </span>
                )}
                {job.degreeRequired && job.degreeRequired !== "any" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-100 dark:border-violet-900/50">
                        <GraduationCap className="h-3 w-3" />
                        {degreeLabels[job.degreeRequired] || job.degreeRequired}
                    </span>
                )}
                {(job as any).aiClassified && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-900/50">
                        <Zap className="h-3 w-3" />
                        AI Classified
                    </span>
                )}
            </div>

            {/* Description */}
            {job.description && (
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {truncate(job.description, 200)}
                </p>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                    {job.postedDate && (
                        <span>{timeAgo(job.postedDate)}</span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-xs capitalize font-medium ${sourceColorClass}`}>
                        {job.source}
                    </span>
                </div>

                <a
                    href={job.applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 hover:shadow-md hover:shadow-indigo-500/25 hover:-translate-y-0.5"
                >
                    Apply
                    <ExternalLink className="h-3 w-3" />
                </a>
            </div>
        </div>
    );
}
