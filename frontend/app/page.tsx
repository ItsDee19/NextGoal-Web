"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { jobsApi, usersApi } from "@/lib/api";
import { useAuth } from "./providers";
import { JobCard } from "@/components/job-card";
import { JobFiltersPanel } from "@/components/job-filters";
import { ResultState } from "@/components/result-state";
import { Button, ButtonLink } from "@/components/ui/button";
import { ArrowDown, ArrowRight, ArrowUpRight, Bookmark, ChevronLeft, ChevronRight, Clock3, Globe2, Languages, Loader2, MapPin, Orbit, RefreshCw, Search, X } from "lucide-react";
import { countFilters, displayDate, sourceLabels } from "@/lib/job-search";
import { useJobFilterState } from "@/lib/use-job-filter-state";

function JobDiscovery() {
    const params = useSearchParams();
    const { user } = useAuth();
    const { filters, navigationVersion, updateFilters } = useJobFilterState(params.toString());
    const [searchInput, setSearchInput] = useState(filters.search || "");
    const [locationInput, setLocationInput] = useState(filters.location || "");
    const [composing, setComposing] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);
    const locationRef = useRef<HTMLInputElement>(null);
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const cancelPendingSearch = useCallback(() => {
        if (searchTimer.current !== null) clearTimeout(searchTimer.current);
        searchTimer.current = null;
    }, []);

    useEffect(() => { cancelPendingSearch(); setSearchInput(filters.search || ""); }, [filters.search, navigationVersion, cancelPendingSearch]);
    useEffect(() => { setLocationInput(filters.location || ""); }, [filters.location, navigationVersion]);
    useEffect(() => {
        cancelPendingSearch();
        if (composing || searchInput.trim() === (filters.search || "")) return;
        searchTimer.current = setTimeout(() => {
            searchTimer.current = null;
            updateFilters((current) => ({ ...current, search: searchInput.trim() || undefined, page: 1 }));
        }, 300);
        return cancelPendingSearch;
    }, [searchInput, composing, filters.search, navigationVersion, updateFilters, cancelPendingSearch]);

    const jobs = useQuery({
        queryKey: ["jobs", filters],
        queryFn: ({ signal }) => jobsApi.getJobs(filters, signal),
        placeholderData: keepPreviousData,
        retry: 1,
    });
    const stats = useQuery({ queryKey: ["jobs-stats"], queryFn: ({ signal }) => jobsApi.getStats(signal), retry: 1 });
    const savedJobs = useQuery({ queryKey: ["saved-jobs", user?.id], queryFn: ({ signal }) => usersApi.getSavedJobs(signal), enabled: !!user, retry: 1 });
    const savedIds = new Set(savedJobs.data?.map((job) => job.id) || []);
    const data = jobs.data;
    const hasFilters = !!(filters.search || filters.location || countFilters(filters));
    const checked = displayDate(stats.data?.lastVerifiedAt || null);
    const totalPages = data?.pagination.totalPages || 0;
    useEffect(() => {
        if (data && !jobs.isPlaceholderData && !jobs.isFetching && totalPages > 0 && (filters.page || 1) > totalPages) {
            updateFilters((current) => ({ ...current, page: totalPages }));
        }
    }, [data, jobs.isPlaceholderData, jobs.isFetching, totalPages, filters, updateFilters]);

    const clearAll = () => { cancelPendingSearch(); setSearchInput(""); setLocationInput(""); updateFilters({ page: 1, limit: 20 }); };
    const changePage = (page: number) => {
        updateFilters((current) => ({ ...current, page }));
        document.getElementById("opportunities")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
    };
    const commitSearch = () => {
        cancelPendingSearch();
        updateFilters((current) => ({ ...current, search: searchInput.trim() || undefined, location: locationInput.trim() || undefined, page: 1 }));
    };
    const topics = [{ label: "Engineering", query: "Engineer" }, { label: "Design", query: "Design" }, { label: "Marketing", query: "Marketing" }, { label: "Data & analytics", query: "Data" }];

    return <>
        {data?.previewNotice && <p role="status" className="preview-notice">{data.previewNotice}</p>}
        <section className="hero" aria-labelledby="discovery-title">
            <div className="hero-content">
                <p className="hero-eyebrow"><Orbit size={14} aria-hidden="true" />A world of opportunity. One next move.</p>
                <h1 id="discovery-title">Your future.<br /><span className="hero-highlight">Within reach.</span></h1>
                <p className="hero-copy">Discover roles across company hiring boards.<br className="hidden sm:block" /> Less searching. More possibility. Your next goal starts here.</p>
                <div className="hero-promises"><span><RefreshCw size={13} aria-hidden="true" />Daily collection</span><span><Languages size={14} aria-hidden="true" />English listings</span><span><ArrowUpRight size={14} aria-hidden="true" />Direct applications</span></div>
            </div>
            <div className="career-orbit" aria-hidden="true">
                <div className="orbit-halo" /><div className="orbit-ring orbit-ring-one" /><div className="orbit-ring orbit-ring-two" /><div className="orbit-ring orbit-ring-three" />
                <div className="orbit-center"><ArrowUpRight size={82} strokeWidth={1.2} /></div>
                <span className="orbit-node orbit-node-one"><span className="orbit-dot" />Your next role</span>
                <span className="orbit-node orbit-node-two"><Globe2 size={15} />More possibilities</span>
                <span className="orbit-star orbit-star-one" /><span className="orbit-star orbit-star-two" /><span className="orbit-star orbit-star-three" />
                <span className="orbit-caption">GO FURTHER WITH NEXTGOAL</span>
            </div>
        </section>

        <form className="search-form" role="search" noValidate onKeyDown={(event) => { if (event.key === "Enter" && event.nativeEvent.isComposing) event.preventDefault(); }} onSubmit={(e) => { e.preventDefault(); if (!composing) commitSearch(); }}>
            <div className="search-field">
                <Search size={20} className="text-muted-foreground shrink-0" aria-hidden="true" />
                <label htmlFor="job-search" className="sr-only">Job title, company, or keyword</label>
                <input ref={searchRef} id="job-search" autoComplete="off" placeholder="Job title, company, or keyword" value={searchInput} maxLength={200} onCompositionStart={() => { cancelPendingSearch(); setComposing(true); }} onCompositionEnd={() => setComposing(false)} onChange={(e) => setSearchInput(e.target.value)} />
                {searchInput && <Button type="button" variant="ghost" size="icon" className="shrink-0" aria-label="Clear job search" onClick={() => { cancelPendingSearch(); setSearchInput(""); updateFilters((current) => ({ ...current, search: undefined, page: 1 })); searchRef.current?.focus(); }}><X size={16} /></Button>}
            </div>
            <div className="search-field">
                <MapPin size={19} className="text-muted-foreground shrink-0" aria-hidden="true" />
                <label htmlFor="job-location" className="sr-only">City, country, or remote</label>
                <input ref={locationRef} id="job-location" autoComplete="off" placeholder="City, country, or remote" value={locationInput} maxLength={200} onChange={(e) => setLocationInput(e.target.value)} onCompositionStart={() => { cancelPendingSearch(); setComposing(true); }} onCompositionEnd={() => setComposing(false)} />
                {locationInput && <Button type="button" variant="ghost" size="icon" className="shrink-0" aria-label="Clear location" onClick={() => { setLocationInput(""); updateFilters((current) => ({ ...current, location: undefined, page: 1 })); locationRef.current?.focus(); }}><X size={16} /></Button>}
            </div>
            <Button type="submit" className="search-submit">Find jobs <ArrowRight size={17} aria-hidden="true" /></Button>
        </form>
        <div className="topic-list">
            <span className="text-xs text-muted-foreground mr-1">Explore roles</span>
            {topics.map((topic) => <button key={topic.query} type="button" className="topic-chip" aria-pressed={filters.search === topic.query} onClick={() => { cancelPendingSearch(); setSearchInput(topic.query); updateFilters((current) => ({ ...current, search: topic.query, page: 1 })); }}>{topic.label}</button>)}
        </div>

        <div className="platform-strip" aria-label="Search by hiring platform">
            <span className="platform-intro">Explore company boards on</span>
            <div className="platform-links">{Object.entries(sourceLabels).map(([key, label]) => <button type="button" key={key} className="platform-link" aria-label={"Filter by " + label} aria-pressed={filters.source?.length === 1 && filters.source[0] === key} onClick={() => updateFilters((current) => ({ ...current, source: [key], page: 1 }))}><span className="platform-initial" aria-hidden="true">{label[0]}</span>{label}<ArrowUpRight size={13} aria-hidden="true" /></button>)}</div>
        </div>

        <div className="discovery-grid">
            <JobFiltersPanel filters={filters} onChange={updateFilters} />
            <section id="opportunities" className="min-w-0 scroll-mt-6" aria-labelledby="results-title" aria-busy={jobs.isFetching}>
                <div className="results-heading">
                    <h2 id="results-title" className="display-font text-xl font-semibold">{hasFilters ? "Your search results" : "Explore opportunities"} {data && <span className="results-count">{data.pagination.total.toLocaleString("en-IN")}</span>}</h2>
                    <span className="results-sort">{jobs.isFetching && !jobs.isPending ? <><Loader2 size={13} className="animate-spin" />Updating</> : <>Newest first<ArrowDown size={12} /></>}</span>
                </div>
                {hasFilters && <div className="flex flex-wrap items-center gap-2 mb-4 text-xs">
                    {filters.search && <span className="job-tag">“{filters.search}”</span>}
                    {filters.location && <span className="job-tag">{filters.location}</span>}
                    <button type="button" onClick={clearAll} className="text-primary hover:underline py-1">Clear search &amp; filters</button>
                </div>}
                {savedJobs.isError && user && <p role="alert" className="text-xs text-destructive mb-3">Saved status is unavailable. <button className="underline" onClick={() => savedJobs.refetch()}>Retry saved jobs</button></p>}
                {jobs.isError && data && <p role="alert" className="text-sm text-destructive mb-4">Couldn’t refresh jobs. These are earlier results. <button className="underline" onClick={() => jobs.refetch()}>Try again</button></p>}
                {jobs.isPending ? <ResultState kind="loading" title="Finding your next opportunity" description="Loading jobs from the latest collection." /> :
                    jobs.isError && !data ? <ResultState kind="error" title="Jobs couldn’t be loaded" description="The job service is temporarily unavailable. Your search and filters are still here." action="Try again" onAction={() => jobs.refetch()} /> :
                    !data?.jobs.length ? <ResultState kind="empty" title={hasFilters ? "A different search might open doors" : "The next collection is on its way"} description={hasFilters ? "Try a broader job title, another location, or fewer filters." : "There are no active jobs to show yet. Check back after the next collection."} action={hasFilters ? "Clear search & filters" : "Check again"} onAction={hasFilters ? clearAll : () => jobs.refetch()} /> :
                    <div className="opportunities-list">{data.jobs.map((job) => <JobCard key={job.id} job={job} isSaved={savedIds.has(job.id)} />)}</div>}
                {data && data.pagination.total > 0 && <div className="mt-5 flex flex-wrap justify-between items-center gap-3">
                    <p className="text-[11px] text-muted-foreground" role="status">{(data.pagination.page - 1) * data.pagination.limit + 1}–{Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} of {data.pagination.total.toLocaleString("en-IN")} opportunities</p>
                    {totalPages > 1 && <nav aria-label="Job results pages" className="flex gap-1.5 items-center">
                        <Button variant="outline" size="icon" aria-label="Previous page" disabled={data.pagination.page === 1 || jobs.isFetching} onClick={() => changePage(data.pagination.page - 1)}><ChevronLeft size={16} /></Button>
                        <span className="px-2 text-xs" aria-current="page">Page {data.pagination.page} of {totalPages}</span>
                        <Button variant="outline" size="icon" aria-label="Next page" disabled={data.pagination.page >= totalPages || jobs.isFetching} onClick={() => changePage(data.pagination.page + 1)}><ChevronRight size={16} /></Button>
                    </nav>}
                </div>}
            </section>

            <aside className="discovery-aside" aria-label="About job discovery">
                <section className="side-card shortlist-card">
                    <Bookmark size={20} className="text-primary mb-4" aria-hidden="true" />
                    <h2>Good roles deserve a shortlist.</h2>
                    <p className="mt-2 mb-4">Keep your favourites together. Take the next step when you’re ready.</p>
                    <ButtonLink size="sm" variant="outline" className="w-full" href={user ? "/saved" : "/auth/register"}>{user ? "View saved jobs" : "Create your shortlist"}<ArrowUpRight size={14} className="ml-2" /></ButtonLink>
                </section>
                <section className="side-card">
                    <RefreshCw size={20} className="text-primary mb-4" aria-hidden="true" /><h2>A new day. New possibilities.</h2>
                    <p className="mt-2">Collection is scheduled every 24 hours across our configured company boards.</p>
                    <div className="freshness-note"><Clock3 size={13} className="shrink-0" aria-hidden="true" /><span>{checked ? "Latest link check: " + checked : "Link check dates appear on each listing."}</span></div>
                </section>
                <section id="how-it-works" className="side-card scroll-mt-6">
                    <ArrowUpRight size={22} className="text-primary mb-4" aria-hidden="true" /><h2>Your next step, directly.</h2>
                    <p className="mt-2">Read roles in English, then apply on the original hiring website. The destination is always visible.</p>
                    <p className="mt-3">Availability and the application page’s language may vary.</p>
                </section>
            </aside>
        </div>
    </>;
}

export default function HomePage() {
    return <Suspense fallback={<div className="py-12"><ResultState kind="loading" title="Loading job search" /></div>}><JobDiscovery /></Suspense>;
}
