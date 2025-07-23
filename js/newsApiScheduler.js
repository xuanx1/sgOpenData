// Live News API Data Fetcher and Scheduler
// Fetches Singapore news data from World News API daily at 6 AM Singapore time
// Automatically updates the visualization with fresh data

class NewsApiScheduler {
    constructor() {
        this.apiKey = "990bf3a4e0034e0897525d9316f24b48";
        this.baseUrl = "https://api.worldnewsapi.com/search-news";
        this.articlesPerRequest = 100; // API limit per request
        this.maxArticles = 1000; // Maximum articles to fetch (adjust as needed)
        this.scheduledTime = { hour: 6, minute: 0 }; // 6:00 AM
        this.timeZone = 'Asia/Singapore';
        this.isRunning = false;
        this.lastFetchTime = null;
        this.currentData = null;
        
        // Bind methods
        this.init = this.init.bind(this);
        this.scheduleDaily = this.scheduleDaily.bind(this);
        this.fetchAllArticles = this.fetchAllArticles.bind(this);
        this.updateVisualization = this.updateVisualization.bind(this);
    }
    
    // Public method to start the scheduler
    async start() {
        return this.init();
    }
    
    // Initialize the scheduler
    init() {
        console.log('🚀 NewsApiScheduler initialized');
        console.log(`⏰ Scheduled to run daily at ${this.scheduledTime.hour}:${String(this.scheduledTime.minute).padStart(2, '0')} ${this.timeZone}`);
        
        // Check if we should fetch data immediately (if no recent data)
        const lastFetch = localStorage.getItem('lastNewsApiFetch');
        const now = new Date();
        
        if (!lastFetch || this.shouldFetchNow(new Date(lastFetch), now)) {
            console.log('📡 Fetching initial data...');
            this.fetchAllArticles();
        } else {
            console.log('📊 Loading cached data...');
            this.loadCachedData();
        }
        
        // Start the daily scheduler
        this.scheduleDaily();
        
        return this;
    }
    
    // Check if we should fetch data now
    shouldFetchNow(lastFetch, now) {
        // If more than 23 hours since last fetch, or if it's past 6 AM and we haven't fetched today
        const hoursSinceLastFetch = (now - lastFetch) / (1000 * 60 * 60);
        const todayAt6AM = new Date(now);
        todayAt6AM.setHours(this.scheduledTime.hour, this.scheduledTime.minute, 0, 0);
        
        return hoursSinceLastFetch > 23 || (now >= todayAt6AM && lastFetch < todayAt6AM);
    }
    
    // Schedule daily execution at 6 AM Singapore time
    scheduleDaily() {
        const now = new Date();
        const singapore = new Date(now.toLocaleString("en-US", {timeZone: this.timeZone}));
        
        // Calculate next 6 AM Singapore time
        const nextRun = new Date(singapore);
        nextRun.setHours(this.scheduledTime.hour, this.scheduledTime.minute, 0, 0);
        
        // If 6 AM has already passed today, schedule for tomorrow
        if (nextRun <= singapore) {
            nextRun.setDate(nextRun.getDate() + 1);
        }
        
        // Convert back to local time
        const localNextRun = new Date(nextRun.getTime() - (singapore.getTime() - now.getTime()));
        const timeUntilNext = localNextRun - now;
        
        console.log(`⏰ Next fetch scheduled for: ${localNextRun.toLocaleString()} (${Math.round(timeUntilNext / (1000 * 60 * 60))} hours from now)`);
        
        setTimeout(() => {
            this.fetchAllArticles();
            // Schedule the next day
            this.scheduleDaily();
        }, timeUntilNext);
    }
    
    // Fetch all available articles (paginated requests)
    async fetchAllArticles() {
        if (this.isRunning) {
            console.log('⚠️ Fetch already in progress, skipping...');
            return;
        }
        
        this.isRunning = true;
        console.log('📡 Starting news data fetch...');
        
        try {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const dateStr = yesterday.toISOString().split('T')[0];
            
            let allArticles = [];
            let offset = 0;
            let hasMore = true;
            let requestCount = 0;
            const maxRequests = Math.ceil(this.maxArticles / this.articlesPerRequest);
            
            while (hasMore && requestCount < maxRequests) {
                console.log(`📥 Fetching batch ${requestCount + 1}/${maxRequests} (offset: ${offset})`);
                
                const url = new URL(this.baseUrl);
                url.searchParams.append('language', 'en');
                url.searchParams.append('earliest-publish-date', dateStr);
                url.searchParams.append('source-country', 'sg');
                url.searchParams.append('sort-direction', 'desc');
                url.searchParams.append('number', this.articlesPerRequest.toString());
                url.searchParams.append('offset', offset.toString());
                
                const response = await fetch(url.toString(), {
                    headers: {
                        'x-api-key': this.apiKey
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                
                if (data.news && data.news.length > 0) {
                    allArticles = allArticles.concat(data.news);
                    offset += this.articlesPerRequest;
                    requestCount++;
                    
                    // Check if we got fewer articles than requested (end of data)
                    if (data.news.length < this.articlesPerRequest) {
                        hasMore = false;
                    }
                    
                    // Respect API rate limits
                    await this.delay(500); // 500ms delay between requests
                } else {
                    hasMore = false;
                }
            }
            
            console.log(`✅ Successfully fetched ${allArticles.length} articles`);
            
            // Process and cache the data
            this.currentData = this.processArticles(allArticles);
            this.cacheData(this.currentData);
            this.lastFetchTime = new Date();
            localStorage.setItem('lastNewsApiFetch', this.lastFetchTime.toISOString());
            
            // Update the visualization
            this.updateVisualization();
            
        } catch (error) {
            console.error('❌ Error fetching news data:', error);
            
            // Try to load cached data as fallback
            this.loadCachedData();
        } finally {
            this.isRunning = false;
        }
    }
    
    // Process articles into the format expected by the visualization
    processArticles(articles) {
        console.log('🔄 Processing articles for visualization...');
        
        // Add IDs and process articles
        const processedArticles = articles.map((article, index) => ({
            id: index + 1,
            title: article.title || 'Untitled',
            url: article.url || '',
            text: article.text || article.summary || '',
            sentiment: this.calculateSentiment(article.text || article.summary || article.title || ''),
            category: this.categorizeArticle(article),
            publish_date: article.publish_date || new Date().toISOString(),
            source: article.source || 'Unknown',
            author: article.author || 'Unknown'
        }));
        
        console.log(`📊 Processed ${processedArticles.length} articles`);
        console.log('📈 Categories found:', this.getCategoryStats(processedArticles));
        
        return processedArticles;
    }
    
    // Simple sentiment analysis (you can enhance this)
    calculateSentiment(text) {
        if (!text) return 0;
        
        const positiveWords = ['good', 'great', 'excellent', 'positive', 'success', 'growth', 'benefit', 'improve', 'win', 'gain', 'rise', 'increase'];
        const negativeWords = ['bad', 'terrible', 'negative', 'crisis', 'problem', 'decline', 'loss', 'fail', 'decrease', 'concern', 'worry', 'issue'];
        
        const words = text.toLowerCase().split(/\W+/);
        let score = 0;
        
        words.forEach(word => {
            if (positiveWords.includes(word)) score += 1;
            if (negativeWords.includes(word)) score -= 1;
        });
        
        // Normalize to -1 to 1 range
        return Math.max(-1, Math.min(1, score / Math.max(1, words.length / 20)));
    }
    
    // Categorize articles based on content
    categorizeArticle(article) {
        const text = `${article.title || ''} ${article.text || article.summary || ''}`.toLowerCase();
        
        const categories = {
            'politics': ['government', 'parliament', 'minister', 'policy', 'election', 'political', 'mps', 'pap', 'opposition'],
            'business': ['business', 'economy', 'market', 'company', 'financial', 'trade', 'investment', 'profit', 'gdp', 'economic'],
            'sports': ['sports', 'football', 'soccer', 'basketball', 'tennis', 'olympic', 'athlete', 'championship', 'tournament', 'match'],
            'technology': ['technology', 'tech', 'digital', 'ai', 'artificial intelligence', 'startup', 'innovation', 'app', 'software', 'cyber'],
            'health': ['health', 'medical', 'hospital', 'covid', 'virus', 'pandemic', 'healthcare', 'medicine', 'doctor', 'treatment'],
            'entertainment': ['entertainment', 'movie', 'film', 'music', 'celebrity', 'concert', 'show', 'festival', 'art', 'culture'],
            'science': ['science', 'research', 'study', 'university', 'scientist', 'discovery', 'experiment', 'academic', 'education'],
            'world': ['international', 'global', 'world', 'foreign', 'overseas', 'abroad', 'embassy', 'diplomatic', 'china', 'usa', 'europe']
        };
        
        for (const [category, keywords] of Object.entries(categories)) {
            if (keywords.some(keyword => text.includes(keyword))) {
                return category;
            }
        }
        
        return 'general';
    }
    
    // Get category statistics
    getCategoryStats(articles) {
        const stats = {};
        articles.forEach(article => {
            stats[article.category] = (stats[article.category] || 0) + 1;
        });
        return stats;
    }
    
    // Cache data to localStorage
    cacheData(data) {
        try {
            localStorage.setItem('newsApiData', JSON.stringify(data));
            localStorage.setItem('newsApiDataTimestamp', Date.now().toString());
            console.log('💾 Data cached successfully');
        } catch (error) {
            console.error('❌ Error caching data:', error);
        }
    }
    
    // Get cached data for external use
    getCachedData() {
        try {
            const cachedData = localStorage.getItem('newsApiData');
            if (cachedData) {
                return JSON.parse(cachedData);
            }
        } catch (error) {
            console.error('❌ Error retrieving cached data:', error);
        }
        return null;
    }
    
    // Load cached data
    loadCachedData() {
        try {
            const cachedData = localStorage.getItem('newsApiData');
            const timestamp = localStorage.getItem('newsApiDataTimestamp');
            
            if (cachedData && timestamp) {
                this.currentData = JSON.parse(cachedData);
                const age = Date.now() - parseInt(timestamp);
                console.log(`📂 Loaded cached data (${Math.round(age / (1000 * 60 * 60))} hours old)`);
                this.updateVisualization();
                return true;
            }
        } catch (error) {
            console.error('❌ Error loading cached data:', error);
        }
        return false;
    }
    
    // Update the visualization with new data
    updateVisualization() {
        if (!this.currentData || this.currentData.length === 0) {
            console.warn('⚠️ No data available for visualization');
            return;
        }
        
        console.log('🎨 Updating visualization with fresh data...');
        
        // Create hierarchical structure for the visualization
        const { nodes, links } = this.createHierarchicalStructure(this.currentData);
        
        // Update the visualization
        if (typeof window.hierarchicalEdgeBundling === 'function') {
            window.hierarchicalEdgeBundling('#network-graph4', nodes, links, this.currentData);
            console.log('✅ Visualization updated successfully');
            
            // Show status update
            this.showStatusUpdate(`📊 Visualization updated with ${this.currentData.length} articles`);
        } else {
            console.error('❌ Visualization function not available');
        }
    }
    
    // Create hierarchical structure for D3 visualization
    createHierarchicalStructure(articles) {
        const nodes = [];
        const links = [];
        
        // Root node
        nodes.push({ id: 'root', parent: null });
        
        // Category nodes
        const categories = [...new Set(articles.map(a => a.category))];
        categories.forEach(category => {
            nodes.push({ id: category, parent: 'root' });
        });
        
        // Article nodes
        articles.forEach(article => {
            nodes.push({
                id: article.id.toString(),
                parent: article.category,
                label: article.title
            });
        });
        
        // Create links based on similarity (simple example)
        for (let i = 0; i < articles.length; i++) {
            for (let j = i + 1; j < articles.length; j++) {
                if (this.calculateSimilarity(articles[i], articles[j]) > 0.3) {
                    links.push({
                        source: articles[i].id.toString(),
                        target: articles[j].id.toString(),
                        weight: this.calculateSimilarity(articles[i], articles[j])
                    });
                }
            }
        }
        
        console.log(`🔗 Created ${nodes.length} nodes and ${links.length} links`);
        return { nodes, links };
    }
    
    // Calculate similarity between articles
    calculateSimilarity(article1, article2) {
        if (article1.category === article2.category) {
            return 0.5 + Math.random() * 0.3; // Same category = higher similarity
        }
        return Math.random() * 0.4; // Different category = lower similarity
    }
    
    // Show status update to user
    showStatusUpdate(message) {
        // Create or update status element
        let statusElement = document.getElementById('news-api-status');
        if (!statusElement) {
            statusElement = document.createElement('div');
            statusElement.id = 'news-api-status';
            statusElement.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(26, 26, 46, 0.95);
                border: 1px solid rgba(100, 255, 218, 0.5);
                border-radius: 8px;
                padding: 10px 15px;
                color: #64ffda;
                font-size: 12px;
                font-family: monospace;
                z-index: 10000;
                backdrop-filter: blur(10px);
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                transition: opacity 0.3s ease;
            `;
            document.body.appendChild(statusElement);
        }
        
        statusElement.textContent = message;
        statusElement.style.opacity = '1';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            statusElement.style.opacity = '0';
        }, 5000);
    }
    
    // Manual refresh method
    async refresh() {
        console.log('🔄 Manual refresh triggered');
        await this.fetchAllArticles();
    }
    
    // Get current status
    getStatus() {
        return {
            isRunning: this.isRunning,
            lastFetchTime: this.lastFetchTime,
            articlesCount: this.currentData ? this.currentData.length : 0,
            nextScheduledTime: this.getNextScheduledTime()
        };
    }
    
    // Get next scheduled time
    getNextScheduledTime() {
        const now = new Date();
        const singapore = new Date(now.toLocaleString("en-US", {timeZone: this.timeZone}));
        const nextRun = new Date(singapore);
        nextRun.setHours(this.scheduledTime.hour, this.scheduledTime.minute, 0, 0);
        
        if (nextRun <= singapore) {
            nextRun.setDate(nextRun.getDate() + 1);
        }
        
        return nextRun;
    }
    
    // Utility delay function
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Create global instance
window.NewsApiScheduler = NewsApiScheduler; // Make sure the class is globally available
window.newsApiScheduler = new NewsApiScheduler();

// Auto-initialize when DOM is ready (but allow manual control)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Don't auto-initialize, let app4.js control it
        console.log('📡 NewsApiScheduler ready for initialization');
    });
} else {
    console.log('📡 NewsApiScheduler ready for initialization');
}

// Add manual controls for testing
window.addEventListener('load', () => {
    // Add keyboard shortcuts for manual control
    document.addEventListener('keydown', (e) => {
        // Ctrl+Shift+R for manual refresh
        if (e.ctrlKey && e.shiftKey && e.key === 'R') {
            console.log('🔄 Manual refresh triggered by keyboard shortcut');
            window.newsApiScheduler.refresh();
        }
        
        // Ctrl+Shift+S for status
        if (e.ctrlKey && e.shiftKey && e.key === 'S') {
            console.log('📊 Current status:', window.newsApiScheduler.getStatus());
        }
    });
});

console.log('📡 NewsApiScheduler loaded. Use Ctrl+Shift+R to manually refresh, Ctrl+Shift+S for status');
