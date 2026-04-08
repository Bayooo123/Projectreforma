import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Reforma OS - Legal Practice Management',
        short_name: 'Reforma',
        description: 'Intelligent digital operating system for law firms',
        start_url: '/',
        display: 'standalone',
        background_color: '#121826',
        theme_color: '#3182ce',
        icons: [
            {
                src: '/icon.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/icon.png',
                sizes: '512x512',
                type: 'image/png',
            },
            {
                src: '/apple-icon.png',
                sizes: '180x180',
                type: 'image/png',
                purpose: 'maskable',
            },
        ],
    };
}
