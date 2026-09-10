import type { JobFilters } from "./api";

export const sourceLabels: Record<string, string> = {
    greenhouse: "Greenhouse", lever: "Lever", ashby: "Ashby", smartrecruiters: "SmartRecruiters",
};
export const experienceLabels: Record<string, string> = {
    fresher: "Entry level", "1-3": "1–3 years", "3-5": "3–5 years", "5+": "5+ years",
};
export const jobTypeLabels: Record<string, string> = {
    "full-time": "Full-time", internship: "Internship", "part-time": "Part-time", contract: "Contract",
};
export const degreeLabels: Record<string, string> = { btech: "B.Tech", ballb: "BA LLB", llb: "LLB", any: "Not specified" };

export function parseJobFilters(params: URLSearchParams): JobFilters {
    const filters: JobFilters = { page: 1, limit: 20 };
    for (const key of ["search", "location", "company"] as const) {
        const value = params.get(key)?.trim().slice(0, 200);
        if (value) filters[key] = value;
    }
    const arrays = { source: sourceLabels, experienceLevel: experienceLabels, jobType: jobTypeLabels, degree: degreeLabels };
    for (const key of Object.keys(arrays) as (keyof typeof arrays)[]) {
        const values = Array.from(new Set(params.getAll(key).filter((v) => Object.hasOwn(arrays[key], v))));
        if (values.length) filters[key] = values;
    }
    const posted = params.get("postedWithin");
    if (posted === "24h" || posted === "7d" || posted === "30d") filters.postedWithin = posted;
    if (params.get("remote") === "true") filters.remote = true;
    const page = Number(params.get("page"));
    if (Number.isInteger(page) && page > 0 && page <= 100000) filters.page = page;
    const limit = Number(params.get("limit"));
    if (Number.isInteger(limit) && limit > 0 && limit <= 100) filters.limit = limit;
    return filters;
}

export function serializeJobFilters(filters: JobFilters) {
    const params = new URLSearchParams();
    for (const key of ["search", "location", "company", "postedWithin"] as const) {
        if (filters[key]) params.set(key, filters[key]!);
    }
    for (const key of ["source", "experienceLevel", "jobType", "degree"] as const) {
        filters[key]?.forEach((value) => params.append(key, value));
    }
    if (filters.remote) params.set("remote", "true");
    if ((filters.page || 1) > 1) params.set("page", String(filters.page));
    if (filters.limit && filters.limit !== 20) params.set("limit", String(filters.limit));
    return params.toString();
}

export function countFilters(filters: JobFilters) {
    return (filters.source?.length || 0) + (filters.experienceLevel?.length || 0) +
        (filters.jobType?.length || 0) + (filters.degree?.length || 0) +
        Number(!!filters.postedWithin) + Number(!!filters.remote) + Number(!!filters.company);
}

// Only public web destinations can be opened. Source provenance is shown separately;
// a syntactically valid URL is not an employer verification guarantee.
export function applicationDestination(value: string) {
    if (typeof value !== "string" || /[\u0000-\u001f\u007f\\]/.test(value)) return null;
    try {
        const url = new URL(value);
        const host = url.hostname.toLowerCase().replace(/\.+$/, "");
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
            (url.port && !['80', '443'].includes(url.port)) || !host.includes('.') ||
            /^\d+(\.\d+){3}$/.test(host) || host.includes(':') ||
            /(^|\.)(localhost|local|internal|invalid|test|example)$/.test(host) ||
            /(^|\.)example\.(com|org|net)$/.test(host)) return null;
        return { href: url.href, host: host.replace(/^www\./, '') };
    } catch { return null; }
}

export function displayDate(value: string | null) {
    if (!value || !Number.isFinite(new Date(value).getTime())) return null;
    return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}
