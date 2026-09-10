import type { JobFilters } from "./api";
import { parseJobFilters, serializeJobFilters } from "./job-search";

export type JobFilterUpdate = JobFilters | ((current: JobFilters) => JobFilters);

/** Synchronous committed state keeps rapid controls independent of render timing. */
export function createJobFilterState(initialQuery: string, writeQuery: (query: string) => void) {
    let snapshot = { filters: parseJobFilters(new URLSearchParams(initialQuery)), navigationVersion: 0 };
    let currentQuery = new URLSearchParams(initialQuery).toString();
    const initialSnapshot = snapshot;
    const listeners = new Set<() => void>();
    const notify = () => listeners.forEach((listener) => listener());

    return {
        getSnapshot: () => snapshot,
        getServerSnapshot: () => initialSnapshot,
        subscribe: (listener: () => void) => {
            listeners.add(listener);
            return () => { listeners.delete(listener); };
        },
        update: (change: JobFilterUpdate) => {
            const next = typeof change === "function" ? change(snapshot.filters) : change;
            const query = serializeJobFilters(next);
            if (query === serializeJobFilters(snapshot.filters)) return;
            // Write the URL before notifying React; readers always see this commit.
            writeQuery(query);
            currentQuery = query;
            snapshot = { ...snapshot, filters: next };
            notify();
        },
        restore: (query: string) => {
            const params = new URLSearchParams(query);
            const incomingQuery = params.toString();
            // Echoes of our own update must not trim text during typing.
            if (incomingQuery === currentQuery) return;
            currentQuery = incomingQuery;
            const filters = parseJobFilters(params);
            if (serializeJobFilters(filters) === serializeJobFilters(snapshot.filters)) return;
            snapshot = { filters, navigationVersion: snapshot.navigationVersion + 1 };
            notify();
        },
    };
}
