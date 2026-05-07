/**
 * Generate dynamic XML sitemap from pre-rendered routes
 * Runs during build process after route generation
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.VITE_APP_URL || 'https://kidrove.com';
const ROUTES_FILE = path.resolve(__dirname, '../prerender-routes.json');
const OUTPUT_FILE = path.resolve(__dirname, '../public/sitemap.xml');

// Priority mapping for different route types
const PRIORITY_MAP = {
  '/': 1.0,
  '/events': 0.9,
  '/blog': 0.9,
  '/vendors': 0.8,
  '/about': 0.7,
  '/contact': 0.7,
  '/privacy': 0.5,
  '/terms': 0.5,
  'event-detail': 0.8,
  'blog-detail': 0.7,
  'default': 0.6
};

// Change frequency mapping
const CHANGEFREQ_MAP = {
  '/': 'daily',
  '/events': 'daily',
  '/blog': 'daily',
  'event-detail': 'weekly',
  'blog-detail': 'weekly',
  'default': 'monthly'
};

function getPriority(route) {
  if (PRIORITY_MAP[route]) return PRIORITY_MAP[route];
  if (route.startsWith('/events/')) return PRIORITY_MAP['event-detail'];
  if (route.startsWith('/blog/')) return PRIORITY_MAP['blog-detail'];
  return PRIORITY_MAP['default'];
}

function getChangeFreq(route) {
  if (CHANGEFREQ_MAP[route]) return CHANGEFREQ_MAP[route];
  if (route.startsWith('/events/')) return CHANGEFREQ_MAP['event-detail'];
  if (route.startsWith('/blog/')) return CHANGEFREQ_MAP['blog-detail'];
  return CHANGEFREQ_MAP['default'];
}

function generateSitemap() {
  try {
    // Read pre-rendered routes
    let routes = [];
    if (fs.existsSync(ROUTES_FILE)) {
      routes = JSON.parse(fs.readFileSync(ROUTES_FILE, 'utf-8'));
      console.log(`✅ Loaded ${routes.length} routes from prerender-routes.json`);
    } else {
      console.warn('⚠️  prerender-routes.json not found, using static routes');
      routes = ['/', '/events', '/blog', '/vendors', '/about', '/contact', '/privacy', '/terms'];
    }

    // Build XML sitemap
    const currentDate = new Date().toISOString();

    const urlEntries = routes.map(route => {
      const url = `${BASE_URL}${route}`;
      const priority = getPriority(route);
      const changefreq = getChangeFreq(route);

      return `  <url>
    <loc>${url}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
    }).join('\n');

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${urlEntries}
</urlset>`;

    // Write sitemap to public directory
    fs.writeFileSync(OUTPUT_FILE, sitemap, 'utf-8');
    console.log(`✅ Generated sitemap with ${routes.length} URLs: ${OUTPUT_FILE}`);

    // Also write to dist during build
    const distFile = path.resolve(__dirname, '../dist/sitemap.xml');
    if (fs.existsSync(path.dirname(distFile))) {
      fs.writeFileSync(distFile, sitemap, 'utf-8');
      console.log(`✅ Copied sitemap to dist: ${distFile}`);
    }

  } catch (error) {
    console.error('❌ Failed to generate sitemap:', error.message);
    process.exit(1);
  }
}

// Run generator
generateSitemap();
