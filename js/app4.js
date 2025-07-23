// Network Graph Visualization using D3.js Hierarchical Edge Bundling
// Displays Singapore news articles with category-based coloring and interactive features

(function() {
    // Initialize app container with dark space theme
    const app4 = d3.select("#container4")
        .html("")
        .style("position", "relative")
        .style("padding", "0")
        .style("background", "radial-gradient(ellipse at center, #1a1a2e 0%, #0f0f23 50%, #000000 100%)")
        .style("min-height", "100vh")
        .style("overflow", "hidden")
        .append("div")
        .style("position", "relative")
        .style("margin", "0 auto")
        .style("padding", "20px")
        .style("width", "100%")
        .style("max-width", "1400px")
        .style("background", "transparent");

    // Title with elegant styling
    const titleContainer = app4.append("div")
        .style("text-align", "center")
        .style("margin-bottom", "30px")
        .style("position", "relative");

    titleContainer.append("h1")
        .style("color", "#ffffff")
        .style("font-size", "2.5rem")
        .style("font-weight", "300")
        .style("margin", "0")
        .style("text-shadow", "0 0 20px rgba(255,255,255,0.3)")
        .style("letter-spacing", "2px")
        .text("Singapore News Network");

    titleContainer.append("p")
        .style("color", "#8892b0")
        .style("font-size", "1.1rem")
        .style("margin", "10px 0 0 0")
        .style("font-weight", "300")
        .text("Interactive visualization of news article relationships");

    // Particle background canvas
    const particleCanvas = app4.append("canvas")
        .attr("id", "particle-canvas")
        .style("position", "absolute")
        .style("top", "0")
        .style("left", "0")
        .style("width", "100%")
        .style("height", "100%")
        .style("pointer-events", "none")
        .style("z-index", "1");

    // Controls container with glass morphism effect
    const controlsContainer4 = app4.append("div")
        .style("position", "relative")
        .style("z-index", "10")
        .style("margin-bottom", "20px")
        .style("padding", "20px")
        .style("background", "rgba(26, 26, 46, 0.8)")
        .style("border", "1px solid rgba(255, 255, 255, 0.1)")
        .style("border-radius", "15px")
        .style("backdrop-filter", "blur(10px)")
        .style("box-shadow", "0 8px 32px rgba(0, 0, 0, 0.3)")
        .style("display", "flex")
        .style("flex-wrap", "wrap")
        .style("gap", "15px")
        .style("align-items", "center");

    // Layout control buttons (only hierarchical bundling)
    const layoutControls4 = controlsContainer4.append("div")
        .style("display", "flex")
        .style("gap", "10px")
        .style("align-items", "center")
        .style("margin-right", "30px");

    layoutControls4.append("label")
        .style("color", "#64ffda")
        .style("font-size", "0.95rem")
        .style("font-weight", "500")
        .style("margin-right", "12px")
        .style("text-shadow", "0 0 10px rgba(100, 255, 218, 0.3)")
        .text("Layout:");

    layoutControls4.append("div")
        .style("padding", "8px 16px")
        .style("border-radius", "25px")
        .style("border", "1px solid #64ffda")
        .style("background", "rgba(100, 255, 218, 0.2)")
        .style("color", "#64ffda")
        .style("font-size", "0.85rem")
        .style("font-weight", "500")
        .style("backdrop-filter", "blur(5px)")
        .style("text-shadow", "0 0 10px rgba(100, 255, 218, 0.2)")
        .style("box-shadow", "0 0 20px rgba(100, 255, 218, 0.4)")
        .html("🧬 Hierarchical Bundling");

    // Filter controls with modern styling
    const filterControls4 = controlsContainer4.append("div")
        .style("display", "flex")
        .style("gap", "15px")
        .style("align-items", "center")
        .style("flex-wrap", "wrap");

    // Category filter
    const categoryGroup = filterControls4.append("div")
        .style("display", "flex")
        .style("align-items", "center")
        .style("gap", "8px");

    categoryGroup.append("label")
        .style("color", "#64ffda")
        .style("font-size", "0.9rem")
        .style("font-weight", "500")
        .text("Category:");

    const categorySelect4 = categoryGroup.append("select")
        .attr("id", "category-filter4")
        .style("padding", "8px 12px")
        .style("border-radius", "20px")
        .style("border", "1px solid rgba(100, 255, 218, 0.3)")
        .style("background", "rgba(26, 26, 46, 0.9)")
        .style("color", "#64ffda")
        .style("font-size", "0.85rem")
        .style("cursor", "pointer")
        .style("backdrop-filter", "blur(5px)")
        .style("transition", "all 0.3s ease");

    // Sentiment filter
    const sentimentGroup = filterControls4.append("div")
        .style("display", "flex")
        .style("align-items", "center")
        .style("gap", "8px");

    sentimentGroup.append("label")
        .style("color", "#64ffda")
        .style("font-size", "0.9rem")
        .style("font-weight", "500")
        .text("Sentiment:");

    const sentimentSelect4 = sentimentGroup.append("select")
        .attr("id", "sentiment-filter4")
        .style("padding", "8px 12px")
        .style("border-radius", "20px")
        .style("border", "1px solid rgba(100, 255, 218, 0.3)")
        .style("background", "rgba(26, 26, 46, 0.9)")
        .style("color", "#64ffda")
        .style("font-size", "0.85rem")
        .style("cursor", "pointer")
        .style("backdrop-filter", "blur(5px)")
        .style("transition", "all 0.3s ease");

    // Search box
    const searchGroup = filterControls4.append("div")
        .style("display", "flex")
        .style("align-items", "center")
        .style("gap", "8px");

    searchGroup.append("label")
        .style("color", "#64ffda")
        .style("font-size", "0.9rem")
        .style("font-weight", "500")
        .text("Search:");

    searchGroup.append("input")
        .attr("type", "text")
        .attr("id", "search-input4")
        .attr("placeholder", "Search articles...")
        .style("padding", "8px 15px")
        .style("border-radius", "20px")
        .style("border", "1px solid rgba(100, 255, 218, 0.3)")
        .style("background", "rgba(26, 26, 46, 0.9)")
        .style("color", "#64ffda")
        .style("font-size", "0.85rem")
        .style("width", "200px")
        .style("backdrop-filter", "blur(5px)")
        .style("transition", "all 0.3s ease")
        .style("outline", "none")
        .on("focus", function() {
            d3.select(this)
                .style("border-color", "#64ffda")
                .style("box-shadow", "0 0 20px rgba(100, 255, 218, 0.3)");
        })
        .on("blur", function() {
            d3.select(this)
                .style("border-color", "rgba(100, 255, 218, 0.3)")
                .style("box-shadow", "none");
        });

    // Graph container with space-like styling
    const graphContainer4 = app4.append("div")
        .attr("id", "network-graph4")
        .style("height", "700px")
        .style("position", "relative")
        .style("z-index", "5")
        .style("border-radius", "20px")
        .style("background", "radial-gradient(circle at center, rgba(26, 26, 46, 0.3) 0%, rgba(15, 15, 35, 0.5) 50%, rgba(0, 0, 0, 0.8) 100%)")
        .style("border", "1px solid rgba(100, 255, 218, 0.2)")
        .style("box-shadow", "inset 0 0 50px rgba(0, 0, 0, 0.5), 0 0 50px rgba(100, 255, 218, 0.1)")
        .style("overflow", "hidden")
        .on("click", function() {
            console.log('=== GRAPH CONTAINER CLICKED ===');
        });

    // Info panel with glass morphism
    const infoPanel4 = app4.append("div")
        .attr("id", "info-panel4")
        .style("position", "relative")
        .style("z-index", "10")
        .style("margin-top", "20px")
        .style("padding", "25px")
        .style("background", "rgba(26, 26, 46, 0.8)")
        .style("border", "1px solid rgba(100, 255, 218, 0.2)")
        .style("border-radius", "15px")
        .style("backdrop-filter", "blur(10px)")
        .style("box-shadow", "0 8px 32px rgba(0, 0, 0, 0.3)")
        .style("color", "#ffffff")
        .style("font-size", "0.95rem")
        .style("display", "none");

    // Statistics panel with modern design
    const statsPanel4 = app4.append("div")
        .attr("id", "stats-panel4")
        .style("position", "relative")
        .style("z-index", "10")
        .style("margin-top", "20px")
        .style("padding", "25px")
        .style("background", "rgba(26, 26, 46, 0.8)")
        .style("border", "1px solid rgba(100, 255, 218, 0.2)")
        .style("border-radius", "15px")
        .style("backdrop-filter", "blur(10px)")
        .style("box-shadow", "0 8px 32px rgba(0, 0, 0, 0.3)")
        .style("color", "#ffffff")
        .style("font-size", "0.95rem");

    // Global variables
    let newsData4 = [], filteredData4 = [];
    let categories4 = new Set();
    let currentFilter4 = { category: 'all', sentiment: 'all', search: '' };

    // Color schemes
    const categoryColors4 = {
        'politics': '#ff6b6b',      
        'business': '#ecc542ff',     
        'sports': '#16afd1ff',       
        'technology': '#96ceb4',   
        'health': '#ffeaa7',      
        'entertainment': '#fd79a8', 
        'science': '#a29bfe',   
        'world': '#fd79a8',      
        'opinion': '#74b9ff',    
        'general': '#cfcfcfff',    
        'default': '#00d6a1ff'  
    };

    const sentimentColors4 = {
        'positive': '#00ff88',   
        'negative': '#ff4757', 
        'neutral': '#b9b9b9ff'      
    };

    // Particle system for background animation
    const initParticleSystem = () => {
        const canvas = document.getElementById('particle-canvas');
        const ctx = canvas.getContext('2d');
        
        const resizeCanvas = () => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        };
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        
        const particles = [];
        const maxParticles = 100;
        
        // Create particles
        for (let i = 0; i < maxParticles; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                size: Math.random() * 2 + 0.5,
                opacity: Math.random() * 0.5 + 0.2,
                twinkle: Math.random() * 0.02 + 0.01
            });
        }
        
        const animate = () => {
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
                if (particle.opacity > 0.8 || particle.opacity < 0.1) {
                    particle.twinkle *= -1;
                }
                
                // Draw particle
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(100, 255, 218, ${particle.opacity})`;
                ctx.fill();
                
                // Add glow effect
                ctx.shadowColor = '#64ffda';
                ctx.shadowBlur = 10;
                ctx.fill();
                ctx.shadowBlur = 0;
            });
            
            requestAnimationFrame(animate);
        };
        
        animate();
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
                
                // Clean category
                if (article.category && article.category.trim()) {
                    item.category = article.category.toLowerCase().trim();
                } else {
                    item.category = 'general';
                }
                categories4.add(item.category);
                
                data.push(item);
                
            } catch (error) {
                console.warn(`Error parsing article ${i}:`, error);
                continue;
            }
        }
        
        console.log(`Successfully parsed ${data.length} articles`);
        console.log('Categories found:', Array.from(categories4));
        return data;
    };

    // Create network from news data
    const createNetworkFromData4 = (data) => {
        if (!data || data.length === 0) {
            console.error('No data available to create network');
            d3.select('#network-graph4').html('<div style="text-align: center; color: #64ffda; padding: 50px;">No data available</div>');
            updateStats4();
            return;
        }
        
        console.log(`Creating hierarchical network from ${data.length} articles`);
        
        // Directly apply hierarchical edge bundling
        applyHierarchicalEdgeBundlingToData4(data);
        
        // Initialize layout button states
        setTimeout(() => {
            // Set hierarchical bundling button as active by default
            d3.select(`#layout-heb`)
                .style("background", "rgba(100, 255, 218, 0.2)")
                .style("border-color", "#64ffda")
                .style("box-shadow", "0 0 20px rgba(100, 255, 218, 0.4)");
        }, 100);

        // Update statistics
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
        
        // Prepare hierarchical data and links
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
        
        // Use your existing edge logic to create links
        for (let i = 0; i < Math.min(newsData4.length, 50); i++) { // Limit for performance
            for (let j = i + 1; j < Math.min(newsData4.length, 50); j++) {
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
            hebFunction('#network-graph4', nodes, links, newsData4);
            console.log('hierarchicalEdgeBundling called successfully');
        } catch (error) {
            console.error('Error calling hierarchicalEdgeBundling:', error);
        }
    };
    
    // Clustered layout by sentiment with smooth transitions
    
    // Filter network based on current filters
    const filterNetwork4 = () => {
        console.log('=== FILTER NETWORK CALLED ===');
        console.log('Current filters:', currentFilter4);
        
        // Filter the data based on current filters
        const filteredArticles = newsData4.filter(article => {
            let include = true;
            
            // Category filter
            if (currentFilter4.category !== 'all' && article.category !== currentFilter4.category) {
                include = false;
            }
            
            // Sentiment filter
            const sentiment = article.sentiment > 0.1 ? 'positive' : 
                             article.sentiment < -0.1 ? 'negative' : 'neutral';
            if (currentFilter4.sentiment !== 'all' && sentiment !== currentFilter4.sentiment) {
                include = false;
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
        
        console.log(`Filtered ${filteredArticles.length} articles from ${newsData4.length} total`);
        
        // Apply hierarchical bundling to filtered data
        filteredData4 = filteredArticles;
        applyHierarchicalEdgeBundlingToData4(filteredArticles);
    };
    
    // Apply hierarchical edge bundling to specific dataset
    const applyHierarchicalEdgeBundlingToData4 = (data) => {
        console.log('=== APPLYING HIERARCHICAL EDGE BUNDLING TO DATA ===');
        console.log('Data length:', data.length);
        
        // Check if we have data
        if (!data || data.length === 0) {
            console.error('No data available for hierarchical bundling');
            d3.select('#network-graph4').html('<div style="text-align: center; color: #64ffda; padding: 50px;">No articles match the current filters</div>');
            return;
        }
        
        // Check if function is available (try both variants)
        const hebFunction = window.hierarchicalEdgeBundling || hierarchicalEdgeBundling;
        if (typeof hebFunction !== 'function') {
            console.error('hierarchicalEdgeBundling function not available');
            return;
        }
        
        // Prepare hierarchical data and links
        const nodes = [];
        const links = [];
        const categoryMap = {};
        
        // Add root node
        nodes.push({ id: 'root', parent: '', label: 'News Network' });
        
        // Add category nodes and article nodes
        data.forEach((d, i) => {
            if (!categoryMap[d.category]) {
                nodes.push({ id: d.category, parent: 'root', label: d.category });
                categoryMap[d.category] = true;
            }
            nodes.push({ id: d.id, parent: d.category, label: d.title });
        });
        
        console.log('Created nodes:', nodes.length);
        
        // Use existing edge logic to create links
        for (let i = 0; i < Math.min(data.length, 50); i++) { // Limit for performance
            for (let j = i + 1; j < Math.min(data.length, 50); j++) {
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
                    links.push({ source: node1.id, target: node2.id });
                }
            }
        }
        
        console.log('Created links:', links.length);
        
        // Apply D3 hierarchical edge bundling
        try {
            hebFunction('#network-graph4', nodes, links, data);
            console.log('hierarchicalEdgeBundling applied successfully to filtered data');
        } catch (error) {
            console.error('Error applying hierarchicalEdgeBundling to filtered data:', error);
        }
    };

    // Show node information with elegant styling
    const showNodeInfo4 = (nodeData) => {
        const panel = d3.select('#info-panel4');
        panel.style('display', 'block');
        
        panel.html(`
            <h3 style="margin-top: 0; color: #64ffda; text-shadow: 0 0 10px rgba(100, 255, 218, 0.3); font-weight: 300; font-size: 1.3rem;">${nodeData.title}</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
                <div style="padding: 15px; background: rgba(100, 255, 218, 0.05); border-radius: 10px; border: 1px solid rgba(100, 255, 218, 0.2);">
                    <div style="color: #64ffda; font-weight: 500; margin-bottom: 8px;">Article Details</div>
                    <div style="color: #ffffff; line-height: 1.6;">
                        <strong>Category:</strong> <span style="color: ${nodeData.color};">${nodeData.category}</span><br>
                        <strong>Sentiment:</strong> <span style="color: ${sentimentColors4[nodeData.sentiment]};">${nodeData.sentiment}</span> (${nodeData.sentimentScore ? nodeData.sentimentScore.toFixed(3) : 'N/A'})<br>
                        <strong>Author:</strong> <span style="color: #64ffda;">${nodeData.author || 'Unknown'}</span><br>
                        <strong>Date:</strong> <span style="color: #64ffda;">${nodeData.publish_date || 'N/A'}</span>
                    </div>
                </div>
                <div style="padding: 15px; background: rgba(100, 255, 218, 0.05); border-radius: 10px; border: 1px solid rgba(100, 255, 218, 0.2);">
                    <div style="color: #64ffda; font-weight: 500; margin-bottom: 8px;">Text Preview</div>
                    <div style="max-height: 120px; overflow-y: auto; padding: 10px; background: rgba(0, 0, 0, 0.3); border-radius: 8px; color: #ffffff; font-size: 0.9rem; line-height: 1.5;">
                        ${(nodeData.text || '').substring(0, 400)}${(nodeData.text || '').length > 400 ? '...' : ''}
                    </div>
                </div>
            </div>
            ${nodeData.url ? `
                <div style="text-align: center; margin-top: 20px;">
                    <a href="${nodeData.url}" target="_blank" style="
                        display: inline-block;
                        padding: 10px 20px;
                        background: rgba(100, 255, 218, 0.2);
                        color: #64ffda;
                        text-decoration: none;
                        border-radius: 25px;
                        border: 1px solid rgba(100, 255, 218, 0.5);
                        transition: all 0.3s ease;
                        font-weight: 500;
                    " onmouseover="this.style.background='rgba(100, 255, 218, 0.3)'; this.style.boxShadow='0 0 20px rgba(100, 255, 218, 0.4)';" 
                       onmouseout="this.style.background='rgba(100, 255, 218, 0.2)'; this.style.boxShadow='none';">
                        🔗 Read Full Article
                    </a>
                </div>
            ` : ''}
        `);
    };

    // Hide node information
    const hideNodeInfo4 = () => {
        d3.select('#info-panel4').style('display', 'none');
    };

    // Update statistics
    const updateStats4 = () => {
        // Use the current filtered data or all news data
        const currentData = filteredData4.length > 0 ? filteredData4 : newsData4;
        
        if (!currentData || currentData.length === 0) {
            d3.select('#stats-panel4').html(`
                <h3 style="margin-top: 0; color: #64ffda; text-shadow: 0 0 10px rgba(100, 255, 218, 0.3);">Network Statistics</h3>
                <div style="text-align: center; color: #ffffff; padding: 20px;">
                    No data available
                </div>
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
        
        // Calculate connection count (rough estimate based on our linking logic)
        let connectionCount = 0;
        const dataSize = Math.min(currentData.length, 50); // Same limit as in bundling function
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
        
        // Get data retrieval date from filename or current date
        const dataRetrievalDate = "July 23, 2025"; // Based on the filename news_sg_20250723_032253.json
        
        // Calculate total for percentage calculations
        const totalArticles = currentData.length;
        
        const statsHtml = `
            <h3 style="margin-top: 0; color: #64ffda; text-shadow: 0 0 10px rgba(100, 255, 218, 0.3);">Network Statistics</h3>
            <div style="margin-bottom: 20px; padding: 12px; background: rgba(100, 255, 218, 0.1); border-radius: 8px; border: 1px solid rgba(100, 255, 218, 0.3);">
                <div style="color: #64ffda; font-weight: 500; font-size: 0.9rem;">📅 Data Retrieved: ${dataRetrievalDate} - ${filteredData4.length > 0 ? `Showing ${currentData.length} filtered articles from ${newsData4.length} total` : `Showing all ${currentData.length} articles`}</div>
                <div style="color: #8892b0; font-size: 0.8rem; margin-top: 2px;">🔄 News data is automatically updated daily at 6:00 AM Singapore Time</div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 20px;">
                <div style="padding: 15px; background: rgba(100, 255, 218, 0.05); border-radius: 10px; border: 1px solid rgba(100, 255, 218, 0.2);">
                    <div style="font-size: 1.1rem; color: #64ffda; margin-bottom: 10px; font-weight: 500;">Network Overview</div>
                    <div style="color: #ffffff;"><strong>Articles:</strong> <span style="color: #64ffda;">${currentData.length}</span></div>
                    <div style="color: #ffffff;"><strong>Connections:</strong> <span style="color: #64ffda;">${connectionCount}</span></div>
                    <div style="color: #ffffff;"><strong>Categories:</strong> <span style="color: #64ffda;">${Object.keys(categoryCount).length}</span></div>
                    <div style="margin-top: 8px; padding: 8px; background: rgba(0, 0, 0, 0.2); border-radius: 6px; font-size: 0.8rem; color: #8892b0; line-height: 1.4;">
                        💡 <strong style="color: #64ffda;">Connections</strong> represent relationships between articles based on:<br>
                        • Same category (+0.6 weight)<br>
                        • Similar sentiment scores (+0.4 weight)<br>
                        • Shared keywords in titles (+0.3 per word)<br>
                        Only pairs with total weight >0.7 become connections.
                    </div>
                </div>
                <div style="padding: 15px; background: rgba(100, 255, 218, 0.05); border-radius: 10px; border: 1px solid rgba(100, 255, 218, 0.2);">
                    <div style="font-size: 1.1rem; color: #64ffda; margin-bottom: 10px; font-weight: 500;">Sentiment Distribution</div>
                    <div style="color: #ffffff;"><span style="color: ${sentimentColors4.positive};">● Positive:</span> <span style="color: #64ffda;">${sentimentCount.positive}</span> <span style="color: #8892b0; font-size: 0.85rem;">(${((sentimentCount.positive / totalArticles) * 100).toFixed(1)}%)</span></div>
                    <div style="color: #ffffff;"><span style="color: ${sentimentColors4.negative};">● Negative:</span> <span style="color: #64ffda;">${sentimentCount.negative}</span> <span style="color: #8892b0; font-size: 0.85rem;">(${((sentimentCount.negative / totalArticles) * 100).toFixed(1)}%)</span></div>
                    <div style="color: #ffffff;"><span style="color: ${sentimentColors4.neutral};">● Neutral:</span> <span style="color: #64ffda;">${sentimentCount.neutral}</span> <span style="color: #8892b0; font-size: 0.85rem;">(${((sentimentCount.neutral / totalArticles) * 100).toFixed(1)}%)</span></div>
                    <div style="margin-top: 8px; padding: 8px; background: rgba(0, 0, 0, 0.2); border-radius: 6px; font-size: 0.8rem; color: #8892b0; line-height: 1.4;">
                        📊 <strong style="color: #64ffda;">Sentiment Scores</strong> are calculated using NLP analysis:<br>
                        • <span style="color: ${sentimentColors4.positive};">Positive</span>: Score > 0.1 (optimistic, favorable content)<br>
                        • <span style="color: ${sentimentColors4.negative};">Negative</span>: Score < -0.1 (critical, unfavorable content)<br>
                        • <span style="color: ${sentimentColors4.neutral};">Neutral</span>: Score -0.1 to 0.1 (balanced, factual reporting)<br>
                        Range: -1.0 (most negative) to +1.0 (most positive)
                    </div>
                </div>
            </div>
            ${Object.keys(categoryCount).length > 0 ? `
                <div style="margin-top: 20px; padding: 15px; background: rgba(100, 255, 218, 0.05); border-radius: 10px; border: 1px solid rgba(100, 255, 218, 0.2);">
                    <div style="font-size: 1.1rem; color: #64ffda; margin-bottom: 10px; font-weight: 500;">Category Distribution</div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px;">
                        ${Object.entries(categoryCount)
                            .sort((a, b) => b[1] - a[1]) // Sort by count descending
                            .map(([category, count]) => {
                                const percentage = ((count / totalArticles) * 100).toFixed(1);
                                return `<div style="color: #ffffff; font-size: 0.9rem; display: flex; justify-content: space-between; align-items: center; padding: 4px 8px; background: rgba(0, 0, 0, 0.2); border-radius: 6px;">
                                    <span>
                                        <span style="color: ${categoryColors4[category] || categoryColors4.default};">●</span> 
                                        ${category.charAt(0).toUpperCase() + category.slice(1)}
                                    </span>
                                    <span style="color: #64ffda; font-weight: 500;">
                                        ${count} <span style="color: #8892b0; font-size: 0.8rem;">(${percentage}%)</span>
                                    </span>
                                </div>`;
                            }).join('')}
                    </div>
                    <div style="margin-top: 12px; padding: 8px; background: rgba(0, 0, 0, 0.2); border-radius: 6px; font-size: 0.85rem; color: #8892b0;">
                        📊 Percentages based on ${filteredData4.length > 0 ? 'filtered' : 'total'} articles for this analysis
                    </div>
                </div>
            ` : ''}
        `;
        
        d3.select('#stats-panel4').html(statsHtml);
    };

    // Initialize filters
    const initializeFilters4 = () => {
        console.log('=== INITIALIZING FILTERS ===');
        console.log('Categories available:', Array.from(categories4));
        
        // Populate category filter
        const categoryOptions = ['all', ...Array.from(categories4).sort()];
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

        // Add event listeners
        categorySelect4.on('change', function() {
            console.log('Category filter changed to:', this.value);
            currentFilter4.category = this.value;
            filterNetwork4();
        });

        sentimentSelect4.on('change', function() {
            console.log('Sentiment filter changed to:', this.value);
            currentFilter4.sentiment = this.value;
            filterNetwork4();
        });

        d3.select('#search-input4').on('input', function() {
            console.log('Search filter changed to:', this.value);
            currentFilter4.search = this.value;
            filterNetwork4();
        });
        
        console.log('Filter event listeners attached');
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
            const response = await fetch('data/news_sg_20250723_032253.json');
            const jsonData = await response.json();
            
            newsData4 = parseJSONData4(jsonData);
            console.log(`Loaded ${newsData4.length} news articles`);
            console.log('Categories found:', Array.from(categories4));
            
            // Take a sample for better performance if dataset is too large
            if (newsData4.length > 500) {
                newsData4 = newsData4.slice(0, 500);
                console.log(`Using sample of ${newsData4.length} articles for better performance`);
            }
            
            initializeFilters4();
            createNetworkFromData4(newsData4);
            
        } catch (error) {
            console.error('Error loading data:', error);
            d3.select('#stats-panel4').html(`
                <h3 style="color: #e74c3c;">Error loading data</h3>
                <p>Could not load the news data file. Please check that the file exists and is accessible.</p>
            `);
        }
    };

    // Simple initialization for D3 hierarchical bundling
    const initialize4 = () => {
        console.log('Initializing news visualization with D3.js hierarchical edge bundling');
        setupControls4();
        loadData4();
    };
    
    // Initialize on page load
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM loaded, initializing news visualization');
        initialize4();
    });

})();
