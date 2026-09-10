const { resolveApiOrigin } = require('./config/api-origin.cjs');

// Public values are baked into the browser bundle. Reject a missing deployment
// setting during the build instead of shipping requests to visitors' localhost.
const apiOrigin = resolveApiOrigin(process.env.NEXT_PUBLIC_API_URL, {
    hosted: process.env.VERCEL === '1',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    env: {
        NEXT_PUBLIC_API_URL: apiOrigin,
    },
};

module.exports = nextConfig;
