# Frontend Optimization Guide: Performance, Security & SEO

This document outlines architectural standards, coding conventions, and best practices for the frontend. All code generation and refactoring should adhere to these principles to ensure scalability, security, and high performance.

---

## 1. Performance Optimization

### A. Rendering Efficiency (Core Web Vitals)
* **Minimize Re-renders:**
    * **Memoization:** Use `React.memo`, `useMemo`, and `useCallback` specifically for expensive calculations or reference equality checks.
    * **State Colocation:** Keep state as close to where it is used as possible. Avoid lifting state to global contexts unless absolutely necessary.
    * **Virtualization:** Use `react-window` or `react-virtualized` for lists exceeding 50 items to maintain DOM stability.
* **CLS (Cumulative Layout Shift):**
    * Reserve space for images and ads using CSS `aspect-ratio` or explicit `width`/`height` attributes.
    * Avoid inserting dynamic content above existing content without user interaction.

### B. Bundle Size & Network
* **Code Splitting:**
    * **Route-based:** Use `React.lazy` and `Suspense` to split code by route.
    * **Component-based:** Lazy load heavy, non-critical components (e.g., Modals, Drawers, heavy Charts) only when triggered.
* **Tree Shaking:**
    * Prefer named imports (`import { debounce } from 'lodash'`) over default imports to allow unused code elimination.
    * Audit bundle size using `webpack-bundle-analyzer` or `source-map-explorer`.
* **Asset Optimization:**
    * Serve images in **WebP** or **AVIF** formats.
    * Use `srcset` for responsive images.
    * Preload critical fonts and critical CSS; defer non-critical JS (`async` or `defer`).



---

## 2. Security Hardening

### A. XSS (Cross-Site Scripting) Prevention
* **Sanitization:**
    * Never use `dangerouslySetInnerHTML` (or `v-html`) without sanitizing input via libraries like **DOMPurify**.
    * Validate all URL inputs to prevent `javascript:` pseudo-protocol attacks.
* **Content Security Policy (CSP):**
    * Implement strict CSP headers to restrict the sources of executable scripts, styles, and images.
    * Example: `default-src 'self'; script-src 'self' https://trusted.cdn.com`.

### B. Authentication & Sensitive Data
* **Token Storage:**
    * **Do NOT** store Access/Refresh tokens in `localStorage` or `sessionStorage` (accessible via JS).
    * Store sensitive tokens in **HttpOnly, Secure, SameSite Cookies**.
* **Dependency Audits:**
    * Run `npm audit` or `yarn audit` regularly.
    * Update dependencies to patch known vulnerabilities.

---

## 3. SEO (Search Engine Optimization)

### A. Technical SEO
* **Rendering Strategy:**
    * Use **Next.js (SSR/SSG)** or **Remix** for public-facing pages to ensure crawlers receive fully rendered HTML.
    * For SPA (Single Page Apps), use **React Helmet** to dynamically update meta tags (`title`, `description`, `canonical`).
* **Semantic HTML:**
    * Use semantic tags (`<nav>`, `<main>`, `<article>`, `<aside>`, `<footer>`) instead of generic `<div>` soup.
    * Ensure proper heading hierarchy (`h1` -> `h2` -> `h3`).

### B. Metadata & Social
* **Open Graph (OG):** Implement OG tags (`og:title`, `og:image`, `og:description`) for rich social media previews.
* **Robots & Sitemaps:** Ensure `robots.txt` allows crawling of relevant pages and `sitemap.xml` is dynamically generated.

---

## 4. Developer Tips & Code Quality

* **TypeScript:** Enforce strict mode. No `any` types. Define interfaces for all API responses and Component Props.
* **Custom Hooks:** Abstract logic (fetching, form handling, subscriptions) into custom hooks to keep UI components "dumb" and clean.
* **Error Boundaries:** Wrap feature modules in Error Boundaries to prevent the entire application from crashing due to a single component error.
* **Lighthouse CI:** Integrate Lighthouse audits into the CI/CD pipeline to block PRs that degrade performance scores below a set threshold.