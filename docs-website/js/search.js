// Search functionality for Gema Documentation Website

(function() {
    'use strict';

    // Search data - this would typically be loaded from an external source
    const searchData = [
        // Main Platform Overview
        {
            id: 'platform-overview',
            title: 'Gema Platform Overview',
            content: 'Comprehensive event management platform MERN stack MongoDB React Node.js Express scalable families kids activities',
            url: '/#project-overview',
            category: 'Overview'
        },
        {
            id: 'business-model',
            title: 'Business Model & Revenue Streams',
            content: 'Commission-based revenue featured listings subscription plans affiliate marketing vendor payments',
            url: '/#business-model',
            category: 'Business'
        },
        {
            id: 'tech-stack',
            title: 'Technology Stack',
            content: 'React TypeScript Redux MongoDB Express Node.js Docker Kubernetes Cloudinary Firebase',
            url: '/#tech-stack',
            category: 'Technology'
        },

        // Role-Based Access Control
        {
            id: 'rbac-overview',
            title: 'Role-Based Access Control',
            content: 'User roles permissions admin vendor employee customer access control security authentication authorization',
            url: 'pages/rbac.html',
            category: 'Security'
        },
        {
            id: 'admin-system',
            title: 'Admin System Overview',
            content: 'Enterprise admin dashboard user management event moderation revenue tracking commission analytics',
            url: 'pages/rbac.html#admin-capabilities',
            category: 'Admin'
        },
        {
            id: 'user-management',
            title: 'User Management System',
            content: 'User administration bulk operations profile management role assignment account suspension',
            url: 'pages/rbac.html#user-management',
            category: 'Admin'
        },

        // Event Management System
        {
            id: 'event-system',
            title: 'Event Management System',
            content: 'Event creation approval workflow booking system venue management calendar scheduling',
            url: 'pages/event-management.html',
            category: 'Events'
        },
        {
            id: 'event-creation',
            title: 'Event Creation & Approval Workflow',
            content: 'Vendor event submission admin approval quality checks content moderation image validation',
            url: 'pages/event-management.html#creation-workflow',
            category: 'Events'
        },
        {
            id: 'event-moderation',
            title: 'Event Moderation',
            content: 'Content guidelines quality assurance automated screening manual review approval rejection',
            url: 'pages/event-management.html#moderation',
            category: 'Events'
        },
        {
            id: 'booking-system',
            title: 'Event Booking System',
            content: 'Booking process payment integration ticket generation QR codes customer management',
            url: 'pages/event-management.html#booking',
            category: 'Events'
        },

        // Payment Management
        {
            id: 'payment-overview',
            title: 'Payment Management System',
            content: 'Payment processing Stripe PayPal multi-gateway commission tracking refunds disputes',
            url: 'pages/payment-system.html',
            category: 'Payments'
        },
        {
            id: 'payment-gateways',
            title: 'Payment Gateway Integration',
            content: 'Stripe PayPal Razorpay payment processing secure transactions PCI compliance',
            url: 'pages/payment-system.html#gateways',
            category: 'Payments'
        },
        {
            id: 'commission-system',
            title: 'Commission & Affiliate System',
            content: 'Commission calculation affiliate tracking vendor payouts revenue sharing performance analytics',
            url: 'pages/payment-system.html#commissions',
            category: 'Payments'
        },
        {
            id: 'vendor-payouts',
            title: 'Vendor Payout Management',
            content: 'Automated payouts payout scheduling financial reporting vendor earnings commission distribution',
            url: 'pages/payment-system.html#payouts',
            category: 'Payments'
        },

        // Content Management System
        {
            id: 'cms-overview',
            title: 'Content Management System',
            content: 'Content management category management media management content moderation admin dashboard',
            url: 'pages/content-management.html',
            category: 'Content'
        },
        {
            id: 'category-management',
            title: 'Category Management',
            content: 'Event categories taxonomy management category hierarchy admin category control',
            url: 'pages/content-management.html#categories',
            category: 'Content'
        },
        {
            id: 'media-management',
            title: 'Media Management with Cloudinary',
            content: 'Cloudinary integration image optimization media storage file uploads content delivery',
            url: 'pages/content-management.html#media',
            category: 'Content'
        },
        {
            id: 'content-moderation',
            title: 'Content Moderation',
            content: 'Content approval automated screening manual review content guidelines quality assurance',
            url: 'pages/content-management.html#moderation',
            category: 'Content'
        },

        // Authentication System
        {
            id: 'auth-overview',
            title: 'Authentication System Overview',
            content: 'JWT authentication Firebase integration dual authentication security tokens session management',
            url: 'pages/authentication.html',
            category: 'Authentication'
        },
        {
            id: 'jwt-firebase',
            title: 'JWT & Firebase Authentication',
            content: 'JWT tokens Firebase integration social login token refresh access tokens security',
            url: 'pages/authentication.html#jwt-system',
            category: 'Authentication'
        },
        {
            id: 'otp-verification',
            title: '4-Digit OTP Email Verification',
            content: 'Email verification OTP codes 4-digit verification security email authentication',
            url: 'pages/authentication.html#otp-verification',
            category: 'Authentication'
        },
        {
            id: 'auth-security',
            title: 'Authentication Security Features',
            content: 'Security measures password hashing rate limiting session security token validation',
            url: 'pages/authentication.html#security',
            category: 'Security'
        },

        // Mobile Application
        {
            id: 'mobile-overview',
            title: 'Mobile Application Overview',
            content: 'React Native mobile app cross-platform iOS Android mobile development',
            url: 'pages/mobile-app.html',
            category: 'Mobile'
        },
        {
            id: 'react-native',
            title: 'React Native Development',
            content: 'React Native framework mobile development cross-platform native performance',
            url: 'pages/mobile-app.html#react-native',
            category: 'Mobile'
        },
        {
            id: 'figma-design',
            title: 'Figma Design Integration',
            content: 'Figma design system UI/UX design mobile interface design collaboration',
            url: 'pages/mobile-app.html#figma-design',
            category: 'Mobile'
        },
        {
            id: 'mobile-features',
            title: 'Mobile-Specific Features',
            content: 'Push notifications offline capability geolocation camera integration mobile payments',
            url: 'pages/mobile-app.html#features',
            category: 'Mobile'
        },

        // API Documentation
        {
            id: 'api-overview',
            title: 'API Documentation',
            content: 'REST API endpoints authentication endpoints event management API payment API user management',
            url: 'pages/api-documentation.html',
            category: 'API'
        },
        {
            id: 'auth-endpoints',
            title: 'Authentication API Endpoints',
            content: 'Login register logout token refresh password reset email verification API',
            url: 'pages/api-documentation.html#auth-endpoints',
            category: 'API'
        },
        {
            id: 'event-endpoints',
            title: 'Event Management API',
            content: 'Event CRUD operations event search booking API venue management calendar API',
            url: 'pages/api-documentation.html#event-endpoints',
            category: 'API'
        },

        // Business Relationships
        {
            id: 'vendor-management',
            title: 'Vendor Management System',
            content: 'Vendor registration vendor verification vendor dashboard event management vendor analytics',
            url: 'pages/vendor-employee.html',
            category: 'Business'
        },
        {
            id: 'employee-system',
            title: 'Employee Management System',
            content: 'Employee roles employee permissions task assignment employee dashboard limited access',
            url: 'pages/vendor-employee.html#employee-system',
            category: 'Business'
        },
        {
            id: 'commission-model',
            title: 'Commission-Based Business Model',
            content: 'Commission rates revenue sharing vendor earnings platform revenue business model monetization',
            url: 'pages/vendor-employee.html#commission-model',
            category: 'Business'
        }
    ];

    class SearchManager {
        constructor() {
            this.searchData = searchData;
            this.searchInput = document.getElementById('search-input');
            this.searchModal = document.getElementById('search-modal');
            this.searchResults = document.getElementById('search-results');
            this.currentQuery = '';
            this.searchHistory = this.loadSearchHistory();
            this.init();
        }

        init() {
            this.bindEvents();
            this.loadAdditionalData();
        }

        bindEvents() {
            if (this.searchInput) {
                // Handle search input
                this.searchInput.addEventListener('input', (e) => {
                    const query = e.target.value.trim();
                    this.handleSearch(query);
                });

                // Handle search focus
                this.searchInput.addEventListener('focus', () => {
                    if (this.currentQuery.length > 2) {
                        this.showModal();
                    }
                });

                // Handle keyboard navigation
                this.searchInput.addEventListener('keydown', (e) => {
                    this.handleKeyboardNavigation(e);
                });
            }

            // Handle result clicks
            if (this.searchResults) {
                this.searchResults.addEventListener('click', (e) => {
                    const resultItem = e.target.closest('.search-result-item');
                    if (resultItem) {
                        const url = resultItem.dataset.url;
                        this.navigateToResult(url);
                    }
                });
            }

            // Handle modal clicks
            if (this.searchModal) {
                this.searchModal.addEventListener('click', (e) => {
                    if (e.target === this.searchModal) {
                        this.hideModal();
                    }
                });
            }
        }

        handleSearch(query) {
            this.currentQuery = query;

            if (query.length < 2) {
                this.hideModal();
                return;
            }

            const results = this.performSearch(query);
            this.displayResults(results, query);
            this.showModal();

            // Add to search history
            if (query.length > 2) {
                this.addToSearchHistory(query);
            }
        }

        performSearch(query) {
            const normalizedQuery = query.toLowerCase().trim();
            const words = normalizedQuery.split(/\s+/);

            return this.searchData.map(item => {
                let score = 0;
                const normalizedTitle = item.title.toLowerCase();
                const normalizedContent = item.content.toLowerCase();

                // Exact title match gets highest score
                if (normalizedTitle.includes(normalizedQuery)) {
                    score += 100;
                }

                // Title word matches
                words.forEach(word => {
                    if (normalizedTitle.includes(word)) {
                        score += 50;
                    }
                    if (normalizedContent.includes(word)) {
                        score += 10;
                    }
                });

                // Boost score for category matches
                if (item.category && item.category.toLowerCase().includes(normalizedQuery)) {
                    score += 30;
                }

                // Fuzzy matching for typos
                score += this.fuzzyMatch(normalizedQuery, normalizedTitle) * 20;
                score += this.fuzzyMatch(normalizedQuery, normalizedContent) * 5;

                return { ...item, score };
            })
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 10); // Limit to top 10 results
        }

        fuzzyMatch(pattern, text) {
            const patternLength = pattern.length;
            const textLength = text.length;
            
            if (patternLength === 0) return textLength === 0 ? 1 : 0;
            if (textLength === 0) return 0;

            const matrix = Array(patternLength + 1).fill().map(() => Array(textLength + 1).fill(0));

            for (let i = 0; i <= patternLength; i++) matrix[i][0] = i;
            for (let j = 0; j <= textLength; j++) matrix[0][j] = j;

            for (let i = 1; i <= patternLength; i++) {
                for (let j = 1; j <= textLength; j++) {
                    const cost = pattern[i - 1] === text[j - 1] ? 0 : 1;
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j] + 1,      // deletion
                        matrix[i][j - 1] + 1,      // insertion
                        matrix[i - 1][j - 1] + cost // substitution
                    );
                }
            }

            const maxLength = Math.max(patternLength, textLength);
            return 1 - (matrix[patternLength][textLength] / maxLength);
        }

        displayResults(results, query) {
            if (!this.searchResults) return;

            this.searchResults.innerHTML = '';

            if (results.length === 0) {
                this.displayNoResults(query);
                return;
            }

            results.forEach(result => {
                const resultElement = this.createResultElement(result, query);
                this.searchResults.appendChild(resultElement);
            });
        }

        createResultElement(result, query) {
            const resultDiv = document.createElement('div');
            resultDiv.className = 'search-result-item';
            resultDiv.dataset.url = result.url;

            const title = document.createElement('div');
            title.className = 'search-result-title';
            title.innerHTML = this.highlightMatches(result.title, query);

            const snippet = document.createElement('div');
            snippet.className = 'search-result-snippet';
            snippet.innerHTML = this.createSnippet(result.content, query);

            const path = document.createElement('div');
            path.className = 'search-result-path';
            path.textContent = `${result.category} • ${result.url}`;

            resultDiv.appendChild(title);
            resultDiv.appendChild(snippet);
            resultDiv.appendChild(path);

            return resultDiv;
        }

        highlightMatches(text, query) {
            const words = query.toLowerCase().trim().split(/\s+/);
            let highlightedText = text;

            words.forEach(word => {
                if (word.length > 1) {
                    const regex = new RegExp(`(${this.escapeRegex(word)})`, 'gi');
                    highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
                }
            });

            return highlightedText;
        }

        createSnippet(content, query, maxLength = 150) {
            const words = query.toLowerCase().trim().split(/\s+/);
            const contentLower = content.toLowerCase();
            
            // Find the best position to start the snippet
            let bestPosition = 0;
            let bestScore = 0;

            words.forEach(word => {
                const index = contentLower.indexOf(word);
                if (index !== -1) {
                    const score = words.filter(w => 
                        contentLower.substring(Math.max(0, index - 50), index + 100).includes(w)
                    ).length;
                    
                    if (score > bestScore) {
                        bestScore = score;
                        bestPosition = Math.max(0, index - 50);
                    }
                }
            });

            let snippet = content.substring(bestPosition, bestPosition + maxLength);
            
            // Clean up snippet boundaries
            if (bestPosition > 0) {
                snippet = '...' + snippet.substring(snippet.indexOf(' ') + 1);
            }
            if (bestPosition + maxLength < content.length) {
                snippet = snippet.substring(0, snippet.lastIndexOf(' ')) + '...';
            }

            return this.highlightMatches(snippet, query);
        }

        displayNoResults(query) {
            const noResultsDiv = document.createElement('div');
            noResultsDiv.className = 'search-no-results';
            noResultsDiv.innerHTML = `
                <i class="fas fa-search" style="font-size: 2rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                <p>No results found for "<strong>${this.escapeHtml(query)}</strong>"</p>
                <p style="font-size: var(--font-size-sm); color: var(--text-muted);">
                    Try different keywords or check out our main sections above.
                </p>
            `;
            this.searchResults.appendChild(noResultsDiv);
        }

        handleKeyboardNavigation(e) {
            const results = this.searchResults?.querySelectorAll('.search-result-item');
            if (!results || results.length === 0) return;

            let currentIndex = Array.from(results).findIndex(item => item.classList.contains('highlighted'));

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    currentIndex = (currentIndex + 1) % results.length;
                    this.highlightResult(results, currentIndex);
                    break;

                case 'ArrowUp':
                    e.preventDefault();
                    currentIndex = currentIndex <= 0 ? results.length - 1 : currentIndex - 1;
                    this.highlightResult(results, currentIndex);
                    break;

                case 'Enter':
                    e.preventDefault();
                    if (currentIndex >= 0) {
                        const url = results[currentIndex].dataset.url;
                        this.navigateToResult(url);
                    }
                    break;

                case 'Escape':
                    this.hideModal();
                    this.searchInput.blur();
                    break;
            }
        }

        highlightResult(results, index) {
            results.forEach(result => result.classList.remove('highlighted'));
            if (results[index]) {
                results[index].classList.add('highlighted');
                results[index].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }

        navigateToResult(url) {
            this.hideModal();
            
            if (url.startsWith('#')) {
                // Same page anchor
                const element = document.querySelector(url);
                if (element) {
                    const headerHeight = document.querySelector('.header')?.offsetHeight || 70;
                    const targetPosition = element.offsetTop - headerHeight - 20;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            } else if (url.startsWith('/') || url.startsWith('./') || url.includes('.html')) {
                // Different page
                window.location.href = url;
            } else {
                // External URL
                window.open(url, '_blank');
            }
        }

        showModal() {
            if (this.searchModal) {
                this.searchModal.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        }

        hideModal() {
            if (this.searchModal) {
                this.searchModal.classList.remove('active');
                document.body.style.overflow = '';
            }
        }

        loadSearchHistory() {
            try {
                return JSON.parse(localStorage.getItem('gema-search-history') || '[]');
            } catch (e) {
                return [];
            }
        }

        addToSearchHistory(query) {
            if (!this.searchHistory.includes(query)) {
                this.searchHistory.unshift(query);
                this.searchHistory = this.searchHistory.slice(0, 10); // Keep only last 10 searches
                localStorage.setItem('gema-search-history', JSON.stringify(this.searchHistory));
            }
        }

        async loadAdditionalData() {
            // This method could load additional search data from external sources
            // For now, it's a placeholder for future enhancements
            try {
                // Load from API or additional static files
                // const additionalData = await fetch('/api/search-data').then(r => r.json());
                // this.searchData.push(...additionalData);
            } catch (error) {
                console.log('No additional search data available');
            }
        }

        escapeRegex(string) {
            return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }

        escapeHtml(unsafe) {
            return unsafe
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }

        // Public method for external access
        performPublicSearch(query) {
            return this.performSearch(query);
        }
    }

    // Initialize search when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.SearchManager = new SearchManager();
        });
    } else {
        window.SearchManager = new SearchManager();
    }

    // Export for external access
    window.SearchManager = window.SearchManager || {};

})();