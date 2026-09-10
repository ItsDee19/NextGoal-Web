"use client";

import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { useState, createContext, useContext, useEffect, useCallback, useMemo } from "react";
import Cookies from "js-cookie";
import { supabase } from "@/lib/supabase.config";

// Auth context
interface User {
    id: string;
    email: string;
    name: string | null;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return context;
}

function AuthProvider({ children }: { children: React.ReactNode }) {
    const queryClient = useQueryClient();
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check for stored auth on mount
        const storedToken = Cookies.get("token");
        const storedUser = Cookies.get("user");

        if (storedToken && storedUser) {
            try {
                const parsedUser: unknown = JSON.parse(storedUser);
                if (!parsedUser || typeof parsedUser !== "object" ||
                    !("id" in parsedUser) || typeof parsedUser.id !== "string" ||
                    !("email" in parsedUser) || typeof parsedUser.email !== "string") {
                    throw new Error("Invalid stored session");
                }
                setToken(storedToken);
                setUser({ id: parsedUser.id, email: parsedUser.email,
                    name: "name" in parsedUser && typeof parsedUser.name === "string" ? parsedUser.name : null });
            } catch {
                Cookies.remove("token", { path: "/" });
                Cookies.remove("user", { path: "/" });
            }
        }
        setIsLoading(false);
    }, []);

    const clearUserCache = useCallback(() => {
        const privateQuery = (query: { queryKey: readonly unknown[] }) =>
            ["profile", "saved-jobs", "savedJobs"].includes(String(query.queryKey[0]));
        void queryClient.cancelQueries({ predicate: privateQuery });
        queryClient.removeQueries({ predicate: privateQuery });
        queryClient.getMutationCache().clear();
    }, [queryClient]);

    const login = useCallback((newToken: string, newUser: User) => {
        clearUserCache();
        const cookieOptions = { expires: 7, path: "/", sameSite: "lax" as const, secure: window.location.protocol === "https:" };
        Cookies.set("token", newToken, cookieOptions);
        Cookies.set("user", JSON.stringify(newUser), cookieOptions);
        setToken(newToken);
        setUser(newUser);
    }, [clearUserCache]);

    const logout = useCallback(() => {
        clearUserCache();
        Cookies.remove("token", { path: "/" });
        Cookies.remove("user", { path: "/" });
        setToken(null);
        setUser(null);
        if (supabase) void supabase.auth.signOut().catch(() => undefined);
    }, [clearUserCache]);

    const value = useMemo(() => ({ user, token, login, logout, isLoading }), [user, token, login, logout, isLoading]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 60 * 1000,
                        refetchOnWindowFocus: false,
                    },
                },
            })
    );

    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>{children}</AuthProvider>
        </QueryClientProvider>
    );
}
