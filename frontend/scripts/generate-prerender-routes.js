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
        '/best-activities-for-kids',
        '/age-appropriate-experiences',
        '/educational-workshops',
        '/outdoor-activities-for-children',
        '/family-friendly-adventures',
        '/seasonal-events-for-kids',
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

    // Helper to fetch ALL pages of a listing endpoint and extract routes.
    // Backend list endpoints silently clamp `limit` (events: 100, blogs: 50),
    // so a single request can never return more than one page's worth —
    // must follow `hasNextPage` until it's false or routes go missing from
    // the sitemap past the clamp.
    const fetchRoutes = async (type, baseUrl, pageSize, transformFn, getPagination) => {
        console.log(`Fetching ${type} from ${baseUrl}...`);
        const allRoutes = [];
        let page = 1;
        try {
            while (true) {
                const url = `${baseUrl}&limit=${pageSize}&page=${page}`;
                const response = await fetchWithTimeout(url);
                if (!response.ok) {
                    throw new Error(`${type} API responded with ${response.status} (page ${page})`);
                }
                const data = await response.json();
                allRoutes.push(...transformFn(data));

                const pagination = getPagination(data);
                if (!pagination?.hasNextPage) break;
                page += 1;
            }
            console.log(`✅ Added ${allRoutes.length} ${type} routes (${page} page${page > 1 ? 's' : ''})`);
            return allRoutes;
        } catch (err) {
            console.error(`❌ Error fetching ${type}:`, err.message);
            console.error(`   Fetched ${allRoutes.length} ${type} routes before failing — using what we have`);
            return allRoutes;
        }
    };

    // Execute fetches in parallel
    const results = await Promise.allSettled([
        fetchRoutes(
            'events',
            `${API_BASE_URL}/events?status=published`,
            100, // MAX_LIMIT clamp in event.controller.ts
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
            },
            (data) => data?.data?.pagination
        ),
        fetchRoutes(
            'blogs',
            `${API_BASE_URL}/blogs?status=published`,
            50, // clamp in blog.controller.ts getAllBlogs
            (data) => data?.data?.blogs?.map(b => `/blog/${b.slug}`) || [],
            (data) => data?.data?.pagination
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
