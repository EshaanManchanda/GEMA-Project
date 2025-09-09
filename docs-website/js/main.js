// Main JavaScript for Gema Documentation Website

(function() {
    'use strict';

    // DOM Elements
    const themeToggle = document.getElementById('theme-toggle');
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const searchInput = document.getElementById('search-input');
    const searchModal = document.getElementById('search-modal');
    const searchModalClose = document.getElementById('search-modal-close');
    const searchResults = document.getElementById('search-results');

    // Theme Management
    class ThemeManager {
        constructor() {
            this.currentTheme = localStorage.getItem('theme') || 'light';
            this.init();
        }

        init() {
            this.applyTheme();
            this.bindEvents();
        }

        bindEvents() {
            if (themeToggle) {
                themeToggle.addEventListener('click', () => this.toggleTheme());
            }
        }

        toggleTheme() {
            this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
            this.applyTheme();
            this.saveTheme();
        }

        applyTheme() {
            document.documentElement.setAttribute('data-theme', this.currentTheme);
            if (themeToggle) {
                const icon = themeToggle.querySelector('i');
                if (icon) {
                    icon.className = this.currentTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
                }
            }
        }

        saveTheme() {
            localStorage.setItem('theme', this.currentTheme);
        }
    }

    // Mobile Navigation
    class MobileNavigation {
        constructor() {
            this.isOpen = false;
            this.init();
        }

        init() {
            this.bindEvents();
            this.createOverlay();
        }

        bindEvents() {
            if (mobileMenuToggle) {
                mobileMenuToggle.addEventListener('click', () => this.toggleMenu());
            }

            // Close menu when clicking on overlay
            document.addEventListener('click', (e) => {
                if (e.target.classList.contains('sidebar-overlay')) {
                    this.closeMenu();
                }
            });

            // Close menu when clicking nav links on mobile
            if (sidebar) {
                sidebar.addEventListener('click', (e) => {
                    if (e.target.classList.contains('nav-link') && window.innerWidth <= 767) {
                        this.closeMenu();
                    }
                });
            }

            // Handle window resize
            window.addEventListener('resize', () => {
                if (window.innerWidth > 767 && this.isOpen) {
                    this.closeMenu();
                }
            });
        }

        createOverlay() {
            const overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay';
            document.body.appendChild(overlay);
            this.overlay = overlay;
        }

        toggleMenu() {
            this.isOpen ? this.closeMenu() : this.openMenu();
        }

        openMenu() {
            if (sidebar) {
                sidebar.classList.add('active');
                this.overlay.classList.add('active');
                document.body.style.overflow = 'hidden';
                this.isOpen = true;
                
                // Update toggle icon
                const icon = mobileMenuToggle.querySelector('i');
                if (icon) {
                    icon.className = 'fas fa-times';
                }
            }
        }

        closeMenu() {
            if (sidebar) {
                sidebar.classList.remove('active');
                this.overlay.classList.remove('active');
                document.body.style.overflow = '';
                this.isOpen = false;
                
                // Update toggle icon
                const icon = mobileMenuToggle.querySelector('i');
                if (icon) {
                    icon.className = 'fas fa-bars';
                }
            }
        }
    }

    // Navigation State Management
    class NavigationManager {
        constructor() {
            this.init();
        }

        init() {
            this.highlightCurrentPage();
            this.bindScrollSpy();
            this.handleNavigation();
        }

        highlightCurrentPage() {
            const currentPath = window.location.pathname;
            const navLinks = document.querySelectorAll('.nav-link');
            
            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === currentPath || 
                    (currentPath.includes('index.html') && link.getAttribute('href').includes('#'))) {
                    link.classList.add('active');
                }
            });
        }

        bindScrollSpy() {
            const sections = document.querySelectorAll('section[id]');
            const navLinks = document.querySelectorAll('.nav-link[href^="#"]');

            if (sections.length === 0 || navLinks.length === 0) return;

            const observerOptions = {
                root: null,
                rootMargin: '-20% 0px -70% 0px',
                threshold: 0
            };

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const targetId = entry.target.id;
                        navLinks.forEach(link => {
                            link.classList.remove('active');
                            if (link.getAttribute('href') === `#${targetId}`) {
                                link.classList.add('active');
                            }
                        });
                    }
                });
            }, observerOptions);

            sections.forEach(section => observer.observe(section));
        }

        handleNavigation() {
            document.addEventListener('click', (e) => {
                const link = e.target.closest('a[href^="#"]');
                if (link) {
                    e.preventDefault();
                    const targetId = link.getAttribute('href').substring(1);
                    const targetElement = document.getElementById(targetId);
                    
                    if (targetElement) {
                        const headerHeight = document.querySelector('.header')?.offsetHeight || 70;
                        const targetPosition = targetElement.offsetTop - headerHeight - 20;
                        
                        window.scrollTo({
                            top: targetPosition,
                            behavior: 'smooth'
                        });
                    }
                }
            });
        }
    }

    // Utility Functions
    class Utilities {
        static debounce(func, wait, immediate) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    timeout = null;
                    if (!immediate) func.apply(this, args);
                };
                const callNow = immediate && !timeout;
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
                if (callNow) func.apply(this, args);
            };
        }

        static throttle(func, limit) {
            let inThrottle;
            return function() {
                const args = arguments;
                const context = this;
                if (!inThrottle) {
                    func.apply(context, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        }

        static createElement(tag, className, content) {
            const element = document.createElement(tag);
            if (className) element.className = className;
            if (content) element.innerHTML = content;
            return element;
        }

        static formatDate(date) {
            return new Intl.DateTimeFormat('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }).format(new Date(date));
        }

        static copyToClipboard(text) {
            if (navigator.clipboard && window.isSecureContext) {
                return navigator.clipboard.writeText(text);
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'absolute';
                textArea.style.left = '-999999px';
                
                document.body.prepend(textArea);
                textArea.select();
                
                try {
                    document.execCommand('copy');
                    return Promise.resolve();
                } catch (error) {
                    return Promise.reject(error);
                } finally {
                    textArea.remove();
                }
            }
        }
    }

    // Code Block Enhancement
    class CodeBlockManager {
        constructor() {
            this.init();
        }

        init() {
            this.enhanceCodeBlocks();
        }

        enhanceCodeBlocks() {
            const codeBlocks = document.querySelectorAll('pre code, .code-block');
            
            codeBlocks.forEach(block => {
                this.addCopyButton(block);
                this.addSyntaxHighlighting(block);
            });
        }

        addCopyButton(codeBlock) {
            const wrapper = codeBlock.closest('pre') || codeBlock;
            const button = Utilities.createElement('button', 'code-copy-btn', '<i class="fas fa-copy"></i> Copy');
            
            button.addEventListener('click', async () => {
                const code = codeBlock.textContent;
                try {
                    await Utilities.copyToClipboard(code);
                    button.innerHTML = '<i class="fas fa-check"></i> Copied!';
                    button.classList.add('copied');
                    
                    setTimeout(() => {
                        button.innerHTML = '<i class="fas fa-copy"></i> Copy';
                        button.classList.remove('copied');
                    }, 2000);
                } catch (error) {
                    console.error('Failed to copy code:', error);
                    button.innerHTML = '<i class="fas fa-exclamation"></i> Failed';
                    setTimeout(() => {
                        button.innerHTML = '<i class="fas fa-copy"></i> Copy';
                    }, 2000);
                }
            });

            // Create header if it doesn't exist
            let header = wrapper.querySelector('.code-block-header');
            if (!header) {
                header = Utilities.createElement('div', 'code-block-header');
                const title = Utilities.createElement('span', 'code-block-title', 'Code');
                header.appendChild(title);
                wrapper.insertBefore(header, wrapper.firstChild);
            }
            
            header.appendChild(button);
        }

        addSyntaxHighlighting(codeBlock) {
            // Basic syntax highlighting for common languages
            const language = this.detectLanguage(codeBlock);
            if (language) {
                codeBlock.classList.add(`language-${language}`);
                this.highlightSyntax(codeBlock, language);
            }
        }

        detectLanguage(codeBlock) {
            const text = codeBlock.textContent;
            
            // Simple language detection based on content patterns
            if (text.includes('function') && text.includes('{') && text.includes('}')) {
                return 'javascript';
            } else if (text.includes('def ') || text.includes('import ')) {
                return 'python';
            } else if (text.includes('curl') || text.includes('npm ') || text.includes('git ')) {
                return 'bash';
            } else if (text.includes('<') && text.includes('>')) {
                return 'html';
            } else if (text.includes('{') && text.includes('"')) {
                return 'json';
            }
            
            return null;
        }

        highlightSyntax(codeBlock, language) {
            // Basic syntax highlighting - in a real implementation, 
            // you might want to use a library like Prism.js or highlight.js
            let highlightedContent = codeBlock.innerHTML;
            
            switch (language) {
                case 'javascript':
                    highlightedContent = highlightedContent
                        .replace(/\b(function|const|let|var|if|else|for|while|return|async|await)\b/g, '<span class="keyword">$1</span>')
                        .replace(/(['"`])(.*?)\1/g, '<span class="string">$1$2$1</span>')
                        .replace(/\/\/(.*?)$/gm, '<span class="comment">//$1</span>');
                    break;
                    
                case 'bash':
                    highlightedContent = highlightedContent
                        .replace(/^(\$|#)/gm, '<span class="prompt">$1</span>')
                        .replace(/\b(curl|npm|git|mkdir|cd|ls)\b/g, '<span class="command">$1</span>')
                        .replace(/(--?\w+)/g, '<span class="flag">$1</span>');
                    break;
                    
                case 'json':
                    highlightedContent = highlightedContent
                        .replace(/("[^"]*")\s*:/g, '<span class="key">$1</span>:')
                        .replace(/:\s*("[^"]*")/g, ': <span class="string">$1</span>')
                        .replace(/:\s*(\d+)/g, ': <span class="number">$1</span>')
                        .replace(/:\s*(true|false|null)/g, ': <span class="literal">$1</span>');
                    break;
            }
            
            codeBlock.innerHTML = highlightedContent;
        }
    }

    // Accordion Management
    class AccordionManager {
        constructor() {
            this.init();
        }

        init() {
            this.bindAccordionEvents();
        }

        bindAccordionEvents() {
            document.addEventListener('click', (e) => {
                const header = e.target.closest('.accordion-header');
                if (header) {
                    e.preventDefault();
                    this.toggleAccordion(header.parentElement);
                }
            });
        }

        toggleAccordion(accordionItem) {
            const isActive = accordionItem.classList.contains('active');
            
            // Close all other accordion items in the same group
            const group = accordionItem.closest('.accordion-group');
            if (group) {
                group.querySelectorAll('.accordion-item.active').forEach(item => {
                    if (item !== accordionItem) {
                        item.classList.remove('active');
                    }
                });
            }
            
            // Toggle current item
            accordionItem.classList.toggle('active', !isActive);
        }
    }

    // Performance Monitor
    class PerformanceMonitor {
        constructor() {
            this.metrics = {};
            this.init();
        }

        init() {
            this.measurePageLoad();
            this.setupPerformanceObserver();
        }

        measurePageLoad() {
            window.addEventListener('load', () => {
                const perfData = performance.timing;
                this.metrics.pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
                this.metrics.domContentLoaded = perfData.domContentLoadedEventEnd - perfData.navigationStart;
                this.metrics.firstByte = perfData.responseStart - perfData.navigationStart;
                
                console.log('Performance Metrics:', this.metrics);
            });
        }

        setupPerformanceObserver() {
            if ('PerformanceObserver' in window) {
                const observer = new PerformanceObserver((list) => {
                    list.getEntries().forEach((entry) => {
                        if (entry.entryType === 'largest-contentful-paint') {
                            this.metrics.lcp = entry.startTime;
                        } else if (entry.entryType === 'first-input') {
                            this.metrics.fid = entry.processingStart - entry.startTime;
                        } else if (entry.entryType === 'layout-shift') {
                            if (!entry.hadRecentInput) {
                                this.metrics.cls = (this.metrics.cls || 0) + entry.value;
                            }
                        }
                    });
                });

                try {
                    observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
                } catch (e) {
                    console.log('Performance Observer not fully supported');
                }
            }
        }

        getMetrics() {
            return this.metrics;
        }
    }

    // Initialize Application
    class App {
        constructor() {
            this.init();
        }

        init() {
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.initializeComponents());
            } else {
                this.initializeComponents();
            }
        }

        initializeComponents() {
            try {
                // Initialize core components
                this.themeManager = new ThemeManager();
                this.mobileNav = new MobileNavigation();
                this.navigationManager = new NavigationManager();
                this.codeBlockManager = new CodeBlockManager();
                this.accordionManager = new AccordionManager();
                this.performanceMonitor = new PerformanceMonitor();

                // Initialize search functionality (will be enhanced by search.js)
                this.initializeBasicSearch();

                console.log('Gema Documentation App initialized successfully');
            } catch (error) {
                console.error('Error initializing app:', error);
            }
        }

        initializeBasicSearch() {
            if (searchInput) {
                const debouncedSearch = Utilities.debounce((query) => {
                    if (window.SearchManager) {
                        window.SearchManager.performSearch(query);
                    }
                }, 300);

                searchInput.addEventListener('input', (e) => {
                    const query = e.target.value.trim();
                    if (query.length > 2) {
                        debouncedSearch(query);
                    } else if (searchModal) {
                        searchModal.classList.remove('active');
                    }
                });
            }

            // Close search modal
            if (searchModalClose) {
                searchModalClose.addEventListener('click', () => {
                    if (searchModal) {
                        searchModal.classList.remove('active');
                    }
                });
            }

            // Close on escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && searchModal && searchModal.classList.contains('active')) {
                    searchModal.classList.remove('active');
                }
            });
        }
    }

    // Export utilities for other scripts
    window.GemaUtils = Utilities;
    
    // Initialize the application
    new App();

})();