// Network Graph Visualization using D3.js Hierarchical Edge Bundling
// Displays Singapore news articles with category-based coloring and interactive features

(function() {
    // Add universal CSS styles with performance optimizations
    const universalStyles = document.createElement('style');
    universalStyles.textContent = `
        * {
            line-height: 1.5;
        }
        body {
            line-height: 1.5;
        }
        /* Performance optimizations */
        #network-graph4 {
            will-change: transform;
            transform: translateZ(0);
            -webkit-transform: translateZ(0);
        }
        #network-graph4 svg {
            will-change: transform;
            transform: translateZ(0);
            -webkit-transform: translateZ(0);
        }
        /* Improve scrolling and panning performance */
        #container4 {
            -webkit-overflow-scrolling: touch;
            overflow-scrolling: touch;
        }
        /* Reduce expensive CSS operations */
        .node, .link {
            will-change: transform, opacity;
            transform: translateZ(0);
            -webkit-transform: translateZ(0);
        }
        /* Loading animation */
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(universalStyles);

    // Initialize app container — chrome lives in ST figure wrapper
    const app4 = d3.select("#container4")
        .html("")
        .classed("st-viz-card", true);

    // Particle background canvas (kept for graph backdrop, opacity 0)
    const particleCanvas = app4.append("canvas")
        .attr("id", "particle-canvas")
        .attr("class", "st-particle-canvas");

    // Controls container
    const controlsContainer4 = app4.append("div")
        .attr("class", "st-controls");

    const filterControls4 = controlsContainer4.append("div")
        .attr("class", "st-filters");

    // Category filter
    const categoryGroup = filterControls4.append("div").attr("class", "st-filter-group");
    categoryGroup.append("label").attr("class", "st-filter-label").text("Category");
    const categorySelect4 = categoryGroup.append("select")
        .attr("id", "category-filter4")
        .attr("class", "st-select");

    // Sentiment filter
    const sentimentGroup = filterControls4.append("div").attr("class", "st-filter-group");
    sentimentGroup.append("label").attr("class", "st-filter-label").text("Sentiment");
    const sentimentSelect4 = sentimentGroup.append("select")
        .attr("id", "sentiment-filter4")
        .attr("class", "st-select");

    // Search box
    const searchGroup = filterControls4.append("div").attr("class", "st-filter-group");
    searchGroup.append("label").attr("class", "st-filter-label").text("Search");
    searchGroup.append("input")
        .attr("type", "search")
        .attr("id", "search-input4")
        .attr("class", "st-input")
        .attr("placeholder", "Search articles…");

    // Graph container — dark canvas for contrast
    const graphContainer4 = app4.append("div")
        .attr("id", "network-graph4")
        .attr("class", "st-graph-canvas")
        .on("click", function() {
            console.log('=== GRAPH CONTAINER CLICKED ===');
        });

    // Info panel (revealed on node click)
    const infoPanel4 = app4.append("div")
        .attr("id", "info-panel4")
        .attr("class", "st-panel st-panel-light")
        .style("display", "none");

    // Statistics panel
    const statsPanel4 = app4.append("div")
        .attr("id", "stats-panel4")
        .attr("class", "st-panel");
    
    console.log('Stats panel created:', d3.select('#stats-panel4').node());

    // Global variables
    let newsData4 = [], filteredData4 = [];
    let categories4 = new Set();
    let currentFilter4 = { category: 'all', sentiment: 'all', search: '' };

    // Cache for initial network state (nodes and links)
    let initialNetworkCache = null;

    // Newspaper-data palette — kept in sync with hierarchicalEdgeBundling.js
    const categoryColors4 = {
        'politics':      '#E2503B',
        'business':      '#E8B23A',
        'sports':        '#3FB6C9',
        'technology':    '#6FB07A',
        'health':        '#C97FA0',
        'entertainment': '#B488D6',
        'science':       '#5E8FD6',
        'world':         '#D58A4E',
        'opinion':       '#B0B6C8',
        'general':       '#9BA3B5',
        'default':       '#7B8497'
    };

    const sentimentColors4 = {
        'positive': '#6FB07A',
        'negative': '#E2503B',
        'neutral':  '#B0B6C8'
    };

    // Particle system for background animation (optimized for performance)
    const initParticleSystem = () => {
        const canvas = document.getElementById('particle-canvas');
        const ctx = canvas.getContext('2d');
        
        // Performance optimization: reduce particle count and update frequency
        let animationId;
        let lastFrameTime = 0;
        const targetFPS = 30; // Limit to 30 FPS for better performance
        const frameInterval = 1000 / targetFPS;
        
        const resizeCanvas = () => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        };
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        
        const particles = [];
        const maxParticles = 50; // Reduced from 100 for better performance
        
        // Create particles
        for (let i = 0; i < maxParticles; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.3, // Reduced speed
                vy: (Math.random() - 0.5) * 0.3,
                size: Math.random() * 1.5 + 0.5, // Smaller particles
                opacity: Math.random() * 0.4 + 0.1, // Lower opacity
                twinkle: Math.random() * 0.01 + 0.005 // Slower twinkle
            });
        }
        
        const animate = (currentTime) => {
            // Throttle animation to target FPS
            if (currentTime - lastFrameTime < frameInterval) {
                animationId = requestAnimationFrame(animate);
                return;
            }
            lastFrameTime = currentTime;
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            particles.forEach(particle => {
                // Update position
                particle.x += particle.vx;
                particle.y += particle.vy;
                
                // Wrap around edges
                if (particle.x < 0) particle.x = canvas.width;
                if (particle.x > canvas.width) particle.x = 0;
                if (particle.y < 0) particle.y = canvas.height;
                if (particle.y > canvas.height) particle.y = 0;
                
                // Twinkle effect
                particle.opacity += particle.twinkle;
                if (particle.opacity > 0.5 || particle.opacity < 0.1) {
                    particle.twinkle *= -1;
                }
                
                // Draw particle without glow for better performance
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(100, 255, 218, ${particle.opacity})`;
                ctx.fill();
            });
            
            animationId = requestAnimationFrame(animate);
        };
        
        animationId = requestAnimationFrame(animate);
        
        // Pause animation when page is not visible
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                cancelAnimationFrame(animationId);
            } else {
                animationId = requestAnimationFrame(animate);
            }
        });
    };

    // Initialize particle system
    setTimeout(initParticleSystem, 500);

    // Helper function to add opacity to color
    const addOpacityToColor = (color, opacity) => {
        if (color.startsWith('#')) {
            const hex = color.slice(1);
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            return `rgba(${r}, ${g}, ${b}, ${opacity})`;
        }
        if (color.startsWith('rgba')) {
            return color.replace(/[\d\.]+\)$/g, `${opacity})`);
        }
        if (color.startsWith('rgb')) {
            return color.replace('rgb', 'rgba').replace(')', `, ${opacity})`);
        }
        return color;
    };

    // Parse JSON data from news file
    const parseJSONData4 = (jsonData) => {
        if (!jsonData || !Array.isArray(jsonData)) {
            console.error('JSON data is not an array or is empty');
            return [];
        }
        console.log(`Processing ${jsonData.length} articles from JSON`);
        console.log('Sample article structure:', jsonData[0]); // Debug: check structure
        // Clear categories before processing new data
        categories4.clear();
        const data = [];
        for (let i = 0; i < Math.min(jsonData.length, 500); i++) { // Limit for performance
            try {
                const article = jsonData[i];
                const item = {
                    id: article.id || `article_${i}`,
                    title: article.title || 'Untitled Article',
                    text: article.text || article.summary || '',
                    sentiment: parseFloat(article.sentiment) || 0,
                    url: article.url || '',
                    publish_date: article.publish_date || '',
                    author: article.author || '',
                    authors: article.authors || [],
                    language: article.language || 'en',
                    source_country: article.source_country || 'sg',
                    image: article.image || '',
                    video: article.video || ''
                };
                // Clean category - be more flexible with category detection
                if (article.category && article.category.trim()) {
                    item.category = article.category.toLowerCase().trim();
                } else {
                    item.category = 'general';
                }
                // Debug: log category and sentiment for first few articles
                if (i < 3) {
                    console.log(`Article ${i}: category="${item.category}", sentiment=${item.sentiment}, title="${item.title.substring(0, 50)}..."`);
                }
                // Only add categories that actually have articles
                categories4.add(item.category);
                data.push(item);
            } catch (error) {
                console.warn(`Error parsing article ${i}:`, error);
                continue;
            }
        }
        console.log(`Successfully parsed ${data.length} articles`);
        console.log('Categories found:', Array.from(categories4));
        // Verify categories actually exist in data
        const actualCategories = {};
        data.forEach(article => {
            actualCategories[article.category] = (actualCategories[article.category] || 0) + 1;
        });
        console.log('Category counts:', actualCategories);

        // === Build initialNetworkCache from LIVE data ===
        // This ensures the cache always reflects the latest live data
        const allNodes = [];
        const allCategoryMap = {};
        allNodes.push({ id: 'root', parent: '', label: 'News Network' });
        data.forEach((d, i) => {
            if (!allCategoryMap[d.category]) {
                allNodes.push({ id: d.category, parent: 'root', label: d.category });
                allCategoryMap[d.category] = true;
            }
            allNodes.push({ id: d.id, parent: d.category, label: d.title });
        });
        const allLinks = [];
        const processingLimit = Math.min(data.length, 60);
        for (let i = 0; i < processingLimit; i++) {
            for (let j = i + 1; j < processingLimit; j++) {
                const node1 = data[i];
                const node2 = data[j];
                let connectionWeight = 0;
                if (node1.category === node2.category) connectionWeight += 0.6;
                const sentimentDiff = Math.abs(node1.sentiment - node2.sentiment);
                if (sentimentDiff < 0.3) connectionWeight += 0.4;
                if (node1.title && node2.title) {
                    const title1Words = node1.title.toLowerCase().split(' ').filter(w => w.length > 3);
                    const title2Words = node2.title.toLowerCase().split(' ').filter(w => w.length > 3);
                    const commonWords = title1Words.filter(word => title2Words.includes(word)).length;
                    if (commonWords > 0) connectionWeight += commonWords * 0.3;
                }
                if (connectionWeight > 0.7) {
                    allLinks.push({ source: node1.id, target: node2.id });
                }
            }
        }
        initialNetworkCache = {
            nodes: allNodes,
            links: allLinks,
            articles: [...data],
            categories: Array.from(categories4)
        };

        return data;
    };

    // Create network from news data
    const createNetworkFromData4 = (data) => {
        console.log('=== CREATE NETWORK FROM DATA CALLED ===');
        console.log('Data passed:', data ? data.length : 'null/undefined');
        console.log('newsData4 current length:', newsData4.length);
        if (!data || data.length === 0) {
            console.error('No data available to create network');
            d3.select('#network-graph4').html('<div class="st-graph-message">No data available</div>');
            updateStats4();
            return;
        }
        console.log(`Creating hierarchical network from ${data.length} articles`);
        // Reset filteredData4 to empty when creating network with full data
        filteredData4 = [];
        // Re-initialize filters with the new data categories
        console.log('Re-initializing filters with new data...');
        initializeFilters4();
        // Always use filtered network logic, even for initial load
        filterNetwork4();
        // ...existing code...
        setTimeout(() => {
            d3.select(`#layout-heb`)
                .style("background", "#DDE3EC")
                .style("border-color", "#0F69FF")
                .style("box-shadow", "0 0 20px rgba(100, 255, 218, 0.4)");
        }, 100);
        // Update statistics
        console.log('About to call updateStats4 with data available');
        updateStats4();
    };
    
    // Enhanced layout with clustering and animations
    const applyLayout4 = () => {
        // Since we only have hierarchical bundling now, always use that
        const layoutMode = currentFilter4.layoutMode || 'heb';
        
        console.log(`Applying ${layoutMode} layout`);
        
        if (layoutMode === 'heb') {
            applyHierarchicalEdgeBundling4();
        }
    };
    
    // Apply hierarchical edge bundling layout
    const applyHierarchicalEdgeBundling4 = () => {
        console.log('=== APPLYING HIERARCHICAL EDGE BUNDLING ===');
        console.log('newsData4 length:', newsData4.length);
        console.log('hierarchicalEdgeBundling function available:', typeof hierarchicalEdgeBundling);
        console.log('window.hierarchicalEdgeBundling available:', typeof window.hierarchicalEdgeBundling);
        
        // Check if we have data
        if (!newsData4 || newsData4.length === 0) {
            console.error('No news data available for hierarchical bundling');
            return;
        }
        
        // Check if function is available (try both variants)
        const hebFunction = window.hierarchicalEdgeBundling || hierarchicalEdgeBundling;
        if (typeof hebFunction !== 'function') {
            console.error('hierarchicalEdgeBundling function not available');
            return;
        }
        
        // Prepare hierarchical data and links with CONSISTENT approach
        const nodes = [];
        const links = [];
        const categoryMap = {};
        
        // Add root node
        nodes.push({ id: 'root', parent: '', label: 'News Network' });
        
        // Add category nodes and article nodes
        newsData4.forEach((d, i) => {
            if (!categoryMap[d.category]) {
                nodes.push({ id: d.category, parent: 'root', label: d.category });
                categoryMap[d.category] = true;
            }
            nodes.push({ id: d.id, parent: d.category, label: d.title });
        });
        
        console.log('Created nodes:', nodes.length);
        
        // Use consistent edge logic (same as filtered view)
        const processingLimit = Math.min(newsData4.length, 60); // Consistent with filtered view
        for (let i = 0; i < processingLimit; i++) {
            for (let j = i + 1; j < processingLimit; j++) {
                const node1 = newsData4[i];
                const node2 = newsData4[j];
                let connectionWeight = 0;
                if (node1.category === node2.category) connectionWeight += 0.6;
                const sentimentDiff = Math.abs(node1.sentiment - node2.sentiment);
                if (sentimentDiff < 0.3) connectionWeight += 0.4;
                if (node1.title && node2.title) {
                    const title1Words = node1.title.toLowerCase().split(' ').filter(w => w.length > 3);
                    const title2Words = node2.title.toLowerCase().split(' ').filter(w => w.length > 3);
                    const commonWords = title1Words.filter(word => title2Words.includes(word)).length;
                    if (commonWords > 0) connectionWeight += commonWords * 0.3;
                }
                if (connectionWeight > 0.7) {
                    links.push({ source: node1.id, target: node2.id });
                }
            }
        }
        
        console.log('Created links:', links.length);
        console.log('Sample nodes:', nodes.slice(0, 5));
        console.log('Sample links:', links.slice(0, 5));
        
        // Load D3 hierarchical edge bundling
        try {
            // Create dynamic category colors based on actual data
            const actualCategories = new Set();
            newsData4.forEach(article => {
                if (article.category) {
                    actualCategories.add(article.category);
                }
            });
            
            // Create dynamic color mapping using same color scheme but only for actual categories
            const dynamicCategoryColors = {};
            Array.from(actualCategories).forEach(category => {
                dynamicCategoryColors[category] = categoryColors4[category] || categoryColors4['default'];
            });
            dynamicCategoryColors['default'] = categoryColors4['default'];
            
            console.log('Dynamic category colors created for main view:', Object.keys(dynamicCategoryColors));
            
            hebFunction('#network-graph4', nodes, links, newsData4, dynamicCategoryColors);
            console.log('hierarchicalEdgeBundling called successfully');
        } catch (error) {
            console.error('Error calling hierarchicalEdgeBundling:', error);
        }
    };
    
    // Clustered layout by sentiment with smooth transitions
    
    // Filter network based on current filters (with performance optimization)
    const filterNetwork4 = () => {
        console.log('=== FILTER NETWORK CALLED ===');
        console.log('Current filters:', currentFilter4);
        console.log('Total articles to filter:', newsData4.length);
        // Show loading indicator
        d3.select('#network-graph4').html('<div class="st-graph-message"><span class="st-spinner"></span>Filtering articles…</div>');
        // Use requestAnimationFrame to avoid blocking the UI
        requestAnimationFrame(() => {
            // Always apply filtered view, even if all filters are 'all'
            const filteredArticles = newsData4.filter((article, index) => {
                let include = true;
                // Category filter
                if (currentFilter4.category !== 'all') {
                    if (article.category !== currentFilter4.category) {
                        include = false;
                    }
                }
                // Sentiment filter
                const sentiment = article.sentiment > 0.1 ? 'positive' : 
                                 article.sentiment < -0.1 ? 'negative' : 'neutral';
                if (currentFilter4.sentiment !== 'all') {
                    if (sentiment !== currentFilter4.sentiment) {
                        include = false;
                    }
                }
                // Search filter
                if (currentFilter4.search && currentFilter4.search.trim()) {
                    const searchTerm = currentFilter4.search.toLowerCase();
                    if (!article.title.toLowerCase().includes(searchTerm)) {
                        include = false;
                    }
                }
                return include;
            });
            filteredData4 = filteredArticles;
            applyHierarchicalEdgeBundlingToData4(filteredArticles);
        });
    };
    
    // Apply hierarchical edge bundling to specific dataset
    const applyHierarchicalEdgeBundlingToData4 = (data) => {
        console.log('=== APPLYING HIERARCHICAL EDGE BUNDLING TO DATA ===');
        console.log('Data length:', data.length);
        console.log('Is this filtered data?', data !== newsData4);
        
        // Check if we have data
        if (!data || data.length === 0) {
            console.error('No data available for hierarchical bundling');
            
            // Show helpful message based on filter state
            let message = 'No articles match the current filters';
            if (currentFilter4.category !== 'all') {
                const actualCategories = new Set();
                if (newsData4) {
                    newsData4.forEach(article => actualCategories.add(article.category));
                }
                if (!actualCategories.has(currentFilter4.category)) {
                    message = `No articles found in category "${currentFilter4.category}". Available categories: ${Array.from(actualCategories).join(', ')}`;
                }
            }
            
            d3.select('#network-graph4').html(`<div class="st-graph-message">
                <div>${message}</div>
                <div class="st-graph-message-hint">Try selecting "All categories" or a different category.</div>
            </div>`);
            return;
        }
        
        // Check if function is available (try both variants)
        const hebFunction = window.hierarchicalEdgeBundling || hierarchicalEdgeBundling;
        if (typeof hebFunction !== 'function') {
            console.error('hierarchicalEdgeBundling function not available');
            return;
        }
        

        // === CONNECTION CONSISTENCY GUARANTEE ===
        // Connections (links) are ALWAYS built from the full dataset (newsData4), regardless of filters applied.
        // Filtering only affects which nodes and links are displayed, NOT how connections are constructed.
        // This ensures the network structure and connections between nodes remain consistent for all views.

        // 1. Create comprehensive nodes structure from ALL data
        const allNodes = [];
        const allCategoryMap = {};
        allNodes.push({ id: 'root', parent: '', label: 'News Network' });
        newsData4.forEach((d, i) => {
            if (!allCategoryMap[d.category]) {
                allNodes.push({ id: d.category, parent: 'root', label: d.category });
                allCategoryMap[d.category] = true;
            }
            allNodes.push({ id: d.id, parent: d.category, label: d.title });
        });

        // 2. Create comprehensive links from ALL data (consistent processing)
        const allLinks = [];
        const processingLimit = Math.min(newsData4.length, 60); // Consistent limit for all views
        console.log(`Building comprehensive connection map with ${processingLimit} articles from full dataset`);
        for (let i = 0; i < processingLimit; i++) {
            for (let j = i + 1; j < processingLimit; j++) {
                const node1 = newsData4[i];
                const node2 = newsData4[j];
                let connectionWeight = 0;
                if (node1.category === node2.category) connectionWeight += 0.6;
                const sentimentDiff = Math.abs(node1.sentiment - node2.sentiment);
                if (sentimentDiff < 0.3) connectionWeight += 0.4;
                if (node1.title && node2.title) {
                    const title1Words = node1.title.toLowerCase().split(' ').filter(w => w.length > 3);
                    const title2Words = node2.title.toLowerCase().split(' ').filter(w => w.length > 3);
                    const commonWords = title1Words.filter(word => title2Words.includes(word)).length;
                    if (commonWords > 0) connectionWeight += commonWords * 0.3;
                }
                if (connectionWeight > 0.7) {
                    allLinks.push({ source: node1.id, target: node2.id });
                }
            }
        }

        // 3. Filter nodes and links to only show relevant ones for current view
        const filteredArticleIds = new Set(data.map(article => article.id));
        const relevantCategories = new Set(data.map(article => article.category));
        const displayNodes = allNodes.filter(node => {
            if (node.id === 'root') return true;
            if (relevantCategories.has(node.id)) return true;
            if (filteredArticleIds.has(node.id)) return true;
            return false;
        });
        const displayLinks = allLinks.filter(link => 
            filteredArticleIds.has(link.source) && filteredArticleIds.has(link.target)
        );

        console.log('All nodes:', allNodes.length);
        console.log('Display nodes:', displayNodes.length);
        console.log('All links:', allLinks.length);
        console.log('Display links:', displayLinks.length);
        console.log('Filtered articles:', filteredArticleIds.size);
        
        // 4. Pass the filtered structure to visualization
        try {
            // Create dynamic category colors based on actual filtered data
            const actualCategories = new Set();
            data.forEach(article => {
                if (article.category) {
                    actualCategories.add(article.category);
                }
            });
            
            // Create dynamic color mapping using same color scheme but only for actual categories
            const dynamicCategoryColors = {};
            Array.from(actualCategories).forEach(category => {
                dynamicCategoryColors[category] = categoryColors4[category] || categoryColors4['default'];
            });
            dynamicCategoryColors['default'] = categoryColors4['default'];
            
            console.log('Dynamic category colors created for filtered view:', Object.keys(dynamicCategoryColors));
            
            hebFunction('#network-graph4', displayNodes, displayLinks, data, dynamicCategoryColors);
            console.log('hierarchicalEdgeBundling applied successfully to consistent filtered data');
        } catch (error) {
            console.error('Error applying hierarchicalEdgeBundling to filtered data:', error);
        }
    };

    // Show node information with elegant styling
    const showNodeInfo4 = (nodeData) => {
        const panel = d3.select('#info-panel4');
        panel.style('display', 'block');
        
        panel.html(`
            <div class="st-info-eyebrow">Article</div>
            <h3 class="st-info-title">${nodeData.title}</h3>
            <div class="st-info-grid">
                <div class="st-info-cell">
                    <div class="st-info-label">Details</div>
                    <table class="st-info-table">
                        <tr><td>Category</td><td><span class="st-info-chip" style="--chip-color:${nodeData.color};">${nodeData.category}</span></td></tr>
                        <tr><td>Sentiment</td><td><span style="color:${sentimentColors4[nodeData.sentiment]};">${nodeData.sentiment}</span> (${nodeData.sentimentScore ? nodeData.sentimentScore.toFixed(3) : 'N/A'})</td></tr>
                        <tr><td>Author</td><td>${nodeData.author || 'Unknown'}</td></tr>
                        <tr><td>Date</td><td>${nodeData.publish_date || 'N/A'}</td></tr>
                    </table>
                </div>
                <div class="st-info-cell">
                    <div class="st-info-label">Text preview</div>
                    <div class="st-info-preview">${(nodeData.text || '').substring(0, 400)}${(nodeData.text || '').length > 400 ? '…' : ''}</div>
                </div>
            </div>
            ${nodeData.url ? `<div class="st-info-actions"><a class="st-btn" href="${nodeData.url}" target="_blank" rel="noopener">Read full article</a></div>` : ''}
        `);
    };

    // Hide node information
    const hideNodeInfo4 = () => {
        d3.select('#info-panel4').style('display', 'none');
    };

    // Update statistics
    const updateStats4 = () => {
        console.log('=== UPDATE STATS CALLED ===');
        console.log('newsData4 length:', newsData4 ? newsData4.length : 'undefined');
        console.log('filteredData4 length:', filteredData4 ? filteredData4.length : 'undefined');
        
        // Use the current filtered data or all news data
        // If filteredData4 is empty, it means we're showing all data (not filtered)
        const currentData = (filteredData4.length > 0) ? filteredData4 : newsData4;
        const isFiltered = filteredData4.length > 0;
        
        console.log('currentData length:', currentData ? currentData.length : 'undefined');
        console.log('isFiltered:', isFiltered);
        
        if (!currentData || currentData.length === 0) {
            console.log('No data available, showing empty state');
            d3.select('#stats-panel4').html(`
                <div class="st-panel-eyebrow">Network statistics</div>
                <h3 class="st-panel-title">Network statistics</h3>
                <p class="st-panel-meta">No data available.</p>
            `);
            return;
        }
        
        const categoryCount = {};
        const sentimentCount = { positive: 0, negative: 0, neutral: 0 };
        
        // Count statistics from current data
        currentData.forEach(article => {
            // Category count
            const category = article.category || 'general';
            categoryCount[category] = (categoryCount[category] || 0) + 1;
            
            // Sentiment count
            const sentiment = article.sentiment > 0.1 ? 'positive' : 
                             article.sentiment < -0.1 ? 'negative' : 'neutral';
            sentimentCount[sentiment]++;
        });
        
        // Calculate connection count (optimized for performance)
        let connectionCount = 0;
        const dataSize = Math.min(currentData.length, 40); // Increased from 25 for better accuracy
        for (let i = 0; i < dataSize; i++) {
            for (let j = i + 1; j < dataSize; j++) {
                const node1 = currentData[i];
                const node2 = currentData[j];
                let connectionWeight = 0;
                if (node1.category === node2.category) connectionWeight += 0.6;
                const sentimentDiff = Math.abs(node1.sentiment - node2.sentiment);
                if (sentimentDiff < 0.3) connectionWeight += 0.4;
                if (node1.title && node2.title) {
                    const title1Words = node1.title.toLowerCase().split(' ').filter(w => w.length > 3);
                    const title2Words = node2.title.toLowerCase().split(' ').filter(w => w.length > 3);
                    const commonWords = title1Words.filter(word => title2Words.includes(word)).length;
                    if (commonWords > 0) connectionWeight += commonWords * 0.3;
                }
                if (connectionWeight > 0.7) {
                    connectionCount++;
                }
            }
        }
        
        // Get current date for data retrieval
        const now = new Date();
        const dataRetrievalDate = now.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            timeZone: 'Asia/Singapore'
        });

        // Update the figure-source "Last loaded" stamp
        const stamp = document.getElementById('news-last-updated');
        if (stamp) stamp.textContent = `${dataRetrievalDate} · ${currentData.length} articles`;

        // Calculate total for percentage calculations
        const totalArticles = currentData.length;
        
        const statsHtml = `
            <div class="st-panel-eyebrow">Network statistics</div>
            <h3 class="st-panel-title">${isFiltered ? `${currentData.length} of ${newsData4.length} articles` : `${currentData.length} articles in the network`}</h3>
            <p class="st-panel-meta">Live data as of ${dataRetrievalDate}. News updates automatically at 6 am SGT each day.</p>
            <div class="st-panel-grid">
                <section class="st-panel-section">
                    <div class="st-panel-section-title">Network overview</div>
                    <table class="st-panel-table">
                        <tr><td>Articles</td><td>${currentData.length}</td></tr>
                        <tr><td>Connections</td><td>${connectionCount}</td></tr>
                        <tr><td>Categories</td><td>${Object.keys(categoryCount).length}</td></tr>
                    </table>
                    <p class="st-panel-foot">Connections are computed from shared category (+0.6), similar sentiment (+0.4) and shared title keywords (+0.3 per word). Pairs above 0.7 are linked.</p>
                </section>
                <section class="st-panel-section">
                    <div class="st-panel-section-title">Sentiment distribution</div>
                    <table class="st-panel-table">
                        <tr><td><span class="st-dot" style="--dot:${sentimentColors4.positive};"></span>Positive</td><td>${sentimentCount.positive} <span class="st-panel-pct">(${((sentimentCount.positive / totalArticles) * 100).toFixed(1)}%)</span></td></tr>
                        <tr><td><span class="st-dot" style="--dot:${sentimentColors4.negative};"></span>Negative</td><td>${sentimentCount.negative} <span class="st-panel-pct">(${((sentimentCount.negative / totalArticles) * 100).toFixed(1)}%)</span></td></tr>
                        <tr><td><span class="st-dot" style="--dot:${sentimentColors4.neutral};"></span>Neutral</td><td>${sentimentCount.neutral} <span class="st-panel-pct">(${((sentimentCount.neutral / totalArticles) * 100).toFixed(1)}%)</span></td></tr>
                    </table>
                    <p class="st-panel-foot">Sentiment scored from −1.0 to +1.0 via NLP. Above 0.1 is positive; below −0.1 is negative; in between, neutral.</p>
                </section>
            </div>
            ${Object.keys(categoryCount).length > 0 ? `
                <section class="st-panel-section st-panel-section-wide">
                    <div class="st-panel-section-title">Category distribution</div>
                    <div class="st-category-grid">
                        ${Object.entries(categoryCount)
                            .sort((a, b) => b[1] - a[1])
                            .map(([category, count]) => {
                                const percentage = ((count / totalArticles) * 100).toFixed(1);
                                return `<div class="st-category-row">
                                    <span class="st-category-label"><span class="st-dot" style="--dot:${categoryColors4[category] || categoryColors4.default};"></span>${category.charAt(0).toUpperCase() + category.slice(1)}</span>
                                    <span class="st-category-value">${count} <span class="st-panel-pct">(${percentage}%)</span></span>
                                </div>`;
                            }).join('')}
                    </div>
                    <p class="st-panel-foot">Percentages based on ${isFiltered ? 'filtered' : 'all'} articles in this view.</p>
                </section>
            ` : ''}
        `;
        
        console.log('statsHtml generated, length:', statsHtml.length);
        console.log('Setting HTML on #stats-panel4');
        
        d3.select('#stats-panel4').html(statsHtml);
        
        // Ensure the content was actually set
        setTimeout(() => {
            const panelContent = d3.select('#stats-panel4').html();
            if (!panelContent || panelContent.length < 100) {
                console.warn('Stats panel content not set properly, retrying...');
                d3.select('#stats-panel4').html(statsHtml);
            }
        }, 100);
    };

    // Debounce function for performance optimization
    const debounce = (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    };

    // Initialize filters
    const initializeFilters4 = () => {
        console.log('=== INITIALIZING FILTERS ===');
        console.log('Categories available:', Array.from(categories4));
        
        // Verify categories actually exist in newsData4
        const actualCategories = new Set();
        if (newsData4 && newsData4.length > 0) {
            newsData4.forEach(article => {
                if (article.category) {
                    actualCategories.add(article.category);
                }
            });
        }
        console.log('Actual categories in data:', Array.from(actualCategories));
        
        // Use only categories that actually exist in the data
        const categoriesToUse = actualCategories.size > 0 ? actualCategories : categories4;
        
        // Clear existing options first
        categorySelect4.selectAll('option').remove();
        sentimentSelect4.selectAll('option').remove();
        
        // Populate category filter with only existing categories
        const categoryOptions = ['all', ...Array.from(categoriesToUse).sort()];
        categorySelect4.selectAll('option')
            .data(categoryOptions)
            .enter()
            .append('option')
            .attr('value', d => d)
            .text(d => d === 'all' ? 'All Categories' : d.charAt(0).toUpperCase() + d.slice(1));

        // Populate sentiment filter
        const sentimentOptions = ['all', 'positive', 'negative', 'neutral'];
        sentimentSelect4.selectAll('option')
            .data(sentimentOptions)
            .enter()
            .append('option')
            .attr('value', d => d)
            .text(d => d === 'all' ? 'All Sentiments' : d.charAt(0).toUpperCase() + d.slice(1));

        // Remove existing event listeners to avoid duplicates
        categorySelect4.on('change', null);
        sentimentSelect4.on('change', null);
        d3.select('#search-input4').on('input', null);

        // Add event listeners with debouncing for better performance
        categorySelect4.on('change', function() {
            console.log('Category filter changed to:', this.value);
            currentFilter4.category = this.value;
            debouncedFilterNetwork();
        });

        sentimentSelect4.on('change', function() {
            console.log('Sentiment filter changed to:', this.value);
            currentFilter4.sentiment = this.value;
            debouncedFilterNetwork();
        });

        const debouncedFilterNetwork = debounce(filterNetwork4, 300); // 300ms delay
        const debouncedSearchFilter = debounce(() => {
            filterNetwork4();
        }, 500); // 500ms delay for search

        d3.select('#search-input4').on('input', function() {
            console.log('Search filter changed to:', this.value);
            currentFilter4.search = this.value;
            debouncedSearchFilter();
        });
        
        console.log('Filter event listeners attached');
        console.log('Available category options:', categoryOptions);
        
        // If current filter category doesn't exist in actual data, reset to 'all'
        if (currentFilter4.category !== 'all' && !actualCategories.has(currentFilter4.category)) {
            console.warn(`Current filter category "${currentFilter4.category}" doesn't exist in data, resetting to "all"`);
            currentFilter4.category = 'all';
            categorySelect4.property('value', 'all');
        }
    };

    // Setup controls - placeholder function for compatibility
    const setupControls4 = () => {
        console.log('Controls setup completed (UI elements already created)');
        // Controls are already set up in the initial DOM creation above
        // This function exists for compatibility with the initialization flow
    };

    // Load and process data
    const loadData4 = async () => {
        try {
            console.log('Starting data loading process...');
            
            // First, try to load the fallback static data to ensure visualization works
            let fallbackSuccessful = false;
            try {
                console.log('Attempting to load fallback static data...');
                const response = await fetch('data/news_sg_20250723_032253.json');
                if (response.ok) {
                    const jsonData = await response.json();
                    newsData4 = parseJSONData4(jsonData);
                    console.log(`Fallback: Loaded ${newsData4.length} news articles from static file`);
                    
                    if (newsData4.length > 500) {
                        newsData4 = newsData4.slice(0, 500);
                        console.log(`Using sample of ${newsData4.length} articles for better performance`);
                    }
                    
                    // Clear current filters to reset state
                    currentFilter4 = { category: 'all', sentiment: 'all', search: '' };
                    d3.select('#category-filter4').property('value', 'all');
                    d3.select('#sentiment-filter4').property('value', 'all');
                    d3.select('#search-input4').property('value', '');
                    
                    createNetworkFromData4(newsData4);
                    fallbackSuccessful = true;
                    
                    // Force stats update after fallback data is loaded
                    setTimeout(() => {
                        updateStats4();
                    }, 1000);
                    
                    // Show that we're using fallback but will try to get live data
                    d3.select('#stats-panel4').append('div')
                        .style('position', 'absolute')
                        .style('top', '10px')
                        .style('right', '10px')
                        .style('background', 'rgba(255, 167, 38, 0.9)')
                        .style('color', '#1a1a1a')
                        .style('padding', '5px 10px')
                        .style('border-radius', '4px')
                        .style('font-size', '10px')
                        .text('Static Data - Checking for live updates...');
                }
            } catch (fallbackError) {
                console.warn('Static fallback data not available:', fallbackError.message);
            }
            
            // Now try to initialize live data
            console.log('Attempting to set up live data...');
            
            // Check if NewsApiScheduler class is available
            if (typeof window.NewsApiScheduler === 'undefined') {
                console.warn('NewsApiScheduler class not available. Using static data only.');
                if (!fallbackSuccessful) {
                    throw new Error('Neither live API nor static data is available.');
                }
                return;
            }
            
            // Use existing global instance or create new one
            let newsScheduler;
            if (window.newsApiScheduler) {
                console.log('Using existing global NewsApiScheduler instance');
                newsScheduler = window.newsApiScheduler;
            } else {
                console.log('Creating new NewsApiScheduler instance');
                newsScheduler = new window.NewsApiScheduler();
            }
            
            // Try to get cached data from API
            const cachedData = newsScheduler.getCachedData();
            if (cachedData && cachedData.length > 0) {
                console.log('Found cached API data, updating visualization...');
                newsData4 = parseJSONData4(cachedData);
                console.log(`Loaded ${newsData4.length} news articles from API cache`);
                
                if (newsData4.length > 500) {
                    newsData4 = newsData4.slice(0, 500);
                    console.log(`Using sample of ${newsData4.length} articles for better performance`);
                }
                
                // Clear current filters to reset state
                currentFilter4 = { category: 'all', sentiment: 'all', search: '' };
                d3.select('#category-filter4').property('value', 'all');
                d3.select('#sentiment-filter4').property('value', 'all');
                d3.select('#search-input4').property('value', '');
                
                createNetworkFromData4(newsData4);
                
                // Remove fallback message
                d3.select('#stats-panel4 div').remove();
                
                // Force stats update after API data is loaded
                setTimeout(() => {
                    updateStats4();
                }, 500);
            }
            
            // Set up update callback for future data
            newsScheduler.onDataUpdate = (data) => {
                console.log(`Received ${data.length} articles from live API`);
                newsData4 = parseJSONData4(data);
                console.log(`Processed ${newsData4.length} news articles`);
                
                if (newsData4.length > 500) {
                    newsData4 = newsData4.slice(0, 500);
                    console.log(`Using sample of ${newsData4.length} articles for better performance`);
                }
                
                // Clear current filters to reset state
                currentFilter4 = { category: 'all', sentiment: 'all', search: '' };
                d3.select('#category-filter4').property('value', 'all');
                d3.select('#sentiment-filter4').property('value', 'all');
                d3.select('#search-input4').property('value', '');
                
                createNetworkFromData4(newsData4);
                
                // Remove any status messages
                d3.select('#stats-panel4 div').remove();
            };
            
            // Start the scheduler (this will fetch fresh data if needed)
            if (typeof newsScheduler.start === 'function') {
                console.log('Starting live data scheduler...');
                await newsScheduler.start();
            } else if (typeof newsScheduler.init === 'function') {
                console.log('Initializing live data scheduler...');
                await newsScheduler.init();
            }
            
            // Add manual refresh capability
            window.refreshNewsData = () => {
                console.log('Manual refresh requested');
                if (typeof newsScheduler.refresh === 'function') {
                    newsScheduler.refresh();
                } else if (typeof newsScheduler.fetchAllArticles === 'function') {
                    newsScheduler.fetchAllArticles();
                }
            };
            
            // Add manual stats update capability
            window.updateStats = () => {
                console.log('Manual stats update requested');
                updateStats4();
            };
            
            // Add category mapping test
            window.testCategoryMapping = () => {
                console.log('=== TESTING CATEGORY MAPPING ===');
                console.log('newsData4 length:', newsData4 ? newsData4.length : 'undefined');
                console.log('categoryColors4:', categoryColors4);
                
                if (newsData4 && newsData4.length > 0) {
                    const actualCategories = new Set();
                    newsData4.forEach(article => {
                        if (article.category) {
                            actualCategories.add(article.category);
                        }
                    });
                    
                    console.log('Actual categories in data:', Array.from(actualCategories));
                    
                    // Test dynamic color mapping
                    const dynamicCategoryColors = {};
                    Array.from(actualCategories).forEach(category => {
                        dynamicCategoryColors[category] = categoryColors4[category] || categoryColors4['default'];
                    });
                    dynamicCategoryColors['default'] = categoryColors4['default'];
                    
                    console.log('Dynamic category colors:', dynamicCategoryColors);
                    
                    // Test hierarchical bundling function availability
                    console.log('hierarchicalEdgeBundling function available:', typeof window.hierarchicalEdgeBundling);
                    
                    return { actualCategories: Array.from(actualCategories), dynamicCategoryColors };
                }
                
                return null;
            };
            
            // Add simple visualization test
            window.testVisualization = () => {
                console.log('=== TESTING VISUALIZATION ===');
                console.log('D3 available:', typeof d3);
                console.log('hierarchicalEdgeBundling available:', typeof window.hierarchicalEdgeBundling);
                console.log('newsData4 length:', newsData4 ? newsData4.length : 0);
                console.log('Container exists:', d3.select('#network-graph4').node() ? 'yes' : 'no');
                
                if (newsData4 && newsData4.length > 0) {
                    console.log('Attempting to re-create visualization...');
                    createNetworkFromData4(newsData4);
                } else {
                    console.log('No data available for visualization');
                }
            };
            
            // Add connection debugging function
            window.debugConnections = () => {
                console.log('=== DEBUGGING CONNECTIONS ===');
                console.log('Current filters:', currentFilter4);
                console.log('newsData4 length:', newsData4 ? newsData4.length : 0);
                console.log('filteredData4 length:', filteredData4 ? filteredData4.length : 0);
                
                const dataToCheck = (filteredData4.length > 0) ? filteredData4 : newsData4;
                console.log('Data being used for connections:', dataToCheck ? dataToCheck.length : 0);
                
                if (dataToCheck && newsData4 && newsData4.length > 0) {
                    // Test connection algorithm with FULL dataset (for consistency)
                    let totalConnections = 0;
                    let displayConnections = 0;
                    const testLimit = Math.min(newsData4.length, 20); // Test first 20 from full dataset
                    const filteredIds = new Set(dataToCheck.map(article => article.id));
                    
                    console.log(`Testing connections in full dataset (first ${testLimit} articles):`);
                    console.log('Filtered article IDs:', Array.from(filteredIds));
                    
                    for (let i = 0; i < testLimit; i++) {
                        for (let j = i + 1; j < testLimit; j++) {
                            const node1 = newsData4[i];
                            const node2 = newsData4[j];
                            let connectionWeight = 0;
                            
                            // Same category
                            if (node1.category === node2.category) connectionWeight += 0.6;
                            
                            // Similar sentiment
                            const sentimentDiff = Math.abs(node1.sentiment - node2.sentiment);
                            if (sentimentDiff < 0.3) connectionWeight += 0.4;
                            
                            // Common title words
                            if (node1.title && node2.title) {
                                const title1Words = node1.title.toLowerCase().split(' ').filter(w => w.length > 3);
                                const title2Words = node2.title.toLowerCase().split(' ').filter(w => w.length > 3);
                                const commonWords = title1Words.filter(word => title2Words.includes(word)).length;
                                if (commonWords > 0) connectionWeight += commonWords * 0.3;
                            }
                            
                            if (connectionWeight > 0.7) {
                                totalConnections++;
                                
                                // Check if this connection would be displayed in filtered view
                                const inFilteredView = filteredIds.has(node1.id) && filteredIds.has(node2.id);
                                
                                if (inFilteredView) {
                                    displayConnections++;
                                    console.log(`✓ DISPLAYED Connection ${displayConnections}: Article ${i} (${node1.id}) <-> Article ${j} (${node2.id}) (weight: ${connectionWeight.toFixed(2)})`);
                                } else {
                                    console.log(`✗ HIDDEN Connection ${totalConnections}: Article ${i} (${node1.id}) <-> Article ${j} (${node2.id}) (weight: ${connectionWeight.toFixed(2)}) - Not in filtered view`);
                                }
                                
                                console.log(`  - Categories: "${node1.category}" <-> "${node2.category}"`);
                                console.log(`  - Sentiments: ${node1.sentiment} <-> ${node2.sentiment} (diff: ${sentimentDiff.toFixed(3)})`);
                                console.log(`  - In filtered view: ${inFilteredView}`);
                            }
                        }
                    }
                    
                    console.log(`\n=== SUMMARY ===`);
                    console.log(`Total connections in full dataset sample: ${totalConnections}`);
                    console.log(`Connections visible in current view: ${displayConnections}`);
                    console.log(`Connection consistency: ${displayConnections}/${totalConnections} connections preserved when filtering`);
                    
                    // Check category distribution
                    const categoryDistribution = {};
                    dataToCheck.forEach(article => {
                        categoryDistribution[article.category] = (categoryDistribution[article.category] || 0) + 1;
                    });
                    console.log('Category distribution in current view:', categoryDistribution);
                    
                    const fullCategoryDistribution = {};
                    newsData4.forEach(article => {
                        fullCategoryDistribution[article.category] = (fullCategoryDistribution[article.category] || 0) + 1;
                    });
                    console.log('Category distribution in full dataset:', fullCategoryDistribution);
                    
                    return { 
                        totalConnections, 
                        displayConnections, 
                        categoryDistribution, 
                        fullCategoryDistribution,
                        filteredArticles: filteredIds.size,
                        totalArticles: newsData4.length,
                        sampleSize: testLimit 
                    };
                }
                
                return null;
            };
            
            // Add manual filter test capability
            window.testFilters = () => {
                console.log('=== MANUAL FILTER TEST ===');
                console.log('newsData4 length:', newsData4.length);
                console.log('filteredData4 length:', filteredData4.length);
                console.log('categories4:', Array.from(categories4));
                console.log('currentFilter4:', currentFilter4);
                
                // Check actual categories in data
                const actualCategories = {};
                newsData4.forEach(article => {
                    actualCategories[article.category] = (actualCategories[article.category] || 0) + 1;
                });
                console.log('Actual category counts in data:', actualCategories);
                
                console.log('Sample articles:');
                newsData4.slice(0, 5).forEach((article, i) => {
                    console.log(`  ${i}: category="${article.category}", sentiment=${article.sentiment}, title="${article.title.substring(0, 50)}..."`);
                });
                
                // Test filter dropdowns
                console.log('Category dropdown value:', d3.select('#category-filter4').property('value'));
                console.log('Sentiment dropdown value:', d3.select('#sentiment-filter4').property('value'));
                console.log('Search input value:', d3.select('#search-input4').property('value'));
                
                // Re-initialize filters
                initializeFilters4();
                
                // Test with a category that actually exists
                const availableCategories = Object.keys(actualCategories);
                if (availableCategories.length > 0) {
                    const testCategory = availableCategories[0];
                    console.log(`=== TESTING FILTER LOGIC ===`);
                    console.log(`Testing with category filter: ${testCategory} (has ${actualCategories[testCategory]} articles)`);
                    currentFilter4.category = testCategory;
                    d3.select('#category-filter4').property('value', testCategory);
                    filterNetwork4();
                }
            };
            
            // Add reset filters function
            window.resetFilters = () => {
                console.log('=== RESETTING FILTERS ===');
                currentFilter4 = { category: 'all', sentiment: 'all', search: '' };
                d3.select('#category-filter4').property('value', 'all');
                d3.select('#sentiment-filter4').property('value', 'all');
                d3.select('#search-input4').property('value', '');
                filterNetwork4();
            };
            
            // Add category mapping test function
            window.testCategoryMapping = () => {
                console.log('=== TESTING CATEGORY MAPPING ===');
                
                // Check actual categories in data
                const actualCategories = new Set();
                newsData4.forEach(article => {
                    if (article.category) {
                        actualCategories.add(article.category);
                    }
                });
                console.log('Actual categories in data:', Array.from(actualCategories));
                
                // Check dropdown options
                const dropdownOptions = [];
                d3.select('#category-filter4').selectAll('option').each(function() {
                    if (this.value !== 'all') {
                        dropdownOptions.push(this.value);
                    }
                });
                console.log('Category dropdown options (excluding "all"):', dropdownOptions);
                
                // Check color mappings
                console.log('Available color mappings in categoryColors4:', Object.keys(categoryColors4));
                
                // Check which categories have colors
                Array.from(actualCategories).forEach(category => {
                    const hasColor = categoryColors4[category] !== undefined;
                    const color = categoryColors4[category] || categoryColors4['default'];
                    console.log(`Category "${category}": has predefined color = ${hasColor}, color = ${color}`);
                });
                
                // Verify legend will show correct categories
                const legendCategories = Array.from(actualCategories).map(cat => 
                    [cat, categoryColors4[cat] || categoryColors4['default']]
                );
                console.log('Legend categories that will be shown:', legendCategories);
                
                return { actualCategories: Array.from(actualCategories), dropdownOptions, legendCategories };
            };
            
            // Ensure stats are updated after a delay
            setTimeout(() => {
                console.log('Delayed stats update check...');
                if (newsData4 && newsData4.length > 0) {
                    updateStats4();
                }
            }, 2000);
            
            console.log('Data loading process complete.');
            
        } catch (error) {
            console.error('Error in data loading process:', error);
            
            // Show error but don't crash if we have some data
            if (newsData4 && newsData4.length > 0) {
                console.log('Continuing with available data despite error');
                // Add error indicator
                d3.select('#stats-panel4').append('div')
                    .style('position', 'absolute')
                    .style('top', '10px')
                    .style('right', '10px')
                    .style('background', 'rgba(231, 76, 60, 0.9)')
                    .style('color', '#ffffff')
                    .style('padding', '5px 10px')
                    .style('border-radius', '4px')
                    .style('font-size', '10px')
                    .text('Live data unavailable');
            } else {
                // Complete failure - show error message
                d3.select('#stats-panel4').html(`
                    <h3 style="color: #e74c3c;">Error loading data</h3>
                    <p>Could not load news data from any source.</p>
                    <p><strong>Error:</strong> ${error.message}</p>
                    <div style="margin-top: 10px;">
                        <button onclick="window.location.reload()" style="background: #0F69FF; color: #fff; border: none; padding: 9px 16px; border-radius: 10px; cursor: pointer; font-weight: 600;">
                            Retry
                        </button>
                    </div>
                `);
            }
        }
    };

    // Simple initialization for D3 hierarchical bundling
    const initialize4 = () => {
        console.log('=== INITIALIZE4 CALLED ===');
        console.log('Initializing news visualization with D3.js hierarchical edge bundling');
        console.log('Stats panel exists:', d3.select('#stats-panel4').node() ? 'YES' : 'NO');
        
        setupControls4();
        
        // Initial empty state for stats panel
        console.log('Setting initial stats panel content...');
        d3.select('#stats-panel4').html(`
            <h3 style="margin-top: 0; color: #0F69FF; text-shadow: none;">Network Statistics</h3>
            <div style="text-align: center; color: #1B1F3A; padding: 20px;">
                Loading data...
            </div>
        `);
        console.log('Initial stats content set');
        
        // Try to update stats immediately in case data is already available
        setTimeout(() => {
            if (newsData4 && newsData4.length > 0) {
                console.log('Data already available, updating stats and filters...');
                initializeFilters4(); // Ensure filters are set up with available data
                updateStats4();
            }
        }, 500);
        
        // Wait for NewsApiScheduler to be available
        if (typeof window.NewsApiScheduler !== 'undefined') {
            console.log('NewsApiScheduler is available, proceeding with data loading');
            loadData4();
        } else {
            console.log('Waiting for NewsApiScheduler to load...');
            // Wait for NewsApiScheduler to be available
            const checkScheduler = setInterval(() => {
                if (typeof window.NewsApiScheduler !== 'undefined') {
                    console.log('NewsApiScheduler now available, proceeding with data loading');
                    clearInterval(checkScheduler);
                    loadData4();
                }
            }, 100); // Check every 100ms
            
            // Timeout after 10 seconds
            setTimeout(() => {
                if (typeof window.NewsApiScheduler === 'undefined') {
                    console.error('NewsApiScheduler failed to load after 10 seconds');
                    clearInterval(checkScheduler);
                    
                    // Show error message
                    d3.select('#stats-panel4').html(`
                        <h3 style="color: #e74c3c;">Error loading NewsApiScheduler</h3>
                        <p>The news API scheduler failed to load. Please refresh the page.</p>
                        <div style="margin-top: 10px;">
                            <button onclick="window.location.reload()" style="background: #0F69FF; color: #fff; border: none; padding: 9px 16px; border-radius: 10px; cursor: pointer; font-weight: 600;">
                                Refresh Page
                            </button>
                        </div>
                    `);
                }
            }, 10000);
        }
    };
    
    // Initialize on page load
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM loaded, initializing news visualization');
        initialize4();
    });

})();
