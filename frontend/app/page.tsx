"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { jobsApi, JobFilters as Filters } from "@/lib/api";
import { JobCard } from "@/components/job-card";
import { JobFiltersPanel } from "@/components/job-filters";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Briefcase, TrendingUp, Loader2 } from "lucide-react";

export default function HomePage() {
    const [filters, setFilters] = useState<Filters>({
        page: 1,
        limit: 20,
    });
    const [searchInput, setSearchInput] = useState("");

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

    return (
        <div className="space-y-8">
            {/* Hero Section */}
            <section className="text-center py-8 lg:py-12">
                <h1 className="text-4xl lg:text-5xl font-bold mb-4">
                    <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        Find Your Next Goal
                    </span>
                </h1>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
                    Discover verified job openings from top companies. Real-time aggregation from official career pages.
                </p>

                {/* Search Bar */}
                <div className="max-w-2xl mx-auto relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        placeholder="Search jobs, companies, or skills..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="pl-12 h-14 text-lg rounded-xl shadow-sm border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                </div>

                {/* Stats */}
                {stats && (
                    <div className="flex justify-center gap-8 mt-8">
                        <div className="flex items-center gap-2 text-sm">
                            <Briefcase className="h-4 w-4 text-blue-600" />
                            <span className="font-semibold">{stats.totalActive?.toLocaleString() || 0}</span>
                            <span className="text-muted-foreground">Active Jobs</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <TrendingUp className="h-4 w-4 text-green-600" />
                            <span className="font-semibold">{stats.addedLast24h?.toLocaleString() || 0}</span>
                            <span className="text-muted-foreground">Added Today</span>
                        </div>
                    </div>
                )}
            </section>

            {/* Main Content */}
            <div className="flex gap-8">
                {/* Filters Sidebar */}
                <JobFiltersPanel filters={filters} onChange={setFilters} />

                {/* Job Listings */}
                <main className="flex-1 min-w-0">
                    {/* Results Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="text-sm text-muted-foreground">
                            {data?.pagination?.total
                                ? `Showing ${(data.pagination.page - 1) * data.pagination.limit + 1}-${Math.min(
                                    data.pagination.page * data.pagination.limit,
                                    data.pagination.total
                                )} of ${data.pagination.total} jobs`
                                : "No jobs found"}
                        </div>
                        {isFetching && !isLoading && (
                            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        )}
                    </div>

                    {/* Loading State */}
                    {isLoading ? (
                        <div className="grid gap-4">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="bg-white dark:bg-slate-900 rounded-xl border p-6 animate-pulse">
                                    <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-3/4 mb-4" />
                                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2 mb-4" />
                                    <div className="flex gap-2">
                                        <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-20" />
                                        <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-24" />
                                        <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-16" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : data?.jobs?.length === 0 ? (
                        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl border">
                            <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium mb-2">No jobs found</h3>
                            <p className="text-muted-foreground mb-4">
                                Try adjusting your filters or search terms
                            </p>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setFilters({ page: 1, limit: 20 });
                                    setSearchInput("");
                                }}
                            >
                                Clear all filters
                            </Button>
                        </div>
                    ) : (
                        <>
                            {/* Job Cards */}
                            <div className="grid gap-4">
                                {data?.jobs?.map((job) => (
                                    <JobCard key={job.id} job={job} />
                                ))}
                            </div>

                            {/* Pagination */}
                            {data?.pagination && data.pagination.totalPages > 1 && (
                                <div className="flex justify-center items-center gap-2 mt-8">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={data.pagination.page === 1}
                                        onClick={() => handlePageChange(data.pagination.page - 1)}
                                    >
                                        Previous
                                    </Button>
                                    <div className="flex items-center gap-1">
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
                                                    className="w-9"
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
                                    >
                                        Next
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
