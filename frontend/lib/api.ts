import axios from "axios";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const api = axios.create({
    baseURL: API_URL,
    timeout: 15000,
    headers: {
        "Content-Type": "application/json",
    },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = Cookies.get("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Auth API
export const authApi = {
    register: async (data: { email: string; password: string; name?: string }) => {
        const response = await api.post("/auth/register", data);
        return response.data;
    },
    login: async (data: { email: string; password: string }) => {
        const response = await api.post("/auth/login", data);
        return response.data;
    },
    supabaseLogin: async (accessToken: string) => {
        const response = await api.post("/auth/supabase", { accessToken });
        return response.data;
    },
};

// Jobs API
export interface Job {
    id: string;
    title: string;
    company: string;
    location: string | null;
    jobType: string | null;
    experienceLevel: string | null;
    degreeRequired: string | null;
    description: string | null;
    applyUrl: string;
    source: string;
    postedDate: string | null;
    lastVerified: string;
    isActive: boolean;
    lastVerificationError?: string | null;
    availabilityCheckPending?: boolean;
    isTranslated?: boolean;
    translatedAt?: string | null;
}

export interface JobFilters {
    search?: string;
    experienceLevel?: string[];
    degree?: string[];
    jobType?: string[];
    location?: string;
    company?: string;
    source?: string[];
    postedWithin?: "24h" | "7d" | "30d";
    remote?: boolean;
    page?: number;
    limit?: number;
}

export interface JobsResponse {
    previewNotice?: string;
    jobs: Job[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface JobStats {
    totalActive: number;
    addedLast24h: number;
    lastVerifiedAt: string | null;
    bySource: { source: string; _count: number }[];
}

export const jobsApi = {
    getJobs: async (filters: JobFilters = {}, signal?: AbortSignal): Promise<JobsResponse> => {
        const params = new URLSearchParams();

        if (filters.search) params.append("search", filters.search);
        if (filters.location) params.append("location", filters.location);
        if (filters.company) params.append("company", filters.company);
        if (filters.page) params.append("page", String(filters.page));
        if (filters.limit) params.append("limit", String(filters.limit));
        if (filters.postedWithin) params.append("postedWithin", filters.postedWithin);
        if (filters.remote) params.append("remote", "true");
        filters.source?.forEach((source) => params.append("source", source));

        filters.experienceLevel?.forEach((level) => params.append("experienceLevel", level));
        filters.degree?.forEach((deg) => params.append("degree", deg));
        filters.jobType?.forEach((type) => params.append("jobType", type));

        const response = await api.get(`/jobs?${params.toString()}`, { signal });
        return response.data;
    },

    getJob: async (id: string): Promise<Job> => {
        const response = await api.get(`/jobs/${id}`);
        return response.data;
    },

    getStats: async (signal?: AbortSignal): Promise<JobStats> => {
        const response = await api.get("/jobs/stats", { signal });
        return response.data;
    },

    getFilters: async () => {
        const response = await api.get("/jobs/filters");
        return response.data;
    },
};

// Users API
export const usersApi = {
    getProfile: async () => {
        const response = await api.get("/users/me");
        return response.data;
    },

    updatePreferences: async (preferences: Record<string, any>) => {
        const response = await api.put("/users/me/preferences", { preferences });
        return response.data;
    },

    getSavedJobs: async (signal?: AbortSignal): Promise<Job[]> => {
        const response = await api.get("/users/me/saved-jobs", { signal });
        return response.data;
    },

    saveJob: async (jobId: string) => {
        const response = await api.post(`/users/me/saved-jobs/${jobId}`);
        return response.data;
    },

    unsaveJob: async (jobId: string) => {
        const response = await api.delete(`/users/me/saved-jobs/${jobId}`);
        return response.data;
    },
};

export default api;
