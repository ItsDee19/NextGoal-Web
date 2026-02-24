"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { jobsApi, JobFilters as Filters } from "@/lib/api";
import { JobCard } from "@/components/job-card";
import { JobFiltersPanel } from "@/components/job-filters";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Briefcase, TrendingUp, Loader2, Sparkles, ArrowRight } from "lucide-react";

export default function HomePage() {
    const [filters, setFilters] = useState<Filters>({
        page: 1,
        limit: 20,
    });
    const [searchInput, setSearchInput] = useState("");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            setFilters((f) => ({ ...f, search: searchInput || undefined, page: 1 }));
        }, 300);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const { data, isLoading, isFetching } = useQuery({
        queryKey: ["jobs", filters],
        queryFn: () => jobsApi.getJobs(filters),
    });

    const { data: stats } = useQuery({
        queryKey: ["jobs-stats"],
        queryFn: () => jobsApi.getStats(),
    });

    const handlePageChange = (newPage: number) => {
        setFilters((f) => ({ ...f, page: newPage }));
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const quickSearchTerms = ["LLB", "Corporate Law", "Legal Intern", "BTech", "Remote", "Fresher"];

    return (
        <div className="space-y-10">
            {/* Hero Section */}
            <section className={`relative text-center py-8 sm:py-12 lg:py-16 transition-opacity duration-700 ${mounted ? "opacity-100" : "opacity-0"}`}>
                {/* Decorative floating blobs */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
                    <div className="absolute top-0 left-1/4 w-72 h-72 bg-blue-400/10 dark:bg-blue-600/10 rounded-full blur-3xl animate-float-dot" style={{ animationDelay: "0s" }} />
                    <div className="absolute top-10 right-1/4 w-56 h-56 bg-indigo-400/10 dark:bg-indigo-600/10 rounded-full blur-3xl animate-float-dot" style={{ animationDelay: "1.5s" }} />
                    <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-purple-400/10 dark:bg-purple-600/10 rounded-full blur-3xl animate-float-dot" style={{ animationDelay: "0.8s" }} />
                </div>

                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 animate-fade-in-up" style={{ animationDelay: "0ms" }}>
                    <Sparkles className="h-3.5 w-3.5" />
                    AI-Powered Job Discovery
                    <ArrowRight className="h-3.5 w-3.5" />
                </div>

                {/* Headline */}
                <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold mb-5 tracking-tight">
                    <span
                        className="inline-block bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent animate-reveal-clip heading-underline"
                        style={{ backgroundSize: "200% auto", animationDelay: "0ms", animationFillMode: "both" }}
                    >
                        Find Your Next Goal
                    </span>
                </h1>
                <p className="animate-letter-spacing-in text-slate-500 dark:text-slate-400 text-base sm:text-lg max-w-md sm:max-w-xl mx-auto mb-6 sm:mb-8 leading-relaxed opacity-0" style={{ animationDelay: "500ms", animationFillMode: "forwards" }}>
                    Discover verified job openings from top companies. Real-time aggregation from official career pages.
                </p>

                {/* Search Bar */}
                <div className="animate-fade-in-up max-w-2xl mx-auto relative" style={{ animationDelay: "240ms", animationFillMode: "both" }}>
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input
                        placeholder="Search jobs, companies, or skills..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="pl-12 h-14 text-base rounded-2xl shadow-sm border-slate-200 dark:border-slate-700 focus:border-indigo-400 focus:ring-indigo-400 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm pr-4"
                    />
                    {searchInput && (
                        <button
                            onClick={() => setSearchInput("")}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* Quick Search Tags */}
                <div className="animate-fade-in-up flex flex-wrap justify-center gap-2 mt-4" style={{ animationDelay: "320ms", animationFillMode: "both" }}>
                    {quickSearchTerms.map((term) => (
                        <button
                            key={term}
                            onClick={() => setSearchInput(term)}
                            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all duration-150 ${searchInput === term
                                ? "bg-indigo-600 text-white border-indigo-600"
                                : "bg-white/70 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                                }`}
                        >
                            {term}
                        </button>
                    ))}
                </div>

                {/* Stats */}
                {stats && (
                    <div className="animate-fade-in-up flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-6 mt-6 sm:mt-8" style={{ animationDelay: "400ms", animationFillMode: "both" }}>
                        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-700/60 shadow-sm backdrop-blur-sm">
                            <Briefcase className="h-4 w-4 text-blue-600" />
                            <span className="font-bold text-slate-900 dark:text-white">{stats.totalActive?.toLocaleString() || 0}</span>
                            <span className="text-sm text-slate-500 dark:text-slate-400">Active Jobs</span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-700/60 shadow-sm backdrop-blur-sm">
                            <TrendingUp className="h-4 w-4 text-emerald-600" />
                            <span className="font-bold text-slate-900 dark:text-white">{stats.addedLast24h?.toLocaleString() || 0}</span>
                            <span className="text-sm text-slate-500 dark:text-slate-400">Added Today</span>
                        </div>
                    </div>
                )}
            </section>

            {/* Main Content */}
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
                {/* Filters Sidebar */}
                <JobFiltersPanel filters={filters} onChange={setFilters} />

                {/* Job Listings */}
                <main className="flex-1 min-w-0">
                    {/* Results Header */}
                    <div className="flex items-center justify-between mb-5">
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                            {data?.pagination?.total
                                ? `Showing ${(data.pagination.page - 1) * data.pagination.limit + 1}–${Math.min(
                                    data.pagination.page * data.pagination.limit,
                                    data.pagination.total
                                )} of ${data.pagination.total.toLocaleString()} jobs`
                                : isLoading ? "" : "No jobs found"}
                        </div>
                        {isFetching && !isLoading && (
                            <div className="flex items-center gap-1.5 text-xs text-indigo-500">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Updating...
                            </div>
                        )}
                    </div>

                    {/* Loading State — Shimmer */}
                    {isLoading ? (
                        <div className="grid gap-4">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="rounded-2xl border border-slate-200 dark:border-slate-800 p-6 overflow-hidden">
                                    <div className="h-5 shimmer rounded-full w-3/4 mb-3" />
                                    <div className="h-4 shimmer rounded-full w-1/3 mb-4" />
                                    <div className="flex gap-2 mb-4">
                                        <div className="h-6 shimmer rounded-full w-20" />
                                        <div className="h-6 shimmer rounded-full w-24" />
                                        <div className="h-6 shimmer rounded-full w-16" />
                                    </div>
                                    <div className="h-3 shimmer rounded-full w-full mb-2" />
                                    <div className="h-3 shimmer rounded-full w-5/6" />
                                </div>
                            ))}
                        </div>
                    ) : data?.jobs?.length === 0 ? (
                        <div className="text-center py-20 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm animate-fade-in-scale">
                            <Briefcase className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                            <h3 className="text-lg font-semibold mb-2 text-slate-700 dark:text-slate-300">No jobs found</h3>
                            <p className="text-sm text-slate-400 dark:text-slate-500 mb-5">
                                Try adjusting your filters or search terms
                            </p>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setFilters({ page: 1, limit: 20 });
                                    setSearchInput("");
                                }}
                                className="rounded-full"
                            >
                                Clear all filters
                            </Button>
                        </div>
                    ) : (
                        <>
                            {/* Job Cards */}
                            <div className="grid gap-3">
                                {data?.jobs?.map((job, i) => (
                                    <JobCard key={job.id} job={job} index={i} />
                                ))}
                            </div>

                            {/* Pagination */}
                            {data?.pagination && data.pagination.totalPages > 1 && (
                                <div className="flex justify-center items-center gap-1 sm:gap-2 mt-8 sm:mt-10">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={data.pagination.page === 1}
                                        onClick={() => handlePageChange(data.pagination.page - 1)}
                                        className="rounded-full px-4"
                                    >
                                        ← Prev
                                    </Button>
                                    <div className="hidden sm:flex items-center gap-1">
                                        {[...Array(Math.min(5, data.pagination.totalPages))].map((_, i) => {
                                            let page: number;
                                            if (data.pagination.totalPages <= 5) {
                                                page = i + 1;
                                            } else if (data.pagination.page <= 3) {
                                                page = i + 1;
                                            } else if (data.pagination.page >= data.pagination.totalPages - 2) {
                                                page = data.pagination.totalPages - 4 + i;
                                            } else {
                                                page = data.pagination.page - 2 + i;
                                            }
                                            return (
                                                <Button
                                                    key={page}
                                                    variant={data.pagination.page === page ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() => handlePageChange(page)}
                                                    className={`w-9 h-9 rounded-full ${data.pagination.page === page ? "bg-gradient-to-r from-blue-600 to-indigo-600 border-0" : ""}`}
                                                >
                                                    {page}
                                                </Button>
                                            );
                                        })}
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={data.pagination.page === data.pagination.totalPages}
                                        onClick={() => handlePageChange(data.pagination.page + 1)}
                                        className="rounded-full px-4"
                                    >
                                        Next →
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}
