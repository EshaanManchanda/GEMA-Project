import fs from 'fs';
import path from 'path';

async function generateRoutes() {
    const routes = [
        '/',
        '/events',
        '/blog',
        '/vendors',
        '/about',
        '/contact',
        '/privacy',
        '/terms'
    ];

    console.log('Fetching dynamic routes...');

    const fetchWithTimeout = async (url, options = {}) => {
        const { timeout = 30000 } = options;
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    };

    // Fetch dynamic event routes
    try {
        console.log('Fetching events from production API...');
        const eventsResponse = await fetchWithTimeout('https://api.kidrove.com/api/events?limit=100&status=published', { timeout: 30000 });
        if (!eventsResponse.ok) {
            throw new Error(`Events API responded with ${eventsResponse.status}`);
        }
        const eventsData = await eventsResponse.json();
        if (eventsData?.data?.events) {
            const eventRoutes = eventsData.data.events.map(e => `/events/${e.slug || e._id}`);
            routes.push(...eventRoutes);
            console.log(`✅ Added ${eventRoutes.length} event routes`);
        }
    } catch (err) {
        console.error('❌ Error fetching events:', err.message);
        console.error('   This is non-critical - static routes will still be generated');
    }

    // Fetch dynamic blog routes
    try {
        console.log('Fetching blogs from production API...');
        const blogsResponse = await fetchWithTimeout('https://api.kidrove.com/api/blogs?limit=100&status=published', { timeout: 30000 });
        if (!blogsResponse.ok) {
            throw new Error(`Blogs API responded with ${blogsResponse.status}`);
        }
        const blogsData = await blogsResponse.json();
        if (blogsData?.data?.blogs) {
            const blogRoutes = blogsData.data.blogs.map(b => `/blog/${b.slug}`);
            routes.push(...blogRoutes);
            console.log(`✅ Added ${blogRoutes.length} blog routes`);
        }
    } catch (err) {
        console.error('❌ Error fetching blogs:', err.message);
        console.error('   This is non-critical - static routes will still be generated');
    }

    // Write routes to JSON
    const outputPath = path.resolve(process.cwd(), 'prerender-routes.json');
    fs.writeFileSync(
        outputPath,
        JSON.stringify(routes, null, 2)
    );

    console.log(`Generated ${routes.length} routes for pre-rendering in ${outputPath}`);
}

generateRoutes();
