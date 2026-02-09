import axios from "axios";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const api = axios.create({
    baseURL: API_URL,
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
}

export interface JobFilters {
    search?: string;
    experienceLevel?: string[];
    degree?: string[];
    jobType?: string[];
    location?: string;
    company?: string;
    page?: number;
    limit?: number;
}

export interface JobsResponse {
    jobs: Job[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export const jobsApi = {
    getJobs: async (filters: JobFilters = {}): Promise<JobsResponse> => {
        const params = new URLSearchParams();

        if (filters.search) params.append("search", filters.search);
        if (filters.location) params.append("location", filters.location);
        if (filters.company) params.append("company", filters.company);
        if (filters.page) params.append("page", String(filters.page));
        if (filters.limit) params.append("limit", String(filters.limit));

        filters.experienceLevel?.forEach((level) => params.append("experienceLevel", level));
        filters.degree?.forEach((deg) => params.append("degree", deg));
        filters.jobType?.forEach((type) => params.append("jobType", type));

        const response = await api.get(`/jobs?${params.toString()}`);
        return response.data;
    },

    getJob: async (id: string): Promise<Job> => {
        const response = await api.get(`/jobs/${id}`);
        return response.data;
    },

    getStats: async () => {
        const response = await api.get("/jobs/stats");
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

    getSavedJobs: async (): Promise<Job[]> => {
        const response = await api.get("/users/me/saved-jobs");
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
