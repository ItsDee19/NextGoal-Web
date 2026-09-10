"use client";

import { useEffect, useRef, useState } from "react";
import { JobFilters } from "@/lib/api";
import type { JobFilterUpdate } from "@/lib/job-filter-state";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { countFilters, degreeLabels, experienceLabels, jobTypeLabels, sourceLabels } from "@/lib/job-search";

export function JobFiltersPanel({ filters, onChange }: { filters: JobFilters; onChange: (change: JobFilterUpdate) => void }) {
    const [open, setOpen] = useState(false);
    const companyRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        const media = window.matchMedia("(min-width: 901px)");
        const sync = () => setOpen(media.matches);
        sync();
        media.addEventListener("change", sync);
        return () => media.removeEventListener("change", sync);
    }, []);
    const toggle = (key: "source" | "experienceLevel" | "jobType" | "degree", value: string) => {
        onChange((current) => {
            const values = current[key] || [];
            return { ...current, [key]: values.includes(value) ? values.filter((item) => item !== value) : [...values, value], page: 1 };
        });
    };
    const groups = [
        { key: "experienceLevel" as const, label: "Experience level", values: experienceLabels },
        { key: "jobType" as const, label: "Job type", values: jobTypeLabels },
        { key: "source" as const, label: "Hiring platform", values: sourceLabels },
        { key: "degree" as const, label: "Education", values: degreeLabels },
    ];
    const count = countFilters(filters);
    return <aside aria-label="Job filters">
        <details className="filters-panel" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
            <summary className="filters-title"><SlidersHorizontal size={16} aria-hidden="true" />Filters {count > 0 && <span className="ml-1 rounded bg-accent px-1.5 py-0.5 text-xs text-primary">{count}</span>}<ChevronDown className="mobile-filter-chevron ml-auto" size={16} /></summary>
            <div className="filters-body">
                <div>
                    <label htmlFor="date-posted" className="block text-xs font-semibold mb-2">Date posted</label>
                    <select id="date-posted" className="filter-select" value={filters.postedWithin || ""} onChange={(event) => {
                        const postedWithin = (event.target.value || undefined) as JobFilters["postedWithin"];
                        onChange((current) => ({ ...current, postedWithin, page: 1 }));
                    }}>
                        <option value="">Any time</option><option value="24h">Past 24 hours</option><option value="7d">Past 7 days</option><option value="30d">Past 30 days</option>
                    </select>
                    <label className="filter-check mt-3"><Checkbox checked={!!filters.remote} onCheckedChange={(checked) => onChange((current) => ({ ...current, remote: checked === true || undefined, page: 1 }))} />Remote opportunities</label>
                </div>
                <div className="mt-5 space-y-2">
                    <Label htmlFor="company-filter" className="text-xs font-semibold">Company</Label>
                    <div className="relative">
                        <Input ref={companyRef} id="company-filter" value={filters.company || ""} maxLength={200} placeholder="e.g. Stripe" autoComplete="off" className="h-11 pr-11 text-sm"
                            onChange={(event) => {
                                const company = event.target.value || undefined;
                                onChange((current) => ({ ...current, company, page: 1 }));
                            }} />
                        {filters.company && <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-11 w-11" aria-label="Clear company filter"
                            onClick={() => { onChange((current) => ({ ...current, company: undefined, page: 1 })); companyRef.current?.focus(); }}><X size={13} /></Button>}
                    </div>
                </div>
                {groups.map((group) => <fieldset className="filter-group" key={group.key}>
                    <legend>{group.label}</legend>
                    {Object.entries(group.values).map(([value, label]) => <label className="filter-check" key={value}>
                        <Checkbox checked={filters[group.key]?.includes(value) || false} onCheckedChange={() => toggle(group.key, value)} />{label}
                    </label>)}
                </fieldset>)}
                <div className="col-span-full mt-4">
                    <Button variant="ghost" size="sm" className="w-full text-muted-foreground" disabled={!count} onClick={() => onChange((current) => ({ search: current.search, location: current.location, page: 1, limit: current.limit || 20 }))}><X size={13} className="mr-1.5" />Reset filters</Button>
                    <p className="text-[10px] leading-relaxed text-muted-foreground mt-3">Experience and education may be estimated. Confirm requirements on the application page.</p>
                </div>
            </div>
        </details>
    </aside>;
}
