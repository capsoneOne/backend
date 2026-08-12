import type {MetadataRoute} from 'next';

import {SITE_NAME} from '@/config/metadata';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: SITE_NAME,
        short_name: SITE_NAME,
        description: 'Discover products across fashion, technology, beauty, home, sports, toys, and everyday essentials.',
        start_url: '/en',
        display: 'standalone',
        background_color: '#f8faff',
        theme_color: '#0866d8',
        icons: [
            {
                src: '/brand/lume-app-icon-192.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/brand/lume-app-icon-512.png',
                sizes: '512x512',
                type: 'image/png',
            },
        ],
    };
}
