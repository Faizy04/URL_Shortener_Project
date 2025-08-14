class URLShortener {
    constructor() {
        this.initializeElements();
        this.attachEventListeners();
        this.currentShortUrl = '';
    }

    initializeElements() {
        // Form elements
        this.urlForm = document.getElementById('urlForm');
        this.urlInput = document.getElementById('urlInput');
        this.shortenBtn = document.getElementById('shortenBtn');
        
        // Display elements
        this.loading = document.getElementById('loading');
        this.error = document.getElementById('error');
        this.result = document.getElementById('result');
        this.shortUrl = document.getElementById('shortUrl');
        
        // Action buttons
        this.copyBtn = document.getElementById('copyBtn');
        this.visitBtn = document.getElementById('visitBtn');
        this.statsBtn = document.getElementById('statsBtn');
        this.shareBtn = document.getElementById('shareBtn');
        
        // Stats elements
        this.stats = document.getElementById('stats');
        this.clickCount = document.getElementById('clickCount');
        this.createdDate = document.getElementById('createdDate');
        
        // Modal elements
        this.shareModal = document.getElementById('shareModal');
        this.closeModal = document.getElementById('closeModal');
    }

    attachEventListeners() {
        // Form submission
        this.urlForm.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Action buttons
        this.copyBtn.addEventListener('click', () => this.copyToClipboard());
        this.visitBtn.addEventListener('click', () => this.visitUrl());
        this.statsBtn.addEventListener('click', () => this.showStats());
        this.shareBtn.addEventListener('click', () => this.showShareModal());
        
        // Modal
        this.closeModal.addEventListener('click', () => this.hideShareModal());
        this.shareModal.addEventListener('click', (e) => {
            if (e.target === this.shareModal) {
                this.hideShareModal();
            }
        });
        
        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.shareModal.classList.contains('hidden')) {
                this.hideShareModal();
            }
        });

        // Auto-focus on input
        this.urlInput.focus();
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const url = this.urlInput.value.trim();
        if (!url) {
            this.showError('Please enter a URL');
            return;
        }

        this.showLoading();
        this.hideError();
        this.hideResult();
        this.hideStats();

        try {
            const response = await fetch('/shorten', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url: url })
            });

            const data = await response.json();

            if (response.ok) {
                this.showResult(data);
            } else {
                this.showError(data.error || 'An error occurred');
            }
        } catch (error) {
            this.showError('Network error. Please try again.');
            console.error('Error:', error);
        } finally {
            this.hideLoading();
        }
    }

    showLoading() {
        this.loading.classList.remove('hidden');
        this.shortenBtn.disabled = true;
        this.shortenBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Shortening...';
    }

    hideLoading() {
        this.loading.classList.add('hidden');
        this.shortenBtn.disabled = false;
        this.shortenBtn.innerHTML = '<i class="fas fa-compress-alt"></i> Shorten';
    }

    showError(message) {
        this.error.textContent = message;
        this.error.classList.remove('hidden');
        
        // Auto-hide error after 5 seconds
        setTimeout(() => {
            this.hideError();
        }, 5000);
    }

    hideError() {
        this.error.classList.add('hidden');
    }

    showResult(data) {
        this.currentShortUrl = data.short_url;
        
        
        this.shortUrl.value = data.short_url;
    
        this.result.classList.remove('hidden');
        
        // Auto-select the short URL
        this.shortUrl.select();
    }

    hideResult() {
        this.result.classList.add('hidden');
    }

    hideStats() {
        this.stats.classList.add('hidden');
    }

    async copyToClipboard() {
        try {
            await navigator.clipboard.writeText(this.currentShortUrl);
            
            // Visual feedback
            const originalText = this.copyBtn.innerHTML;
            this.copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
            this.copyBtn.classList.add('copy-success');
            
            setTimeout(() => {
                this.copyBtn.innerHTML = originalText;
                this.copyBtn.classList.remove('copy-success');
            }, 2000);
            
            this.showNotification('URL copied to clipboard!', 'success');
        } catch (error) {
            // Fallback for older browsers
            this.shortUrl.select();
            document.execCommand('copy');
            this.showNotification('URL copied to clipboard!', 'success');
        }
    }

    visitUrl() {
        window.open(this.currentShortUrl, '_blank');
    }

    async showStats() {
        if (!this.currentShortUrl) return;
        
        try {
            // Extract short code from URL
            const shortCode = this.currentShortUrl.split('/').pop();
            const response = await fetch(`/stats/${shortCode}`);
            
            if (response.ok) {
                const data = await response.json();
                
                this.clickCount.textContent = data.click_count;
                this.createdDate.textContent = new Date(data.created_at).toLocaleDateString();
                this.stats.classList.remove('hidden');
            } else {
                this.showError('Unable to load statistics');
            }
        } catch (error) {
            this.showError('Error loading statistics');
            console.error('Stats error:', error);
        }
    }

    showShareModal() {
        this.shareModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    hideShareModal() {
        this.shareModal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check' : 'info'}-circle"></i>
            ${message}
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : '#3b82f6'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-weight: 500;
            animation: slideInRight 0.3s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

// Social sharing functions
function shareToTwitter() {
    const url = urlShortener.currentShortUrl;
    const text = `Check out this link: ${url}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
}

function shareToFacebook() {
    const url = urlShortener.currentShortUrl;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
}

function shareToWhatsApp() {
    const url = urlShortener.currentShortUrl;
    const text = `Check out this link: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}

function shareToEmail() {
    const url = urlShortener.currentShortUrl;
    const subject = 'Check out this link';
    const body = `I thought you might be interested in this: ${url}`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
}

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100%);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
`;
document.head.appendChild(style);

// Initialize the application
const urlShortener = new URLShortener();

// Service worker for offline functionality (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/static/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}
