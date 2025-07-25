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
    .style("position", "relative")
    .style("margin-top", "20px")
    .style("padding", "30px")
    .append("div")
    .style("margin", "0 auto")
    .style("padding", "20px")
    .style("border-radius", "10px")
    .style("width", "100%")
    .style("max-width", "900px")
    .style("background", "#0c0c1c")
    .style("box-shadow", "0px 0px 2px hsla(0,0%,0%,0.2)");

  // Title for lamp post map
  app3a.append("h1")
    .style("color", "#ffeb3b")
    .style("font-size", "1.2rem")
    .style("margin-bottom", "12px")
    .text("🔦 Singapore Street Lighting Network");

  // Status indicator
  statusDiv3a = app3a.append("div")
    .attr("id", "lamp-status")
    .style("background", "#1a1a1a")
    .style("color", "#ffeb3b")
    .style("padding", "8px 16px")
    .style("border-radius", "6px")
    .style("margin-bottom", "16px")
    .style("text-align", "center")
    .style("font-weight", "500")
    .style("font-size", "0.9rem")
    .style("border", "1px solid #333")
    .text("🔦 Initializing lamp post data...");

  // Map container for lamp post map
  const mapContainer = app3a.append("div")
    .attr("id", "lamp-map")
    .style("height", "520px")
    .style("border-radius", "8px");

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
    statusDiv3a.text("🔦 Loading lamp post data from LTA...");
    
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
      .style("color", "#ffeb3b")
      .style("background", "#2e2a1a")
      .text(`✅ Loaded ${lampPostData3a.length} lamp posts successfully`);
    
    return lampPostData3a;
    
  } catch (error) {
    console.error('Error loading lamp post data:', error);
    statusDiv3a
      .style("color", "#f44336")
      .style("background", "#2e1a1a")
      .text(`❌ Error loading lamp post data: ${error.message}`);
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
      
      // Create illumination circle first (so it appears behind the lamp)
      const illuminationCircle = L.circle([lamp.latitude, lamp.longitude], {
        radius: powerConfig.radius,
        color: powerConfig.color,
        weight: 1,
        opacity: 0.6,
        fillColor: powerConfig.color,
        fillOpacity: powerConfig.intensity * 0.3,
        interactive: false
      });
      
      // Add glow effect with multiple circles
      for (let i = 1; i <= 3; i++) {
        const glowCircle = L.circle([lamp.latitude, lamp.longitude], {
          radius: powerConfig.radius + (i * 5),
          color: powerConfig.color,
          weight: 1,
          opacity: (powerConfig.intensity * 0.2) / i,
          fillOpacity: (powerConfig.intensity * 0.1) / (i * 2),
          fillColor: powerConfig.color,
          interactive: false
        });
        mapLayers3a.illuminationCircles.addLayer(glowCircle);
      }
      
      mapLayers3a.illuminationCircles.addLayer(illuminationCircle);
      
      // Create lamp post marker
      const lampIcon = L.divIcon({
        html: `
          <div style="
            width: 8px !important; 
            height: 8px !important; 
            background: ${powerConfig.color} !important; 
            border-radius: 50% !important;
            border: 2px solid #fff !important;
            box-shadow: 
              0 0 8px ${powerConfig.color},
              0 0 16px ${powerConfig.color}aa,
              0 0 24px ${powerConfig.color}66 !important;
            animation: pulse 2s infinite !important;
          "></div>
          <style>
            @keyframes pulse {
              0% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.2); opacity: 0.8; }
              100% { transform: scale(1); opacity: 1; }
            }
          </style>
        `,
        className: 'lamp-marker',
        iconSize: [12, 12],
        iconAnchor: [6, 6]
      });
      
      const marker = L.marker([lamp.latitude, lamp.longitude], {
        icon: lampIcon
      });
      
      // Create popup content
      const popupContent = `
        <div style="
          font-family: Arial, sans-serif; 
          min-width: 200px; 
          background: #1a1a1a; 
          color: #eee; 
          padding: 12px; 
          border-radius: 8px;
          border: 1px solid ${powerConfig.color};
        ">
          <h4 style="margin: 0 0 10px 0; color: ${powerConfig.color};">
            🔦 Lamp Post ${lamp.lampPostNumber}
          </h4>
          <div style="margin-bottom: 6px;">
            <strong>Power Level:</strong> ${lamp.powerLevel.charAt(0).toUpperCase() + lamp.powerLevel.slice(1)}
          </div>
          <div style="margin-bottom: 6px;">
            <strong>Illumination Radius:</strong> ${powerConfig.radius}m
          </div>
          <div style="margin-bottom: 6px;">
            <strong>Light Intensity:</strong> ${Math.round(powerConfig.intensity * 100)}%
          </div>
          ${lamp.uniqueId ? `<div style="margin-bottom: 6px;">
            <strong>Unique ID:</strong> ${lamp.uniqueId}
          </div>` : ''}
          <div style="font-size: 12px; color: #ccc; margin-top: 8px;">
            📍 ${lamp.latitude.toFixed(6)}, ${lamp.longitude.toFixed(6)}
          </div>
          ${lamp.lastUpdated ? `<div style="font-size: 11px; color: #999; margin-top: 6px;">
            Last updated: ${formatDate(lamp.lastUpdated)}
          </div>` : ''}
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
      .style("color", "#ffeb3b")
      .style("background", "#2e2a1a")
      .text(`✨ Displaying ${plotted} lamp posts with illumination coverage`);
    
    console.log(`🔦 Plotted ${plotted} lamp posts with illumination radius`);
    
  } catch (error) {
    console.error('Error displaying lamp posts:', error);
    statusDiv3a
      .style("color", "#f44336")
      .style("background", "#2e1a1a")
      .text(`❌ Error displaying lamp posts: ${error.message}`);
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
  const controlsContainer = app3a.append("div")
    .style("margin-top", "16px")
    .style("display", "flex")
    .style("gap", "10px")
    .style("justify-content", "center")
    .style("flex-wrap", "wrap");

  // Reset view button
  controlsContainer.append("button")
    .text("🎯 Reset")
    .style("padding", "8px 16px")
    .style("background", "#ffeb3b")
    .style("color", "#1a1a1a")
    .style("border", "none")
    .style("border-radius", "6px")
    .style("cursor", "pointer")
    .style("font-size", "12px")
    .style("font-weight", "bold")
    .on("click", function() {
      lampPostMap3a.setView([1.3521, 103.8198], 11);
      selectedLampPost3a = null;
    });
}

// Create statistics panel
function createStatisticsPanel() {
  const statsContainer = app3a.append("div")
    .style("margin-top", "16px")
    .style("display", "flex")
    .style("gap", "12px")
    .style("justify-content", "space-around")
    .style("background", "#1a1a1a")
    .style("padding", "12px")
    .style("border-radius", "8px")
    .style("border", "1px solid #333");

  // Calculate statistics
  const powerLevelCounts = {
    dim: lampPostData3a.filter(l => l.powerLevel === 'dim').length,
    normal: lampPostData3a.filter(l => l.powerLevel === 'normal').length,
    bright: lampPostData3a.filter(l => l.powerLevel === 'bright').length
  };

  const totalIlluminatedArea = lampPostData3a.reduce((total, lamp) => {
    const radius = ILLUMINATION_CONFIG.powerLevels[lamp.powerLevel].radius;
    return total + (Math.PI * radius * radius);
  }, 0);

  // Total lamps stat
  statsContainer.append("div")
    .style("text-align", "center")
    .style("flex", "1")
    .html(`
      <div style="color: #ffeb3b; font-size: 1.2rem; font-weight: bold;">${lampPostData3a.length.toLocaleString()}</div>
      <div style="color: #bbb; font-size: 0.8rem;">Lamp Posts</div>
    `);

  // Coverage area stat
  statsContainer.append("div")
    .style("text-align", "center")
    .style("flex", "1")
    .html(`
      <div style="color: #ffeb3b; font-size: 1.2rem; font-weight: bold;">${(totalIlluminatedArea / 1000000).toFixed(1)}km²</div>
      <div style="color: #bbb; font-size: 0.8rem;">Coverage</div>
    `);

  // Power distribution stat  
  statsContainer.append("div")
    .style("text-align", "center")
    .style("flex", "1")
    .html(`
      <div style="display: flex; justify-content: center; gap: 8px; margin-bottom: 4px;">
        <span style="color: #ffa500; font-size: 0.9rem; font-weight: bold;">${powerLevelCounts.dim}</span>
        <span style="color: #ffeb3b; font-size: 0.9rem; font-weight: bold;">${powerLevelCounts.normal}</span>
        <span style="color: #ffffff; font-size: 0.9rem; font-weight: bold;">${powerLevelCounts.bright}</span>
      </div>
      <div style="color: #bbb; font-size: 0.8rem;">Dim | Normal | Bright</div>
    `);
}

// Add simple footer
function createFooter() {
  app3a.append("p")
    .style("color", "#666")
    .style("font-size", "0.7rem")
    .style("margin-top", "16px")
    .style("text-align", "center")
    .style("font-style", "italic")
    .html("🔦 Singapore's Lamp Posts, Mapped");
}

// Initialize the application
async function startLampPostVisualization() {
  try {
    console.log('🚀 Starting lamp post visualization...');
    
    // Initialize components
    initializeLampPostVisualization();
    
    // Load and display data
    await loadLampPostData();
    await displayLampPosts();
    
    // Create UI components
    createControlPanel();
    createStatisticsPanel();
    createFooter();
    
    console.log('✅ Lamp post visualization ready!');
    
  } catch (error) {
    console.error('❌ Error starting lamp post visualization:', error);
    if (statusDiv3a) {
      statusDiv3a
        .style("color", "#f44336")
        .style("background", "#2e1a1a")
        .text(`❌ Initialization failed: ${error.message}`);
    }
  }
}

// Auto-start the visualization
setTimeout(() => {
  startLampPostVisualization();
}, 500);

console.log('✅ App3a (Lamp Post Illumination) initialization complete');

})(); // End of IIFE to avoid global conflicts
