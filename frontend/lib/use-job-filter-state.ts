"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createJobFilterState } from "./job-filter-state";

export function useJobFilterState(query: string) {
    const [state] = useState(() => createJobFilterState(query, (nextQuery) => {
        const href = window.location.pathname + (nextQuery ? "?" + nextQuery : "") + window.location.hash;
        // Next 14 integrates native history updates with useSearchParams.
        window.history.replaceState(null, "", href);
    }));
    const snapshot = useSyncExternalStore(state.subscribe, state.getSnapshot, state.getServerSnapshot);

    useEffect(() => {
        // The actual location wins over an intermediate router render after rapid updates.
        state.restore(window.location.search);
    }, [query, state]);
    useEffect(() => {
        const restore = () => state.restore(window.location.search);
        window.addEventListener("popstate", restore);
        return () => window.removeEventListener("popstate", restore);
    }, [state]);

    return { ...snapshot, updateFilters: state.update };
}
