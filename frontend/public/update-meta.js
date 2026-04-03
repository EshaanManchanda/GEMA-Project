// Dynamic Meta Tag Updater for SEO
// Updates meta tags on cached pages to ensure fresh content for search engines
// This script runs early in page load to check if content was served from cache

(function () {
    'use strict';

    // Disable console logs in production
    // To enable logs, set localStorage.setItem('debug_meta', 'true')
    const isDev = localStorage.getItem('debug_meta') === 'true';
    const log = isDev ? console.log.bind(console) : () => { };
    const warn = isDev ? console.warn.bind(console) : () => { };
    const error = isDev ? console.error.bind(console) : () => { };

    log('[Meta Updater] Initializing...');

    // Check if page was served from service worker cache
    function wasServedFromCache() {
        try {
            const navEntry = performance.getEntriesByType('navigation')[0];
            if (navEntry && navEntry.transferSize === 0) {
                // transferSize of 0 often indicates cached content
                log('[Meta Updater] Page may have been served from cache');
                return true;
            }
            return false;
        } catch (error) {
            warn('[Meta Updater] Could not determine cache status:', error);
            return false;
        }
    }

    // Fetch fresh meta tags from the server
    async function fetchFreshMetaTags() {
        try {
            log('[Meta Updater] Fetching fresh meta tags...');

            const response = await fetch(window.location.href, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'MetaUpdate',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache'
                },
                cache: 'no-store'
            });

            if (!response.ok) {
                warn('[Meta Updater] Failed to fetch fresh content:', response.status);
                return;
            }

            const html = await response.text();
            const parser = new DOMParser();
            const freshDoc = parser.parseFromString(html, 'text/html');

            // Meta tags to update for SEO
            const metaNames = [
                'description',
                'keywords',
                'author',
                'robots',
                'og:title',
                'og:description',
                'og:image',
                'og:url',
                'twitter:title',
                'twitter:description',
                'twitter:image'
            ];

            let updatedCount = 0;

            metaNames.forEach(name => {
                // Try both name and property attributes
                const freshMeta =
                    freshDoc.querySelector(`meta[name="${name}"]`) ||
                    freshDoc.querySelector(`meta[property="${name}"]`);

                const currentMeta =
                    document.querySelector(`meta[name="${name}"]`) ||
                    document.querySelector(`meta[property="${name}"]`);

                if (freshMeta && currentMeta) {
                    const freshContent = freshMeta.getAttribute('content');
                    const currentContent = currentMeta.getAttribute('content');

                    if (freshContent && freshContent !== currentContent) {
                        currentMeta.setAttribute('content', freshContent);
                        updatedCount++;
                        log(`[Meta Updater] Updated ${name}: ${currentContent} → ${freshContent}`);
                    }
                }
            });

            // Update page title if different
            const freshTitle = freshDoc.querySelector('title');
            const currentTitle = document.querySelector('title');
            if (freshTitle && currentTitle && freshTitle.textContent !== currentTitle.textContent) {
                currentTitle.textContent = freshTitle.textContent;
                updatedCount++;
                log(`[Meta Updater] Updated title: ${currentTitle.textContent} → ${freshTitle.textContent}`);
            }

            // Update canonical link if present
            const freshCanonical = freshDoc.querySelector('link[rel="canonical"]');
            const currentCanonical = document.querySelector('link[rel="canonical"]');
            if (freshCanonical && currentCanonical) {
                const freshHref = freshCanonical.getAttribute('href');
                const currentHref = currentCanonical.getAttribute('href');
                if (freshHref && freshHref !== currentHref) {
                    currentCanonical.setAttribute('href', freshHref);
                    updatedCount++;
                    log(`[Meta Updater] Updated canonical: ${currentHref} → ${freshHref}`);
                }
            }

            // Update JSON-LD structured data
            const freshScripts = freshDoc.querySelectorAll('script[type="application/ld+json"]');
            const currentScripts = document.querySelectorAll('script[type="application/ld+json"]');

            if (freshScripts.length === currentScripts.length) {
                freshScripts.forEach((freshScript, index) => {
                    const currentScript = currentScripts[index];
                    if (freshScript && currentScript && freshScript.textContent !== currentScript.textContent) {
                        currentScript.textContent = freshScript.textContent;
                        updatedCount++;
                        log(`[Meta Updater] Updated JSON-LD schema #${index + 1}`);
                    }
                });
            }

            if (updatedCount > 0) {
                log(`[Meta Updater] ✅ Updated ${updatedCount} meta tags/elements`);
            } else {
                log('[Meta Updater] ✅ All meta tags are up to date');
            }

        } catch (error) {
            error('[Meta Updater] Failed to update meta tags:', error);
        }
    }

    // Run update check when DOM is ready
    function init() {
        // Note: With aggressive HTML caching disabled, this should rarely trigger
        // But it provides a safety net for users with old cached pages
        if (wasServedFromCache()) {
            log('[Meta Updater] Cached content detected - updating meta tags');
            // Use requestIdleCallback if available for better performance
            if ('requestIdleCallback' in window) {
                requestIdleCallback(() => fetchFreshMetaTags(), { timeout: 2000 });
            } else {
                // Fallback to setTimeout
                setTimeout(fetchFreshMetaTags, 100);
            }
        } else {
            log('[Meta Updater] Fresh content served - no meta update needed');
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    log('[Meta Updater] Ready');
})();
