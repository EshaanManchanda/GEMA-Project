import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Configure dotenv to read from .env file
dotenv.config();

const API_BASE_URL = process.env.VITE_API_URL || 'https://api.kidrove.com/api';

async function generateRoutes() {
    console.log(`Using API Base URL: ${API_BASE_URL}`);
    const routes = [
        '/',
        '/events',
        '/blog',
        '/vendors',
        '/about',
        '/contact',
        '/privacy',
        '/terms',
        '/learn/scratch',
        '/learn/robotics',
        '/learn/python',
        '/learn/ai-for-kids',
    ];

    console.log('Fetching dynamic routes...');

    const fetchWithTimeout = async (url, options = {}) => {
        const { timeout = 30000 } = options;
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            return response;
        } finally {
            clearTimeout(id);
        }
    };

    // Helper to fetch and extract routes
    const fetchRoutes = async (type, url, transformFn) => {
        console.log(`Fetching ${type} from ${url}...`);
        try {
            const response = await fetchWithTimeout(url);
            if (!response.ok) {
                throw new Error(`${type} API responded with ${response.status}`);
            }
            const data = await response.json();
            const newRoutes = transformFn(data);
            if (newRoutes && newRoutes.length > 0) {
                console.log(`✅ Added ${newRoutes.length} ${type} routes`);
                return newRoutes;
            }
            return [];
        } catch (err) {
            console.error(`❌ Error fetching ${type}:`, err.message);
            console.error('   This is non-critical - static routes will still be generated');
            return [];
        }
    };

    // Execute fetches in parallel
    const results = await Promise.allSettled([
        fetchRoutes(
            'events',
            `${API_BASE_URL}/events?limit=1000&status=published`,
            (data) => {
                if (!data?.data?.events) return [];
                return data.data.events.map(e => {
                    // Prioritize slug, fallback to _id
                    if (!e.slug) {
                        console.warn(`⚠️  Event missing slug: ${e.title} (${e._id}) - falling back to ID`);
                    }
                    const identifier = e.slug || e._id;
                    return `/events/${identifier}`;
                });
            }
        ),
        fetchRoutes(
            'blogs',
            `${API_BASE_URL}/blogs?limit=100&status=published`,
            (data) => data?.data?.blogs?.map(b => `/blog/${b.slug}`) || []
        )
    ]);

    // Process results
    results.forEach(result => {
        if (result.status === 'fulfilled') {
            routes.push(...result.value);
        }
    });

    // Write routes to JSON
    const outputPath = path.resolve(process.cwd(), 'prerender-routes.json');
    fs.writeFileSync(
        outputPath,
        JSON.stringify(routes, null, 2)
    );

    console.log(`Generated ${routes.length} routes for pre-rendering in ${outputPath}`);
}

generateRoutes();
