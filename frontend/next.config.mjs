/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    // Disable standalone and experimental features for better dev stability
    // output: 'standalone', 
    // Force restart timestamp: 2026-02-06T14:55:00

    // Experimental optimizations - Disabled for now to debug 500 error
    experimental: {
        // optimizeCss: true,
        optimizePackageImports: ['lucide-react'],
    },

    // Image optimization
    images: {
        domains: ['labface.site', 'www.labface.site'],
        formats: ['image/webp', 'image/avif'],
    },

    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },

    webpack: (config) => {
        config.watchOptions = {
            poll: 1000,
            aggregateTimeout: 300,
            ignored: ['**/node_modules', '**/.next', '**/.git'],
        }
        return config
    },

    async rewrites() {
        const BACKEND_URL = process.env.BACKEND_URL || 'http://backend:5000';

        return [
            // {
            //     source: '/api/ai/:path*',
            //     destination: `http://ai-service:8000/:path*`,
            // },
            {
                source: '/api/:path*',
                destination: `${BACKEND_URL}/api/:path*`,
            },
            {
                source: '/uploads/:path*',
                destination: `${BACKEND_URL}/uploads/:path*`,
            },
        ];
    },
};

export default nextConfig;
