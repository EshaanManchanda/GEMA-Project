// Navigation management for Gema Documentation Website

(function() {
    'use strict';

    class NavigationManager {
        constructor() {
            this.currentPage = this.getCurrentPage();
            this.navigationData = this.getNavigationData();
            this.breadcrumbContainer = null;
            this.init();
        }

        init() {
            this.createBreadcrumbs();
            this.setupPageNavigation();
            this.setupTableOfContents();
            this.setupSmoothScrolling();
            this.handleExternalLinks();
        }

        getCurrentPage() {
            const path = window.location.pathname;
            const hash = window.location.hash;
            return {
                path: path.endsWith('/') ? path + 'index.html' : path,
                hash: hash,
                fullUrl: path + hash
            };
        }

        getNavigationData() {
            return {
                'index.html': {
                    title: 'Platform Overview',
                    parent: null,
                    sections: [
                        { id: 'project-overview', title: 'Project Overview' },
                        { id: 'business-model', title: 'Business Model' },
                        { id: 'tech-stack', title: 'Technology Stack' },
                        { id: 'architecture', title: 'System Architecture' }
                    ]
                },
                'pages/rbac.html': {
                    title: 'Role-Based Access Control',
                    parent: 'index.html',
                    sections: [
                        { id: 'rbac-overview', title: 'RBAC Overview' },
                        { id: 'user-roles', title: 'User Roles & Permissions' },
                        { id: 'admin-capabilities', title: 'Admin System' },
                        { id: 'user-management', title: 'User Management' }
                    ]
                },
                'pages/event-management.html': {
                    title: 'Event Management System',
                    parent: 'index.html',
                    sections: [
                        { id: 'event-overview', title: 'Event System Overview' },
                        { id: 'creation-workflow', title: 'Creation & Approval' },
                        { id: 'moderation', title: 'Event Moderation' },
                        { id: 'booking', title: 'Booking System' }
                    ]
                },
                'pages/payment-system.html': {
                    title: 'Payment Management',
                    parent: 'index.html',
                    sections: [
                        { id: 'payment-overview', title: 'Payment Overview' },
                        { id: 'gateways', title: 'Payment Gateways' },
                        { id: 'commissions', title: 'Commission System' },
                        { id: 'payouts', title: 'Vendor Payouts' }
                    ]
                },
                'pages/content-management.html': {
                    title: 'Content Management System',
                    parent: 'index.html',
                    sections: [
                        { id: 'cms-overview', title: 'CMS Overview' },
                        { id: 'categories', title: 'Category Management' },
                        { id: 'media', title: 'Media Management' },
                        { id: 'moderation', title: 'Content Moderation' }
                    ]
                },
                'pages/vendor-employee.html': {
                    title: 'Business Relationships',
                    parent: 'index.html',
                    sections: [
                        { id: 'vendor-overview', title: 'Vendor Management' },
                        { id: 'employee-system', title: 'Employee System' },
                        { id: 'commission-model', title: 'Commission Model' },
                        { id: 'analytics', title: 'Performance Analytics' }
                    ]
                },
                'pages/authentication.html': {
                    title: 'Authentication System',
                    parent: 'index.html',
                    sections: [
                        { id: 'auth-overview', title: 'Auth Overview' },
                        { id: 'jwt-system', title: 'JWT & Firebase' },
                        { id: 'otp-verification', title: '4-Digit OTP' },
                        { id: 'security', title: 'Security Features' }
                    ]
                },
                'pages/mobile-app.html': {
                    title: 'Mobile Application',
                    parent: 'index.html',
                    sections: [
                        { id: 'mobile-overview', title: 'Mobile App Overview' },
                        { id: 'react-native', title: 'React Native' },
                        { id: 'figma-design', title: 'Figma Integration' },
                        { id: 'features', title: 'Mobile Features' }
                    ]
                }
            };
        }

        createBreadcrumbs() {
            const currentPageData = this.getCurrentPageData();
            if (!currentPageData) return;

            // Create breadcrumb container if it doesn't exist
            const mainContent = document.querySelector('.main-content');
            if (!mainContent) return;

            // Remove existing breadcrumbs
            const existingBreadcrumb = document.querySelector('.breadcrumb');
            if (existingBreadcrumb) {
                existingBreadcrumb.remove();
            }

            const breadcrumbNav = document.createElement('nav');
            breadcrumbNav.className = 'breadcrumb';
            breadcrumbNav.setAttribute('aria-label', 'Breadcrumb navigation');

            const breadcrumbList = [];

            // Add home/root
            breadcrumbList.push({
                title: 'Home',
                url: '/',
                isActive: false
            });

            // Add parent if exists
            if (currentPageData.parent) {
                const parentData = this.navigationData[currentPageData.parent];
                if (parentData) {
                    breadcrumbList.push({
                        title: parentData.title,
                        url: '/' + currentPageData.parent,
                        isActive: false
                    });
                }
            }

            // Add current page
            breadcrumbList.push({
                title: currentPageData.title,
                url: this.currentPage.fullUrl,
                isActive: true
            });

            // Build breadcrumb HTML
            breadcrumbList.forEach((crumb, index) => {
                const breadcrumbItem = document.createElement('span');
                breadcrumbItem.className = 'breadcrumb-item';

                if (crumb.isActive) {
                    breadcrumbItem.textContent = crumb.title;
                    breadcrumbItem.setAttribute('aria-current', 'page');
                } else {
                    const link = document.createElement('a');
                    link.href = crumb.url;
                    link.textContent = crumb.title;
                    breadcrumbItem.appendChild(link);
                }

                breadcrumbNav.appendChild(breadcrumbItem);
            });

            // Insert breadcrumbs at the top of main content
            const firstChild = mainContent.firstChild;
            mainContent.insertBefore(breadcrumbNav, firstChild);

            this.breadcrumbContainer = breadcrumbNav;
        }

        getCurrentPageData() {
            // Normalize current path for comparison
            let currentPath = this.currentPage.path;
            if (currentPath === '/' || currentPath === '') {
                currentPath = 'index.html';
            } else if (currentPath.startsWith('/')) {
                currentPath = currentPath.substring(1);
            }

            return this.navigationData[currentPath];
        }

        setupPageNavigation() {
            // Add previous/next navigation at the bottom of pages
            const footerNav = document.querySelector('.footer-nav');
            if (!footerNav) return;

            const pageOrder = [
                'index.html',
                'pages/rbac.html',
                'pages/event-management.html',
                'pages/payment-system.html',
                'pages/content-management.html',
                'pages/vendor-employee.html',
                'pages/authentication.html',
                'pages/mobile-app.html'
            ];

            let currentPath = this.currentPage.path;
            if (currentPath === '/' || currentPath === '') {
                currentPath = 'index.html';
            } else if (currentPath.startsWith('/')) {
                currentPath = currentPath.substring(1);
            }

            const currentIndex = pageOrder.indexOf(currentPath);
            if (currentIndex === -1) return;

            const footerContent = footerNav.querySelector('.footer-nav-content');
            if (!footerContent) return;

            footerContent.innerHTML = '';

            // Previous page link
            if (currentIndex > 0) {
                const prevPath = pageOrder[currentIndex - 1];
                const prevData = this.navigationData[prevPath];
                if (prevData) {
                    const prevLink = document.createElement('a');
                    prevLink.href = prevPath === 'index.html' ? '/' : '/' + prevPath;
                    prevLink.className = 'footer-nav-link prev-page';
                    prevLink.innerHTML = `
                        <i class="fas fa-arrow-left"></i>
                        <span>Previous: ${prevData.title}</span>
                    `;
                    footerContent.appendChild(prevLink);
                }
            }

            // Next page link
            if (currentIndex < pageOrder.length - 1) {
                const nextPath = pageOrder[currentIndex + 1];
                const nextData = this.navigationData[nextPath];
                if (nextData) {
                    const nextLink = document.createElement('a');
                    nextLink.href = '/' + nextPath;
                    nextLink.className = 'footer-nav-link next-page';
                    nextLink.innerHTML = `
                        <span>Next: ${nextData.title}</span>
                        <i class="fas fa-arrow-right"></i>
                    `;
                    footerContent.appendChild(nextLink);
                }
            }
        }

        setupTableOfContents() {
            const currentPageData = this.getCurrentPageData();
            if (!currentPageData || !currentPageData.sections) return;

            // Check if we should create a table of contents
            const sections = document.querySelectorAll('section[id], .content-section[id]');
            if (sections.length < 3) return;

            // Create TOC container
            const tocContainer = document.createElement('div');
            tocContainer.className = 'table-of-contents';
            tocContainer.innerHTML = `
                <div class="toc-header">
                    <h3><i class="fas fa-list"></i> Table of Contents</h3>
                    <button class="toc-toggle" aria-label="Toggle table of contents">
                        <i class="fas fa-chevron-up"></i>
                    </button>
                </div>
                <nav class="toc-nav" aria-label="Table of contents">
                    <ul class="toc-list"></ul>
                </nav>
            `;

            // Populate TOC
            const tocList = tocContainer.querySelector('.toc-list');
            sections.forEach((section, index) => {
                const heading = section.querySelector('h1, h2, h3');
                if (heading) {
                    const listItem = document.createElement('li');
                    listItem.className = 'toc-item';
                    
                    const link = document.createElement('a');
                    link.href = `#${section.id}`;
                    link.className = 'toc-link';
                    link.textContent = heading.textContent;
                    link.dataset.section = section.id;
                    
                    listItem.appendChild(link);
                    tocList.appendChild(listItem);
                }
            });

            // Add TOC to sidebar or main content
            const sidebar = document.querySelector('.sidebar-nav');
            if (sidebar && tocList.children.length > 0) {
                const tocSection = document.createElement('div');
                tocSection.className = 'nav-section toc-section';
                tocSection.appendChild(tocContainer);
                sidebar.appendChild(tocSection);

                // Setup TOC toggle
                const tocToggle = tocContainer.querySelector('.toc-toggle');
                const tocNav = tocContainer.querySelector('.toc-nav');
                
                tocToggle.addEventListener('click', () => {
                    tocNav.classList.toggle('collapsed');
                    const icon = tocToggle.querySelector('i');
                    icon.classList.toggle('fa-chevron-up');
                    icon.classList.toggle('fa-chevron-down');
                });

                // Setup TOC scroll spy
                this.setupTOCScrollSpy(tocList);
            }
        }

        setupTOCScrollSpy(tocList) {
            const tocLinks = tocList.querySelectorAll('.toc-link');
            const sections = Array.from(tocLinks).map(link => 
                document.getElementById(link.dataset.section)
            ).filter(Boolean);

            if (sections.length === 0) return;

            const observerOptions = {
                root: null,
                rootMargin: '-20% 0px -70% 0px',
                threshold: 0
            };

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const targetId = entry.target.id;
                        
                        // Remove active class from all TOC links
                        tocLinks.forEach(link => link.classList.remove('active'));
                        
                        // Add active class to current section link
                        const activeLink = tocList.querySelector(`[data-section="${targetId}"]`);
                        if (activeLink) {
                            activeLink.classList.add('active');
                        }
                    }
                });
            }, observerOptions);

            sections.forEach(section => observer.observe(section));
        }

        setupSmoothScrolling() {
            // Enhanced smooth scrolling for anchor links
            document.addEventListener('click', (e) => {
                const link = e.target.closest('a[href^="#"], .toc-link, .nav-link[href^="#"]');
                if (!link) return;

                const href = link.getAttribute('href');
                if (!href || !href.startsWith('#')) return;

                e.preventDefault();

                const targetId = href.substring(1);
                const targetElement = document.getElementById(targetId);

                if (targetElement) {
                    this.scrollToElement(targetElement);
                    
                    // Update URL without triggering page reload
                    if (history.pushState) {
                        history.pushState(null, null, href);
                    }
                    
                    // Focus management for accessibility
                    targetElement.setAttribute('tabindex', '-1');
                    targetElement.focus();
                    targetElement.addEventListener('blur', () => {
                        targetElement.removeAttribute('tabindex');
                    }, { once: true });
                }
            });

            // Handle browser back/forward
            window.addEventListener('popstate', () => {
                if (window.location.hash) {
                    const targetElement = document.getElementById(window.location.hash.substring(1));
                    if (targetElement) {
                        this.scrollToElement(targetElement);
                    }
                }
            });

            // Handle initial hash on page load
            if (window.location.hash) {
                setTimeout(() => {
                    const targetElement = document.getElementById(window.location.hash.substring(1));
                    if (targetElement) {
                        this.scrollToElement(targetElement);
                    }
                }, 100);
            }
        }

        scrollToElement(element) {
            const headerHeight = document.querySelector('.header')?.offsetHeight || 70;
            const additionalOffset = 20;
            const targetPosition = element.offsetTop - headerHeight - additionalOffset;

            window.scrollTo({
                top: Math.max(0, targetPosition),
                behavior: 'smooth'
            });
        }

        handleExternalLinks() {
            // Add external link indicators and handle external navigation
            document.addEventListener('click', (e) => {
                const link = e.target.closest('a');
                if (!link) return;

                const href = link.getAttribute('href');
                if (!href) return;

                // Check if it's an external link
                if (href.startsWith('http') && !href.includes(window.location.hostname)) {
                    // Add external link indicator if not already present
                    if (!link.querySelector('.external-link-icon')) {
                        const icon = document.createElement('i');
                        icon.className = 'fas fa-external-link-alt external-link-icon';
                        icon.style.marginLeft = '0.25rem';
                        icon.style.fontSize = '0.8em';
                        link.appendChild(icon);
                    }

                    // Confirm navigation for external links
                    e.preventDefault();
                    if (confirm(`This link will open in a new tab: ${href}\n\nContinue?`)) {
                        window.open(href, '_blank', 'noopener,noreferrer');
                    }
                }
            });
        }

        // Public methods for external access
        updateBreadcrumbs() {
            this.currentPage = this.getCurrentPage();
            this.createBreadcrumbs();
        }

        highlightNavigation(sectionId) {
            const navLinks = document.querySelectorAll('.nav-link, .toc-link');
            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${sectionId}`) {
                    link.classList.add('active');
                }
            });
        }

        getNavigationStructure() {
            return this.navigationData;
        }
    }

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.NavigationManager = new NavigationManager();
        });
    } else {
        window.NavigationManager = new NavigationManager();
    }

    // Export for external access
    window.NavigationManager = window.NavigationManager || {};

})();