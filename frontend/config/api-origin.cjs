function resolveApiOrigin(value, { hosted = false } = {}) {
    const configured = value?.trim();
    if (!configured && hosted) {
        throw new Error('Set NEXT_PUBLIC_API_URL to your deployed HTTPS backend origin in Vercel, then redeploy.');
    }
    let url;
    try {
        url = new URL(configured || 'http://localhost:3001');
    } catch {
        throw new Error('NEXT_PUBLIC_API_URL must be an absolute HTTP(S) origin.');
    }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
        url.pathname !== '/' || url.search || url.hash) {
        throw new Error('NEXT_PUBLIC_API_URL must be an HTTP(S) origin without credentials, a path, query, or fragment.');
    }
    const local = url.hostname === 'localhost' || url.hostname.endsWith('.localhost') ||
        url.hostname === '[::1]' || /^(?:127\.|0\.|10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(url.hostname);
    if (hosted && (url.protocol !== 'https:' || local)) {
        throw new Error('NEXT_PUBLIC_API_URL on Vercel must use a public HTTPS backend origin.');
    }
    return url.origin;
}

module.exports = { resolveApiOrigin };
