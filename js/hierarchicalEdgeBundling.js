// D3 Hierarchical Edge Bundling Visualization
// This script creates a hierarchical edge bundling visualization using D3.js
// It expects a hierarchical structure and a list of links between leaf nodes

// Usage: hierarchicalEdgeBundling('#network-graph4', nodes, links)

// Category color scheme matching app4.js
const categoryColors = {
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

// Make sure the function is globally available
window.hierarchicalEdgeBundling = function(containerSelector, nodes, links, originalData = null) {
    console.log('=== HIERARCHICAL EDGE BUNDLING FUNCTION CALLED ===');
    console.log('Container:', containerSelector);
    console.log('Nodes:', nodes ? nodes.length : 'undefined');
    console.log('Links:', links ? links.length : 'undefined');
    console.log('Original data:', originalData ? originalData.length : 'not provided');
    
    // Validate inputs
    if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
        console.error('Invalid or empty nodes array');
        return;
    }
    
    if (!links || !Array.isArray(links)) {
        console.error('Invalid links array');
        links = []; // Continue with empty links if needed
    }
    
    // Check if D3 is available
    if (typeof d3 === 'undefined') {
        console.error('D3.js not available');
        return;
    }
    
    // Remove any previous SVG and clear the container
    const container = d3.select(containerSelector);
    if (container.empty()) {
        console.error('Container not found:', containerSelector);
        return;
    }
    
    container.selectAll('*').remove(); // Clear everything including sigma canvas

    // Create article lookup map from original data if provided
    const articleLookup = new Map();
    if (originalData && Array.isArray(originalData)) {
        originalData.forEach(article => {
            if (article.id) {
                articleLookup.set(article.id, article);
                // Also store as string in case of type mismatch
                articleLookup.set(String(article.id), article);
            }
        });
        console.log('Created article lookup with', articleLookup.size, 'entries');
        console.log('Sample article IDs:', originalData.slice(0, 5).map(a => ({ id: a.id, type: typeof a.id })));
    }

    // Get container dimensions to match app4 layout
    const containerNode = container.node();
    const width = containerNode ? containerNode.offsetWidth || 1400 : 1400; // Match app4 max-width
    const height = 700; // Match app4 graph container height
    const radius = Math.min(width, height) / 2 - 50; // Ensure it fits with some padding

    // Create SVG with zoom and pan functionality
    const svg = container
        .append('svg')
        .attr('width', '100%')
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('background', 'transparent')
        .style('cursor', 'grab');

    // Create zoom behavior
    const zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => {
            // Apply transform to the main group, preserving the center translation
            g.attr('transform', `translate(${width/2},${height/2}) ${event.transform}`);
        });

    // Apply zoom behavior to SVG with mouse-centered zooming
    svg.call(zoom)
        .on('wheel.zoom', function(event) {
            event.preventDefault();
            
            // Get mouse position relative to the SVG
            const [mouseX, mouseY] = d3.pointer(event, this);
            
            // Calculate zoom factor based on wheel delta
            const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
            
            // Get current transform
            const currentTransform = d3.zoomTransform(this);
            
            // Calculate the zoom center relative to the transformed coordinate system
            const zoomCenterX = (mouseX - width/2 - currentTransform.x) / currentTransform.k;
            const zoomCenterY = (mouseY - height/2 - currentTransform.y) / currentTransform.k;
            
            // Calculate new scale
            const newScale = Math.max(0.1, Math.min(4, currentTransform.k * zoomFactor));
            
            // Calculate new translation to keep the mouse position fixed
            const newX = mouseX - width/2 - zoomCenterX * newScale;
            const newY = mouseY - height/2 - zoomCenterY * newScale;
            
            // Create new transform
            const newTransform = d3.zoomIdentity
                .translate(newX, newY)
                .scale(newScale);
            
            // Apply the transform smoothly
            svg.transition()
                .duration(100)
                .call(zoom.transform, newTransform);
        });

    // Create main group for all elements that will be transformed
    const g = svg.append('g')
        .attr('transform', `translate(${width/2},${height/2})`);

    // Add zoom controls
    const controls = container
        .append('div')
        .style('position', 'absolute')
        .style('top', '10px')
        .style('right', '10px')
        .style('z-index', '1000')
        .style('display', 'flex')
        .style('flex-direction', 'column')
        .style('gap', '5px');

    // Zoom in button
    controls.append('button')
        .style('padding', '8px 12px')
        .style('background', 'rgba(100, 255, 218, 0.2)')
        .style('border', '1px solid rgba(100, 255, 218, 0.5)')
        .style('border-radius', '4px')
        .style('color', '#64ffda')
        .style('cursor', 'pointer')
        .style('font-size', '14px')
        .text('🔍+')
        .on('click', () => {
            svg.transition().duration(300).call(
                zoom.scaleBy, 1.5
            );
        });

    // Zoom out button
    controls.append('button')
        .style('padding', '8px 12px')
        .style('background', 'rgba(100, 255, 218, 0.2)')
        .style('border', '1px solid rgba(100, 255, 218, 0.5)')
        .style('border-radius', '4px')
        .style('color', '#64ffda')
        .style('cursor', 'pointer')
        .style('font-size', '14px')
        .text('🔍−')
        .on('click', () => {
            svg.transition().duration(300).call(
                zoom.scaleBy, 0.67
            );
        });

    // Reset zoom button
    controls.append('button')
        .style('padding', '8px 12px')
        .style('background', 'rgba(100, 255, 218, 0.2)')
        .style('border', '1px solid rgba(100, 255, 218, 0.5)')
        .style('border-radius', '4px')
        .style('color', '#64ffda')
        .style('cursor', 'pointer')
        .style('font-size', '14px')
        .text('🎯')
        .on('click', () => {
            // Reset to center and scale 1 (identity transform since g is already centered)
            svg.transition().duration(500).call(
                zoom.transform,
                d3.zoomIdentity
            );
        });

    // Update cursor style during drag
    svg.on('mousedown', () => svg.style('cursor', 'grabbing'))
        .on('mouseup', () => svg.style('cursor', 'grab'));

    // Convert flat nodes to hierarchy
    try {
        console.log('Converting to hierarchy...');
        const stratify = d3.stratify()
            .id(d => d.id)
            .parentId(d => d.parent);
        
        const root = stratify(nodes)
            .sort((a, b) => (a.height - b.height) || a.id.localeCompare(b.id));
        
        console.log('Hierarchy created:', root);
        
        // Create cluster layout
        const cluster = d3.cluster()
            .size([360, radius - 80]); // Adjust for the new responsive radius
        cluster(root);
        
        // Map node id to node
        const nodeById = {};
        root.descendants().forEach(d => { nodeById[d.id] = d; });
        
        console.log('Nodes mapped:', Object.keys(nodeById).length);
        
        // Only create edges for nodes that exist in our hierarchy
        const validLinks = links.filter(link => {
            const sourceExists = nodeById[link.source];
            const targetExists = nodeById[link.target];
            if (!sourceExists) console.warn('Source node not found:', link.source);
            if (!targetExists) console.warn('Target node not found:', link.target);
            return sourceExists && targetExists;
        });
        
        console.log('Valid links:', validLinks.length, 'out of', links.length);

        // Create gradient definitions for cross-category connections
        const defs = svg.append('defs');
        
        // Add glow filter for highlighted edges
        const glowFilter = defs.append('filter')
            .attr('id', 'glow')
            .attr('x', '-50%')
            .attr('y', '-50%')
            .attr('width', '200%')
            .attr('height', '200%');
        
        glowFilter.append('feGaussianBlur')
            .attr('stdDeviation', '2')
            .attr('result', 'coloredBlur');
        
        const feMerge = glowFilter.append('feMerge');
        feMerge.append('feMergeNode').attr('in', 'coloredBlur');
        feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
        
        // Helper function to get category color
        const getCategoryColor = (nodeId) => {
            const node = nodeById[nodeId];
            if (!node) return categoryColors['default'];
            const category = node.parent ? node.parent.id : 'general';
            return categoryColors[category] || categoryColors['default'];
        };
        
        // Helper function to create or get gradient ID
        const getGradientId = (sourceId, targetId) => {
            const sourceColor = getCategoryColor(sourceId);
            const targetColor = getCategoryColor(targetId);
            
            // If same category, return the color directly
            if (sourceColor === targetColor) {
                return sourceColor;
            }
            
            // Create a unique gradient ID based on the two colors
            const gradientId = `gradient-${sourceColor.replace('#', '')}-${targetColor.replace('#', '')}`;
            
            // Check if gradient already exists
            if (defs.select(`#${gradientId}`).empty()) {
                const gradient = defs.append('linearGradient')
                    .attr('id', gradientId)
                    .attr('x1', '0%')
                    .attr('y1', '0%')
                    .attr('x2', '100%')
                    .attr('y2', '0%');
                
                gradient.append('stop')
                    .attr('offset', '0%')
                    .attr('stop-color', sourceColor)
                    .attr('stop-opacity', 1);
                
                gradient.append('stop')
                    .attr('offset', '100%')
                    .attr('stop-color', targetColor)
                    .attr('stop-opacity', 1);
            }
            
            return `url(#${gradientId})`;
        };

        // Draw bundled edges
        let linkGroup = null;
        if (validLinks.length > 0) {
            const line = d3.lineRadial()
                .curve(d3.curveBundle.beta(0.85))
                .radius(d => d.y)
                .angle(d => d.x / 180 * Math.PI);

            linkGroup = g.append('g');
            const linkPaths = linkGroup.selectAll('path')
                .data(validLinks)
                .enter().append('path')
                .attr('d', d => {
                    try {
                        return line(nodeById[d.source].path(nodeById[d.target]));
                    } catch (e) {
                        console.warn('Error creating path for link:', d, e);
                        return null;
                    }
                })
                .attr('stroke', d => getGradientId(d.source, d.target))
                .attr('stroke-width', 0.8)
                .attr('fill', 'none')
                .attr('opacity', 0.5)
                .attr('class', 'edge-path');
        }

        // Draw nodes (only leaf nodes - the actual articles)
        const leafNodes = root.leaves();
        console.log('Drawing', leafNodes.length, 'leaf nodes');
        
        // Selection state
        let selectedNode = null;
        let selectedConnections = new Set();
        
        // Helper functions for selection
        const highlightNode = (nodeId) => {
            console.log('=== HIGHLIGHT NODE CALLED ===');
            console.log('Node ID:', nodeId, 'Type:', typeof nodeId);
            console.log('Valid links:', validLinks.length);
            
            selectedNode = String(nodeId); // Ensure string type
            selectedConnections.clear();
            
            // Add the selected node itself
            selectedConnections.add(String(nodeId));
            
            // Find only direct neighbors (not entire connected component)
            validLinks.forEach(link => {
                const sourceKey = String(link.source);
                const targetKey = String(link.target);
                
                // If this link involves the selected node, add the other node
                if (sourceKey === String(nodeId)) {
                    selectedConnections.add(targetKey);
                } else if (targetKey === String(nodeId)) {
                    selectedConnections.add(sourceKey);
                }
            });
            
            console.log(`Selected node ${nodeId}, found ${selectedConnections.size} connected nodes (direct neighbors only):`, Array.from(selectedConnections));
            
            // Update visual states
            updateNodeStates();
            updateEdgeStates();
        };
        
        const clearSelection = () => {
            selectedNode = null;
            selectedConnections.clear();
            updateNodeStates();
            updateEdgeStates();
        };
        
        const updateNodeStates = () => {
            console.log('=== UPDATE NODE STATES ===');
            console.log('Selected node:', selectedNode);
            console.log('Selected connections size:', selectedConnections.size);
            console.log('Selected connections:', Array.from(selectedConnections));
            
            nodeCircles.attr('opacity', d => {
                const nodeId = String(d.id || d.data.id);
                if (!selectedNode) return 1; // No selection, show all
                if (selectedConnections.has(nodeId)) return 1; // Connected node
                return 0.2; // Dimmed node
            })
            .attr('stroke-width', d => {
                const nodeId = String(d.id || d.data.id);
                return String(nodeId) === String(selectedNode) ? 1 : 1; // Highlight selected node with same width
            })
            .attr('stroke', d => {
                const nodeId = String(d.id || d.data.id);
                return String(nodeId) === String(selectedNode) ? '#64ffda' : '#fff'; // Different stroke for selected
            });
        };
        
        const updateEdgeStates = () => {
            if (validLinks.length > 0 && linkGroup) {
                linkGroup.selectAll('path').attr('opacity', d => {
                    if (!selectedNode) return 0.5; // No selection, normal opacity
                    // Highlight edge only if it directly connects to the selected node
                    if (String(d.source) === String(selectedNode) || String(d.target) === String(selectedNode)) {
                        return 0.8; // Highlighted edge
                    }
                    return 0.1; // Dimmed edge
                })
                .attr('stroke-width', d => {
                    if (!selectedNode) return 0.8; // No selection, normal width
                    // Thicker edge only if it directly connects to the selected node
                    if (String(d.source) === String(selectedNode) || String(d.target) === String(selectedNode)) {
                        return 0.9; // Thicker highlighted edge
                    }
                    return 0.5; // Thinner dimmed edge
                })
                .attr('stroke', d => {
                    // Always use the gradient color
                    return getGradientId(d.source, d.target);
                })
                .attr('filter', d => {
                    if (!selectedNode) return null; // No selection, no filter
                    // Add glow to highlighted edges
                    if (String(d.source) === String(selectedNode) || String(d.target) === String(selectedNode)) {
                        return 'url(#glow)'; // Add glow effect
                    }
                    return null; // No filter for dimmed edges
                });
            }
        };
        
        // Create tooltip div for hover information
        const tooltip = container
            .append('div')
            .style('position', 'absolute')
            .style('background', 'rgba(26, 26, 46, 0.95)')
            .style('border', '1px solid rgba(100, 255, 218, 0.5)')
            .style('border-radius', '8px')
            .style('padding', '10px')
            .style('color', '#ffffff')
            .style('font-size', '12px')
            .style('max-width', '400px')
            .style('min-width', '250px')
            .style('z-index', '2000')
            .style('pointer-events', 'auto')
            .style('opacity', 0)
            .style('backdrop-filter', 'blur(10px)')
            .style('box-shadow', '0 4px 20px rgba(0, 0, 0, 0.5)')
            .on('mouseenter', function() {
                // Keep tooltip visible when hovering over it
                d3.select(this).style('opacity', 1);
            })
            .on('mouseleave', function() {
                // Hide tooltip when leaving it
                d3.select(this).style('opacity', 0);
            });
        
        const nodeCircles = g.append('g').selectAll('circle')
            .data(leafNodes)
            .enter().append('circle')
            .attr('transform', d => `rotate(${d.x - 90}) translate(${d.y},0)`)
            .attr('r', 4)
            .attr('fill', d => {
                // Get category from the node's parent (which should be the category node)
                const category = d.parent ? d.parent.id : 'general';
                return categoryColors[category] || categoryColors['default'];
            })
            .attr('stroke', '#fff')
            .attr('stroke-width', 1)
            .style('cursor', 'pointer')
            .on('click', (event, d) => {
                console.log('=== NODE CLICK EVENT ===');
                console.log('Event:', event);
                console.log('Node data:', d);
                console.log('Node data.id:', d.id);
                console.log('Node data.data:', d.data);
                
                event.stopPropagation();
                const nodeId = String(d.id || d.data.id);
                console.log('Article node clicked:', d.data.label, 'ID:', nodeId);
                console.log('Current selectedNode:', selectedNode);
                
                // Toggle selection
                if (String(selectedNode) === String(nodeId)) {
                    console.log('Deselecting node');
                    clearSelection(); // Deselect if clicking the same node
                } else {
                    console.log('Selecting new node');
                    highlightNode(nodeId); // Select new node
                }
            })
            .on('mouseover', (event, d) => {
                // Get mouse position relative to the container
                const containerRect = container.node().getBoundingClientRect();
                const mouseX = event.clientX - containerRect.left;
                const mouseY = event.clientY - containerRect.top;
                
                // Get article data from lookup map or fallback to node data
                const nodeId = d.id || d.data.id;
                let article = articleLookup.get(nodeId);
                
                // Try different ID formats if not found
                if (!article && nodeId) {
                    article = articleLookup.get(String(nodeId)) || 
                             articleLookup.get(Number(nodeId)) ||
                             articleLookup.get(parseInt(nodeId));
                }
                
                // Debug logging
                console.log('Tooltip hover - Node ID:', nodeId, 'Type:', typeof nodeId);
                console.log('Article found in lookup:', !!article);
                if (article) {
                    console.log('Article URL:', article.url);
                    console.log('Article sentiment:', article.sentiment);
                } else {
                    console.log('Available lookup keys (first 5):', Array.from(articleLookup.keys()).slice(0, 5));
                    console.log('Node ID attempts:', [nodeId, String(nodeId), Number(nodeId), parseInt(nodeId)]);
                }
                
                const title = (article && article.title) || d.data.label || 'Untitled Article';
                const url = (article && article.url) || '';
                const sentiment = (article && article.sentiment !== undefined) ? article.sentiment.toFixed(3) : 'N/A';
                const category = d.parent ? d.parent.id : 'general';
                
                // Calculate tooltip position to avoid going off-screen
                const tooltipWidth = 400;
                const tooltipHeight = 120;
                let tooltipX = mouseX + 10;
                let tooltipY = mouseY - 10;
                
                // Adjust if tooltip would go off right edge
                if (tooltipX + tooltipWidth > containerRect.width) {
                    tooltipX = mouseX - tooltipWidth - 10;
                }
                
                // Adjust if tooltip would go off bottom edge
                if (tooltipY + tooltipHeight > containerRect.height) {
                    tooltipY = mouseY - tooltipHeight - 10;
                }
                
                // Ensure tooltip doesn't go off top or left edges
                tooltipX = Math.max(10, tooltipX);
                tooltipY = Math.max(10, tooltipY);
                
                tooltip
                    .style('left', tooltipX + 'px')
                    .style('top', tooltipY + 'px')
                    .style('opacity', 1)
                    .html(`
                        <div style="font-weight: bold; color: #64ffda; margin-bottom: 6px; word-wrap: break-word; white-space: normal; max-width: 350px; line-height: 1.3;">
                            ${title}
                        </div>
                        <div style="margin-bottom: 4px;">
                            <strong>Category:</strong> <span style="color: ${categoryColors[category] || categoryColors['default']};">${category}</span>
                        </div>
                        <div style="margin-bottom: 6px;">
                            <strong>Sentiment:</strong> ${sentiment}
                        </div>
                        ${url ? `
                            <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid rgba(100, 255, 218, 0.2);">
                                <a href="${url}" target="_blank" rel="noopener noreferrer" style="
                                    color: #64ffda; 
                                    text-decoration: none; 
                                    font-size: 10px; 
                                    word-wrap: break-word; 
                                    white-space: normal; 
                                    max-width: 350px;
                                    display: inline-block;
                                    border: 1px solid rgba(100, 255, 218, 0.3);
                                    padding: 4px 8px;
                                    border-radius: 4px;
                                    background: rgba(100, 255, 218, 0.1);
                                    transition: all 0.2s ease;
                                " onmouseover="this.style.background='rgba(100, 255, 218, 0.2)'; this.style.borderColor='#64ffda';" 
                                   onmouseout="this.style.background='rgba(100, 255, 218, 0.1)'; this.style.borderColor='rgba(100, 255, 218, 0.3)';">
                                    🔗 ${url.length > 60 ? url.substring(0, 60) + '...' : url}
                                </a>
                            </div>
                        ` : ''}
                    `);
            })
            .on('mouseout', (event, d) => {
                // Add a small delay before hiding to allow moving to tooltip
                setTimeout(() => {
                    // Only hide if mouse is not over the tooltip
                    if (!tooltip.node().matches(':hover')) {
                        tooltip.style('opacity', 0);
                    }
                }, 100);
            });
        
        // Add background click handler to clear selection
        svg.on('click', (event) => {
            console.log('=== SVG BACKGROUND CLICK ===');
            console.log('Event target:', event.target);
            console.log('SVG node:', svg.node());
            console.log('Are they the same?', event.target === svg.node());
            
            // Only clear selection if clicking on the background (not on nodes or other elements)
            if (event.target === svg.node()) {
                console.log('Clearing selection from background click');
                clearSelection();
            } else {
                console.log('Not clearing selection - clicked on element');
            }
        });
        
        console.log('Hierarchical edge bundling visualization complete');
        
    } catch (error) {
        console.error('Error creating hierarchical visualization:', error);
        
        // Fallback: show error message
        svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '0.31em')
            .attr('font-size', '16px')
            .attr('fill', '#ff6b6b')
            .text('Error creating visualization');
    }
    
    // Create fixed legend at bottom left (outside the transformable group)
    const legendData = Object.entries(categoryColors).filter(([key]) => key !== 'default');
    
    const legend = container
        .append('div')
        .style('position', 'absolute')
        .style('bottom', '20px')
        .style('left', '20px')
        .style('z-index', '1000')
        .style('background', 'rgba(26, 26, 46, 0.8)')
        .style('border', '1px solid rgba(100, 255, 218, 0.2)')
        .style('border-radius', '8px')
        .style('padding', '10px')
        .style('backdrop-filter', 'blur(10px)');
    
    legendData.forEach(([category, color]) => {
        const legendItem = legend
            .append('div')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('margin-bottom', '6px')
            .style('font-size', '11px')
            .style('color', '#ffffff');
        
        legendItem
            .append('div')
            .style('width', '10px')
            .style('height', '10px')
            .style('border-radius', '50%')
            .style('background-color', color)
            .style('border', '1px solid #fff')
            .style('margin-right', '8px')
            .style('flex-shrink', '0');
        
        legendItem
            .append('span')
            .text(category.charAt(0).toUpperCase() + category.slice(1));
    });
};

// Also make it available as a regular function for backward compatibility
function hierarchicalEdgeBundling(containerSelector, nodes, links) {
    return window.hierarchicalEdgeBundling(containerSelector, nodes, links);
}

console.log('=== HIERARCHICAL EDGE BUNDLING SCRIPT LOADED ===');
console.log('Function available globally:', typeof window.hierarchicalEdgeBundling);

// Example usage (replace with your data):
// hierarchicalEdgeBundling('#network-graph4', nodes, links);
