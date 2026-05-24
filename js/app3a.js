// Singapore Lamp Post Illumination Visualization
// Real-time visualization of LTA lamp posts with illumination radius

console.log('🔦 Initializing Singapore Lamp Post Illumination Visualization...');

// Wrap everything in an IIFE to avoid global conflicts
(function() {

// Configuration constants
const ILLUMINATION_CONFIG = {
  defaultRadius: 25, // meters - typical street lamp illumination radius
  powerLevels: {
    dim: { radius: 15, intensity: 0.3, color: '#ffa500' },      // Orange dim light
    normal: { radius: 25, intensity: 0.5, color: '#ffeb3b' },   // Yellow normal light
    bright: { radius: 35, intensity: 0.7, color: '#ffffff' }    // White bright light
  },
  maxDisplayLamps: 2000, // Limit for performance
  clusterDistance: 50,   // meters - minimum distance between displayed lamps
  animationDuration: 2000 // milliseconds
};

// Local scoped variables to avoid conflicts with app3
let lampPostMap3a;
let lampPostData3a = [];
let mapLayers3a = {
  lampPosts: null,
  illuminationCircles: null,
  darkOverlay: null
};
let statusDiv3a;
let app3a;
let selectedLampPost3a = null;

// Initialize the application
function initializeLampPostVisualization() {
  // Initialize app3a container (lamp post map)
  app3a = d3.select("#app3a")
    .html("")
    .classed("st-viz-card", true);

  // Status indicator
  statusDiv3a = app3a.append("div")
    .attr("id", "lamp-status")
    .attr("class", "st-badge")
    .text("Initialising lamp post data…");

  // Map container for lamp post map
  const mapContainer = app3a.append("div")
    .attr("id", "lamp-map")
    .attr("class", "st-viz-map");

  // Create lamp post map centered on Singapore
  lampPostMap3a = L.map('lamp-map', {
    minZoom: 11,
    maxZoom: 16,
    preferCanvas: true // Better performance for many points
  }).setView([1.3521, 103.8198], 11);

  // Dark tile layer for nighttime effect
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 16,
    minZoom: 11
  }).addTo(lampPostMap3a);

  // Add dark overlay for dramatic effect
  createDarkOverlay();

  // Initialize layer groups
  mapLayers3a.lampPosts = L.layerGroup().addTo(lampPostMap3a);
  mapLayers3a.illuminationCircles = L.layerGroup().addTo(lampPostMap3a);

  console.log('🗺️ Map initialized with dark theme');
}

// Create dark overlay effect
function createDarkOverlay() {
  // Create a dark overlay that covers areas without lamp illumination
  const singaporeBounds = [
    [1.16, 103.6], // Southwest
    [1.48, 104.0]  // Northeast
  ];
  
  mapLayers3a.darkOverlay = L.rectangle(singaporeBounds, {
    color: 'transparent',
    fillOpacity: 0.4,
    weight: 0,
    interactive: false
  }).addTo(lampPostMap3a);
  
  console.log('🌙 Dark overlay created');
}

// Load lamp post data from GeoJSON
async function loadLampPostData() {
  try {
    statusDiv3a.attr("class", "st-badge").text("Loading lamp post data from LTA…");
    
    const response = await fetch('data/LTALampPost.geojson');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const geoJsonData = await response.json();
    
    if (!geoJsonData.features || geoJsonData.features.length === 0) {
      throw new Error('No lamp post data found');
    }
    
    // Process and filter lamp post data
    lampPostData3a = geoJsonData.features
      .map(feature => {
        const coords = feature.geometry.coordinates;
        const props = feature.properties;
        
        // Extract lamp post number from description
        const lampPostNum = extractLampPostNumber(props.Description);
        
        return {
          id: props.Name || Math.random().toString(36),
          lampPostNumber: lampPostNum,
          latitude: coords[1],
          longitude: coords[0],
          uniqueId: extractFromDescription(props.Description, 'UNIQUE_ID'),
          lastUpdated: extractFromDescription(props.Description, 'FMEL_UPD_D'),
          // Simulate different power levels for visual variety
          powerLevel: Math.random() > 0.7 ? 'bright' : Math.random() > 0.3 ? 'normal' : 'dim'
        };
      })
      .filter(lamp => lamp.latitude && lamp.longitude)
      .filter((lamp, index) => {
        // Performance optimization: cluster nearby lamps
        if (index === 0) return true;
        return !lampPostData3a.slice(0, index).some(existingLamp => {
          const distance = calculateDistance(
            lamp.latitude, lamp.longitude,
            existingLamp.latitude, existingLamp.longitude
          );
          return distance < ILLUMINATION_CONFIG.clusterDistance;
        });
      })
      .slice(0, ILLUMINATION_CONFIG.maxDisplayLamps); // Limit for performance
    
    console.log(`📊 Loaded ${lampPostData3a.length} lamp posts (filtered from ${geoJsonData.features.length} total)`);
    
    statusDiv3a
      .attr("class", "st-badge st-badge-success")
      .text(`Loaded ${lampPostData3a.length.toLocaleString()} lamp posts`);

    const stamp = document.getElementById('lamps-status-line');
    if (stamp) stamp.textContent = `Loaded ${lampPostData3a.length.toLocaleString()} lamp posts`;

    return lampPostData3a;

  } catch (error) {
    console.error('Error loading lamp post data:', error);
    statusDiv3a
      .attr("class", "st-badge st-badge-error")
      .text(`Could not load lamp post data — ${error.message}`);
    const stamp = document.getElementById('lamps-status-line');
    if (stamp) stamp.textContent = 'Failed to load';
    throw error;
  }
}

// Helper function to extract lamp post number from description HTML
function extractLampPostNumber(description) {
  const match = description.match(/<th>LAMPPOST_NUM<\/th>\s*<td>([^<]+)<\/td>/);
  return match ? match[1] : 'Unknown';
}

// Helper function to extract values from description HTML
function extractFromDescription(description, field) {
  const regex = new RegExp(`<th>${field}<\\/th>\\s*<td>([^<]+)<\\/td>`);
  const match = description.match(regex);
  return match ? match[1] : null;
}

// Calculate distance between two points (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}

// Display lamp posts on map
async function displayLampPosts() {
  try {
    // Clear existing layers
    mapLayers3a.lampPosts.clearLayers();
    mapLayers3a.illuminationCircles.clearLayers();
    
    statusDiv3a.text("🔦 Plotting lamp posts with illumination radius...");
    
    if (lampPostData3a.length === 0) {
      await loadLampPostData();
    }
    
    let plotted = 0;
    
    lampPostData3a.forEach((lamp, index) => {
      const powerConfig = ILLUMINATION_CONFIG.powerLevels[lamp.powerLevel];
      
      // Debug: Log the lamp color being applied
      if (index < 5) { // Only log first 5 to avoid spam
        console.log(`🔦 Lamp ${index}: Power=${lamp.powerLevel}, Color=${powerConfig.color}`);
      }
      
      // Single illumination circle per lamp (3-ring glow halo removed —
      // 8000 SVG circles repainting on map move caused major scroll jank)
      const illuminationCircle = L.circle([lamp.latitude, lamp.longitude], {
        radius: powerConfig.radius,
        color: powerConfig.color,
        weight: 0,
        opacity: 0,
        fillColor: powerConfig.color,
        fillOpacity: powerConfig.intensity * 0.25,
        interactive: false
      });
      mapLayers3a.illuminationCircles.addLayer(illuminationCircle);
      
      // Create lamp post marker — static glow only (no per-lamp animation,
      // 2000 simultaneous keyframe animations cause severe scroll jank)
      const lampIcon = L.divIcon({
        html: `<div style="
            width:7px;height:7px;background:${powerConfig.color};
            border-radius:50%;border:1.5px solid #fff;
            box-shadow:0 0 6px ${powerConfig.color},0 0 12px ${powerConfig.color}aa;
          "></div>`,
        className: 'lamp-marker',
        iconSize: [10, 10],
        iconAnchor: [5, 5]
      });
      
      const marker = L.marker([lamp.latitude, lamp.longitude], {
        icon: lampIcon
      });
      
      // Create popup content — ST popup card
      const powerLabel = lamp.powerLevel.charAt(0).toUpperCase() + lamp.powerLevel.slice(1);
      const popupContent = `
        <div class="st-popup st-popup-dark">
          <div class="st-popup-eyebrow">Lamp post</div>
          <div class="st-popup-title">No. ${lamp.lampPostNumber}</div>
          <table class="st-popup-table">
            <tr><td>Power level</td><td>${powerLabel}</td></tr>
            <tr><td>Illumination radius</td><td>${powerConfig.radius} m</td></tr>
            <tr><td>Light intensity</td><td>${Math.round(powerConfig.intensity * 100)}%</td></tr>
            ${lamp.uniqueId ? `<tr><td>Unique ID</td><td>${lamp.uniqueId}</td></tr>` : ''}
          </table>
          <p class="st-popup-meta">${lamp.latitude.toFixed(6)}, ${lamp.longitude.toFixed(6)}</p>
          ${lamp.lastUpdated ? `<p class="st-popup-source">Last updated ${formatDate(lamp.lastUpdated)}</p>` : ''}
        </div>
      `;
      
      marker.bindPopup(popupContent, {
        maxWidth: 280,
        className: 'lamp-popup'
      });
      
      // Add click handler for highlighting
      marker.on('click', function() {
        highlightLampPost(lamp, this);
      });
      
      mapLayers3a.lampPosts.addLayer(marker);
      plotted++;
    });
    
    statusDiv3a
      .attr("class", "st-badge st-badge-success")
      .text(`Displaying ${plotted.toLocaleString()} lamp posts with illumination coverage`);

    console.log(`Plotted ${plotted} lamp posts with illumination radius`);

  } catch (error) {
    console.error('Error displaying lamp posts:', error);
    statusDiv3a
      .attr("class", "st-badge st-badge-error")
      .text(`Could not display lamp posts — ${error.message}`);
  }
}

// Format date string
function formatDate(dateString) {
  if (!dateString || dateString.length !== 14) return dateString;
  // Format: YYYYMMDDHHMMSS
  const year = dateString.substr(0, 4);
  const month = dateString.substr(4, 2);
  const day = dateString.substr(6, 2);
  const hour = dateString.substr(8, 2);
  const minute = dateString.substr(10, 2);
  return `${day}/${month}/${year} ${hour}:${minute}`;
}

// Highlight selected lamp post
function highlightLampPost(lamp, marker) {
  // Reset previous highlight
  if (selectedLampPost3a) {
    // Reset would go here if needed
  }
  
  selectedLampPost3a = lamp;
  
  // Add highlight effect
  const powerConfig = ILLUMINATION_CONFIG.powerLevels[lamp.powerLevel];
  const highlightCircle = L.circle([lamp.latitude, lamp.longitude], {
    radius: powerConfig.radius * 1.5,
    color: '#ffff00',
    weight: 3,
    opacity: 0.8,
    fillOpacity: 0.1,
    fillColor: '#ffff00'
  }).addTo(lampPostMap3a);
  
  // Remove highlight after 3 seconds
  setTimeout(() => {
    lampPostMap3a.removeLayer(highlightCircle);
  }, 3000);
  
  // Center map on selected lamp
  lampPostMap3a.setView([lamp.latitude, lamp.longitude], Math.max(15, lampPostMap3a.getZoom()));
  
  console.log(`Selected lamp post: ${lamp.lampPostNumber}`);
}

// Create control panel
function createControlPanel() {
  const controlsContainer = app3a.append("div").attr("class", "st-viz-toolbar");

  // Reset view button
  controlsContainer.append("button")
    .attr("class", "st-btn")
    .text("Reset view")
    .on("click", function() {
      lampPostMap3a.setView([1.3521, 103.8198], 11);
      selectedLampPost3a = null;
    });
}

// Create statistics panel
function createStatisticsPanel() {
  const statsContainer = app3a.append("div").attr("class", "st-stat-grid");

  const powerLevelCounts = {
    dim: lampPostData3a.filter(l => l.powerLevel === 'dim').length,
    normal: lampPostData3a.filter(l => l.powerLevel === 'normal').length,
    bright: lampPostData3a.filter(l => l.powerLevel === 'bright').length
  };

  const totalIlluminatedArea = lampPostData3a.reduce((total, lamp) => {
    const radius = ILLUMINATION_CONFIG.powerLevels[lamp.powerLevel].radius;
    return total + (Math.PI * radius * radius);
  }, 0);

  statsContainer.append("div").attr("class", "st-stat").html(`
    <div class="st-stat-value">${lampPostData3a.length.toLocaleString()}</div>
    <div class="st-stat-label">Lamp posts</div>
  `);

  statsContainer.append("div").attr("class", "st-stat").html(`
    <div class="st-stat-value">${(totalIlluminatedArea / 1000000).toFixed(1)} km²</div>
    <div class="st-stat-label">Coverage</div>
  `);

  statsContainer.append("div").attr("class", "st-stat").html(`
    <div class="st-stat-value">${powerLevelCounts.dim} · ${powerLevelCounts.normal} · ${powerLevelCounts.bright}</div>
    <div class="st-stat-label">Dim · Normal · Bright</div>
  `);
}

// Initialize the application
async function startLampPostVisualization() {
  try {
    console.log('Starting lamp post visualization...');

    initializeLampPostVisualization();
    await loadLampPostData();
    await displayLampPosts();
    createControlPanel();
    createStatisticsPanel();

    console.log('Lamp post visualization ready');
    
  } catch (error) {
    console.error('❌ Error starting lamp post visualization:', error);
    if (statusDiv3a) {
      statusDiv3a
        .attr("class", "st-badge st-badge-error")
        .text(`Initialisation failed — ${error.message}`);
    }
  }
}

// Auto-start the visualization
setTimeout(() => {
  startLampPostVisualization();
}, 500);

console.log('✅ App3a (Lamp Post Illumination) initialization complete');

})(); // End of IIFE to avoid global conflicts
