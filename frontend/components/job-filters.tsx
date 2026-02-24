"use client";

import { JobFilters } from "@/lib/api";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, SlidersHorizontal, Scale, Briefcase as BriefcaseIcon, GraduationCap, Clock } from "lucide-react";
import { useState } from "react";

interface JobFiltersProps {
    filters: JobFilters;
    onChange: (filters: JobFilters) => void;
    filterOptions?: {
        companies: string[];
        locations: string[];
    };
}

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
    { value: "bba", label: "BBA LLB" },
    { value: "bsc", label: "B.Sc LLB" },
    { value: "llm", label: "LLM (Master of Law)" },
    { value: "any", label: "Any Degree" },
];

const jobTypes = [
    { value: "full-time", label: "Full-time" },
    { value: "internship", label: "Internship" },
];

// LLB-specific practice areas for quick filtering
const legalSpecializations = [
    { label: "Corporate Law" },
    { label: "Criminal Law" },
    { label: "Intellectual Property" },
    { label: "Tax Law" },
    { label: "Family Law" },
    { label: "Litigation" },
    { label: "Human Rights" },
    { label: "Arbitration" },
];

export function JobFiltersPanel({ filters, onChange, filterOptions }: JobFiltersProps) {
    const [showMobile, setShowMobile] = useState(false);

    const toggleArrayFilter = (key: keyof JobFilters, value: string) => {
        const current = (filters[key] as string[] | undefined) || [];
        const updated = current.includes(value)
            ? current.filter((v) => v !== value)
            : [...current, value];
        onChange({ ...filters, [key]: updated, page: 1 });
    };

    const clearFilters = () => {
        onChange({
            search: filters.search,
            page: 1,
            limit: 20,
        });
    };

    const activeFilterCount =
        (filters.experienceLevel?.length || 0) +
        (filters.degree?.length || 0) +
        (filters.jobType?.length || 0) +
        (filters.location ? 1 : 0) +
        (filters.company ? 1 : 0);

    const FilterContent = () => (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2 text-slate-800 dark:text-slate-100">
                    <SlidersHorizontal className="h-4 w-4 text-indigo-500" />
                    Filters
                    {activeFilterCount > 0 && (
                        <span className="px-2 py-0.5 text-xs bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-full font-medium">
                            {activeFilterCount}
                        </span>
                    )}
                </h3>
                {activeFilterCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-slate-400 hover:text-red-500 h-7 px-2">
                        Clear all
                    </Button>
                )}
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent" />

            {/* Experience Level */}
            <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Experience Level
                </h4>
                <div className="space-y-2.5">
                    {experienceLevels.map((level) => (
                        <div key={level.value} className="flex items-center gap-2.5 group/item">
                            <Checkbox
                                id={`exp-${level.value}`}
                                checked={filters.experienceLevel?.includes(level.value)}
                                onCheckedChange={() => toggleArrayFilter("experienceLevel", level.value)}
                                className="border-slate-300 dark:border-slate-600 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                            />
                            <Label htmlFor={`exp-${level.value}`} className="text-sm cursor-pointer text-slate-600 dark:text-slate-300 group-hover/item:text-slate-900 dark:group-hover/item:text-white transition-colors">
                                {level.label}
                            </Label>
                        </div>
                    ))}
                </div>
            </div>

            <div className="h-px bg-slate-100 dark:bg-slate-800" />

            {/* Degree */}
            <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-1.5">
                    <GraduationCap className="h-3.5 w-3.5" />
                    Degree Required
                </h4>
                <div className="space-y-2.5">
                    {degrees.map((degree) => (
                        <div key={degree.value} className="flex items-center gap-2.5 group/item">
                            <Checkbox
                                id={`deg-${degree.value}`}
                                checked={filters.degree?.includes(degree.value)}
                                onCheckedChange={() => toggleArrayFilter("degree", degree.value)}
                                className="border-slate-300 dark:border-slate-600 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                            />
                            <Label htmlFor={`deg-${degree.value}`} className="text-sm cursor-pointer text-slate-600 dark:text-slate-300 group-hover/item:text-slate-900 dark:group-hover/item:text-white transition-colors">
                                {degree.label}
                            </Label>
                        </div>
                    ))}
                </div>
            </div>

            <div className="h-px bg-slate-100 dark:bg-slate-800" />

            {/* Legal Specializations — quick search tags */}
            <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-1.5">
                    <Scale className="h-3.5 w-3.5" />
                    Legal Specialization
                </h4>
                <div className="flex flex-wrap gap-1.5">
                    {legalSpecializations.map((spec) => {
                        const isActive = filters.search === spec.label;
                        return (
                            <button
                                key={spec.label}
                                onClick={() =>
                                    onChange({
                                        ...filters,
                                        search: isActive ? undefined : spec.label,
                                        page: 1,
                                    })
                                }
                                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-150 border ${isActive
                                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                                    }`}
                            >
                                {spec.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="h-px bg-slate-100 dark:bg-slate-800" />

            {/* Job Type */}
            <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-1.5">
                    <BriefcaseIcon className="h-3.5 w-3.5" />
                    Job Type
                </h4>
                <div className="space-y-2.5">
                    {jobTypes.map((type) => (
                        <div key={type.value} className="flex items-center gap-2.5 group/item">
                            <Checkbox
                                id={`type-${type.value}`}
                                checked={filters.jobType?.includes(type.value)}
                                onCheckedChange={() => toggleArrayFilter("jobType", type.value)}
                                className="border-slate-300 dark:border-slate-600 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                            />
                            <Label htmlFor={`type-${type.value}`} className="text-sm cursor-pointer text-slate-600 dark:text-slate-300 group-hover/item:text-slate-900 dark:group-hover/item:text-white transition-colors">
                                {type.label}
                            </Label>
                        </div>
                    ))}
                </div>
            </div>

            <div className="h-px bg-slate-100 dark:bg-slate-800" />

            {/* Location */}
            <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Location</h4>
                <Input
                    placeholder="e.g. Bangalore, Remote"
                    value={filters.location || ""}
                    onChange={(e) => onChange({ ...filters, location: e.target.value || undefined, page: 1 })}
                    className="h-9 text-sm border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-indigo-500 rounded-lg"
                />
            </div>

            {/* Company */}
            <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Company</h4>
                <Input
                    placeholder="e.g. Google, Microsoft"
                    value={filters.company || ""}
                    onChange={(e) => onChange({ ...filters, company: e.target.value || undefined, page: 1 })}
                    className="h-9 text-sm border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-indigo-500 rounded-lg"
                />
            </div>
        </div>
    );

    return (
        <>
            {/* Desktop Filter Panel */}
            <aside className="hidden lg:block w-64 flex-shrink-0">
                <div className="sticky top-24 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 dark:border-slate-700/60 p-5 shadow-sm">
                    <FilterContent />
                </div>
            </aside>

            {/* Mobile Filter Button */}
            <div className="lg:hidden fixed bottom-6 left-4 right-4 z-40">
                <Button
                    onClick={() => setShowMobile(true)}
                    className="w-full shadow-lg shadow-indigo-500/20 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-full h-12"
                >
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    Filters
                    {activeFilterCount > 0 && ` (${activeFilterCount})`}
                </Button>
            </div>

            {/* Mobile Filter Modal */}
            {showMobile && (
                <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setShowMobile(false)}>
                    <div
                        className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto animate-fade-in-up"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-5" />
                        <div className="flex justify-between items-center mb-5">
                            <h2 className="text-lg font-semibold">Filters</h2>
                            <Button variant="ghost" size="icon" onClick={() => setShowMobile(false)} className="rounded-full">
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                        <FilterContent />
                        <div className="mt-6 flex gap-3">
                            <Button variant="outline" className="flex-1 rounded-full" onClick={clearFilters}>
                                Clear
                            </Button>
                            <Button className="flex-1 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600" onClick={() => setShowMobile(false)}>
                                Apply Filters
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
