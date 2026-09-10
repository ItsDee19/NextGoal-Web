/** OAuth and credential redirects may only return to this application's pages. */
export function safeAuthRedirect(value: string | null): string {
    if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(value)) return "/";
    try {
        const origin = "https://nextgoal.local";
        const url = new URL(value, origin);
        const decodedPath = decodeURIComponent(url.pathname);
        if (url.origin !== origin || decodedPath.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(decodedPath) ||
            decodedPath === "/auth" || decodedPath.startsWith("/auth/")) return "/";
        return `${url.pathname}${url.search}${url.hash}`;
    } catch {
        return "/";
    }
}
