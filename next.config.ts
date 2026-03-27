import type { NextConfig } from "next";

const securityHeaders = [
    // Enforce HTTPS for 1 year, including subdomains, submit for preloading
    {
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains; preload',
    },
    // Prevent MIME type sniffing
    {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
    },
    // Prevent clickjacking
    {
        key: 'X-Frame-Options',
        value: 'DENY',
    },
    // Send minimal referrer info cross-origin
    {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
    },
    // Disable unnecessary browser features
    {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
    },
    // Content Security Policy
    {
        key: 'Content-Security-Policy',
        value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-eval in dev; tighten in prod
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: blob: https:",
            "connect-src 'self' https:",
            "frame-ancestors 'none'",
            "form-action 'self'",
            "base-uri 'self'",
            "frame-src https://fladov.com https://www.fladov.com https://*.fladov.com"
        ].join('; '),
    },
    // Prevent XSS in older browsers
    {
        key: 'X-XSS-Protection',
        value: '1; mode=block',
    },
];

const nextConfig: NextConfig = {
    turbopack: {},
    webpack: (config) => {
        config.resolve.alias.canvas = false;
        return config;
    },
    async headers() {
        return [
            {
                // Apply to all routes
                source: '/(.*)',
                headers: securityHeaders,
            },
        ];
    },
};

export default nextConfig;
