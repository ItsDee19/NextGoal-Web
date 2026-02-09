"use client";

import { JobFilters } from "@/lib/api";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, SlidersHorizontal } from "lucide-react";
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
    { value: "any", label: "Any Degree" },
];

const jobTypes = [
    { value: "full-time", label: "Full-time" },
    { value: "internship", label: "Internship" },
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
                <h3 className="font-semibold flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4" />
                    Filters
                    {activeFilterCount > 0 && (
                        <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
                            {activeFilterCount}
                        </span>
                    )}
                </h3>
                {activeFilterCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                        Clear all
                    </Button>
                )}
            </div>

            {/* Experience Level */}
            <div>
                <h4 className="text-sm font-medium mb-3">Experience Level</h4>
                <div className="space-y-2">
                    {experienceLevels.map((level) => (
                        <div key={level.value} className="flex items-center gap-2">
                            <Checkbox
                                id={`exp-${level.value}`}
                                checked={filters.experienceLevel?.includes(level.value)}
                                onCheckedChange={() => toggleArrayFilter("experienceLevel", level.value)}
                            />
                            <Label htmlFor={`exp-${level.value}`} className="text-sm cursor-pointer">
                                {level.label}
                            </Label>
                        </div>
                    ))}
                </div>
            </div>

            {/* Degree */}
            <div>
                <h4 className="text-sm font-medium mb-3">Degree Required</h4>
                <div className="space-y-2">
                    {degrees.map((degree) => (
                        <div key={degree.value} className="flex items-center gap-2">
                            <Checkbox
                                id={`deg-${degree.value}`}
                                checked={filters.degree?.includes(degree.value)}
                                onCheckedChange={() => toggleArrayFilter("degree", degree.value)}
                            />
                            <Label htmlFor={`deg-${degree.value}`} className="text-sm cursor-pointer">
                                {degree.label}
                            </Label>
                        </div>
                    ))}
                </div>
            </div>

            {/* Job Type */}
            <div>
                <h4 className="text-sm font-medium mb-3">Job Type</h4>
                <div className="space-y-2">
                    {jobTypes.map((type) => (
                        <div key={type.value} className="flex items-center gap-2">
                            <Checkbox
                                id={`type-${type.value}`}
                                checked={filters.jobType?.includes(type.value)}
                                onCheckedChange={() => toggleArrayFilter("jobType", type.value)}
                            />
                            <Label htmlFor={`type-${type.value}`} className="text-sm cursor-pointer">
                                {type.label}
                            </Label>
                        </div>
                    ))}
                </div>
            </div>

            {/* Location */}
            <div>
                <h4 className="text-sm font-medium mb-3">Location</h4>
                <Input
                    placeholder="e.g. Bangalore, Remote"
                    value={filters.location || ""}
                    onChange={(e) => onChange({ ...filters, location: e.target.value || undefined, page: 1 })}
                />
            </div>

            {/* Company */}
            <div>
                <h4 className="text-sm font-medium mb-3">Company</h4>
                <Input
                    placeholder="e.g. Google, Microsoft"
                    value={filters.company || ""}
                    onChange={(e) => onChange({ ...filters, company: e.target.value || undefined, page: 1 })}
                />
            </div>
        </div>
    );

    return (
        <>
            {/* Desktop Filter Panel */}
            <aside className="hidden lg:block w-64 flex-shrink-0">
                <div className="sticky top-24 bg-white dark:bg-slate-900 rounded-xl border p-5">
                    <FilterContent />
                </div>
            </aside>

            {/* Mobile Filter Button */}
            <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40">
                <Button
                    onClick={() => setShowMobile(true)}
                    className="w-full shadow-lg bg-gradient-to-r from-blue-600 to-indigo-600"
                >
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    Filters
                    {activeFilterCount > 0 && ` (${activeFilterCount})`}
                </Button>
            </div>

            {/* Mobile Filter Modal */}
            {showMobile && (
                <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setShowMobile(false)}>
                    <div
                        className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold">Filters</h2>
                            <Button variant="ghost" size="icon" onClick={() => setShowMobile(false)}>
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                        <FilterContent />
                        <div className="mt-6 flex gap-3">
                            <Button variant="outline" className="flex-1" onClick={clearFilters}>
                                Clear
                            </Button>
                            <Button className="flex-1" onClick={() => setShowMobile(false)}>
                                Apply
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
