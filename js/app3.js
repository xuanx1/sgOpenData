// Singapore Transportation Connectivity Index
// Uses multiple APIs to calculate connectivity scores for each planning area

console.log('🚀 Initializing Singapore Transportation Connectivity Index...');

// Initialize app3 container
const app3 = d3.select("#app3")
  .html("")
  .style("position", "relative")
  .style("margin-top", "20px")
  .style("padding", "30px")
  .append("div")
  .style("margin", "0 auto")
  .style("padding", "20px")
  .style("border-radius", "10px")
  .style("width", "100%")
  .style("max-width", "1000px")
  .style("background", "#0c0c1c")
  .style("box-shadow", "0px 0px 2px hsla(0,0%,0%,0.2)");

// Title
app3.append("h1")
  .style("color", "#eee")
  .style("font-size", "1.4rem")
  .style("margin-bottom", "15px")
  .style("text-align", "center")
  .text("🚇 PULSE Public Urban Linkage Seamless Efficiency Index");

// Status indicator
const statusDiv = app3.append("div")
  .attr("id", "connectivity-status")
  .style("color", "#3498db")
  .style("font-size", "14px")
  .style("margin-bottom", "20px")
  .style("padding", "12px")
  .style("background", "#1a2332")
  .style("border-radius", "6px")
  .style("text-align", "center")
  .text("🔄 Initializing connectivity analysis system...");

// Map container
const mapContainer = app3.append("div")
  .attr("id", "connectivity-map")
  .style("height", "600px")
  .style("border-radius", "8px")
  .style("margin-bottom", "20px")
  .style("border", "1px solid #333");

// Initialize Leaflet
const connectivityMap = L.map('connectivity-map', {
    minZoom: 11,
    maxZoom: 16
}).setView([1.3521, 103.8198], 11);

// Google Maps tiles
L.tileLayer("https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
    attribution: "&copy; Google Maps",
    subdomains: ["mt0", "mt1", "mt2", "mt3"],
    maxZoom: 16,
    minZoom: 11,
}).addTo(connectivityMap);

// Add custom CSS to remove popup white border/bezel
const style = document.createElement('style');
style.textContent = `
  .connectivity-popup .leaflet-popup-content-wrapper {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    padding: 0 !important;
    border-radius: 0 !important;
  }
  .connectivity-popup .leaflet-popup-tip {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
  }
`;
document.head.appendChild(style);

// Global variables for data storage
let connectivityScores = {};
let planningAreaBoundaries = {};
let selectedArea = null;
let taxiCountByArea = {}; // Store taxi counts for each planning area
let carparkCountByArea = {}; // Store carpark counts for each planning area
let mapLayers = {
  busStops: null,
  mrtStations: null,
  taxiAvailability: null,
  carparks: null,
  planningAreaPolygons: null,
  highlightedPolygon: null
};

// API endpoints for Singapore Open Data
const APIs = {
  busStops: 'https://datamall2.mytransport.sg/ltaodataservice/BusStops',
  busRoutes: 'https://datamall2.mytransport.sg/ltaodataservice/BusRoutes',
  taxiAvailability: 'https://api.data.gov.sg/v1/transport/taxi-availability',
  carparks: 'https://api.data.gov.sg/v1/transport/carpark-availability',
  trafficImages: 'https://api.data.gov.sg/v1/transport/traffic-images',
}

// Planning Area Polygon Boundaries - loaded from pa.geojson
let PLANNING_AREA_POLYGONS = {};

// Function to extract planning area name from GeoJSON description
function extractPlanningAreaName(description) {
  try {
    // The description field contains the planning area name directly
    if (!description || typeof description !== 'string') {
      console.warn('Invalid description:', description);
      return null;
    }
    
    // Clean up the description - trim whitespace and convert to proper case
    const areaName = description.trim();
    
    if (areaName.length === 0) {
      console.warn('Empty description found');
      return null;
    }
    
    // Convert to title case (first letter of each word capitalized)
    const titleCase = areaName.toLowerCase().split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    
    // Special case handling for specific areas that need exact matching
    let finalName = titleCase;
    if (areaName.toUpperCase() === 'TUAS') {
      finalName = 'Tuas';
    }
    
    console.log(`✅ Extracted planning area name: "${finalName}" from description: "${description}"`);
    return finalName;
    
  } catch (error) {
    console.error('Error extracting planning area name:', error);
    return null;
  }
}

// Function to load GeoJSON data
async function loadPlanningAreaPolygons() {
  try {
    console.log('🔄 Loading planning area polygons from pa.geojson...');
    statusDiv.text("🗺️ Loading planning area polygons...");
    
    const response = await fetch('./data/pa.geojson');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const geojsonData = await response.json();
    console.log('📋 GeoJSON data loaded successfully:', {
      type: geojsonData.type,
      features: geojsonData.features?.length || 0
    });
    
    if (!geojsonData.features || !Array.isArray(geojsonData.features)) {
      throw new Error('Invalid GeoJSON format: missing features array');
    }
    
    let loadedCount = 0;
    let skippedCount = 0;
    
    // Convert GeoJSON to our polygon format
    geojsonData.features.forEach((feature, index) => {
      try {
        if (!feature.properties || !feature.properties.Description) {
          console.warn(`Feature ${index} missing Description property`);
          skippedCount++;
          return;
        }
        
        const areaName = extractPlanningAreaName(feature.properties.Description);
        
        if (!areaName) {
          console.warn(`Could not extract area name from feature ${index}`);
          skippedCount++;
          return;
        }
        
        if (!feature.geometry || (feature.geometry.type !== 'Polygon' && feature.geometry.type !== 'MultiPolygon')) {
          console.warn(`Feature ${index} (${areaName}) has invalid geometry type:`, feature.geometry?.type);
          skippedCount++;
          return;
        }
        
        // Handle both Polygon and MultiPolygon geometries
        let processedGeometry;
        
        if (feature.geometry.type === 'Polygon') {
          // Convert 3D coordinates to 2D for Leaflet compatibility
          const coordinates2D = feature.geometry.coordinates.map(ring => 
            ring.map(coord => [coord[1], coord[0]]) // Convert [lon, lat, elevation] to [lat, lon]
          );
          
          processedGeometry = {
            type: "Polygon",
            coordinates: coordinates2D
          };
          
        } else if (feature.geometry.type === 'MultiPolygon') {
          // For MultiPolygon, we need to handle the nested structure properly
          // MultiPolygon coordinates structure: [[[ring1], [ring2]], [[ring3]]]
          // Convert each polygon's coordinates from 3D to 2D
          const multiPolygonCoords = feature.geometry.coordinates.map(polygon => 
            polygon.map(ring => 
              ring.map(coord => [coord[1], coord[0]]) // Convert [lon, lat, elevation] to [lat, lon]
            )
          );
          
          processedGeometry = {
            type: "MultiPolygon",
            coordinates: multiPolygonCoords
          };
          
          console.log(`📍 Processing MultiPolygon for ${areaName}: ${feature.geometry.coordinates.length} polygons`);
        }
        
        // Store the processed geometry with the correct type
        PLANNING_AREA_POLYGONS[areaName] = {
          type: "Feature",
          properties: { name: areaName },
          geometry: processedGeometry
        };
        
        loadedCount++;
        console.log(`✅ Loaded polygon for: ${areaName}`);
        
      } catch (error) {
        console.error(`Error processing feature ${index}:`, error);
        skippedCount++;
      }
    });
    
    console.log(`✅ Polygon loading complete: ${loadedCount} loaded, ${skippedCount} skipped`);
    console.log('📍 Loaded planning areas:', Object.keys(PLANNING_AREA_POLYGONS).sort());
    console.log('🏢 Defined planning areas:', Object.keys(PLANNING_AREAS).sort());
    
    // Check for missing polygons
    const missingPolygons = Object.keys(PLANNING_AREAS).filter(area => !PLANNING_AREA_POLYGONS[area]);
    const extraPolygons = Object.keys(PLANNING_AREA_POLYGONS).filter(area => !PLANNING_AREAS[area]);
    
    if (missingPolygons.length > 0) {
      console.warn('⚠️ Areas without polygons:', missingPolygons);
    }
    if (extraPolygons.length > 0) {
      console.warn('⚠️ Polygons without area data:', extraPolygons);
    }
    
    if (loadedCount === 0) {
      throw new Error('No valid polygons could be loaded from GeoJSON');
    }
    
    statusDiv.text(`✅ Loaded ${loadedCount} planning area polygons from GeoJSON`);
    return true;
    
  } catch (error) {
    console.error('❌ Error loading planning area polygons:', error);
    statusDiv.text(`⚠️ GeoJSON loading failed: ${error.message}. Using fallback data...`);

    return false;
  }
}


// Singapore Planning Areas - manual definition for accurate scoring
const PLANNING_AREAS = {
    'Ang Mo Kio': { center: [1.3691, 103.8454], population: 163000 },
    'Bedok': { center: [1.3236, 103.9273], population: 289000 },
    'Bishan': { center: [1.3484, 103.8485], population: 91000 },
    'Boon Lay': { center: [1.3470, 103.7065], population: 20 }, // Likely incorrect - Boon Lay is residential
    'Bukit Batok': { center: [1.3590, 103.7746], population: 167000 },
    'Bukit Merah': { center: [1.2797, 103.8278], population: 152000 },
    'Bukit Panjang': { center: [1.3774, 103.7719], population: 139000 },
    'Bukit Timah': { center: [1.3294, 103.8008], population: 83000 },
    //'Central Region': { center: [1.3200, 103.8400], population: 9700 },
    'Central Water Catchment': { center: [1.3643, 103.8038], population: 10 }, // Reasonable as nature reserve
    'Changi': { center: [1.3644, 103.9915], population: 2500 },
    'Changi Bay': { center: [1.3215, 104.0119], population: 0 },
    'Choa Chu Kang': { center: [1.3840, 103.7470], population: 190000 },
    'Clementi': { center: [1.3162, 103.7649], population: 90000 },
    'Downtown Core': { center: [1.2792, 103.8509], population: 18000 },
    'Geylang': { center: [1.3201, 103.8918], population: 120000 },
    'Hougang': { center: [1.3613, 103.8863], population: 226000 },
    'Jurong East': { center: [1.3326, 103.7407], population: 87000 },
    'Jurong West': { center: [1.3404, 103.7090], population: 264000 },
    'Kallang': { center: [1.3119, 103.8632], population: 32000 },
    'Lim Chu Kang': { center: [1.4143, 103.7093], population: 1200 },
    'Mandai': { center: [1.4092, 103.7910], population: 3500 },
    'Marina East': { center: [1.2800, 103.8630], population: 2500 },
    'Marina South': { center: [1.2650, 103.8590], population: 4000 },
    'Marine Parade': { center: [1.3020, 103.9067], population: 53000 },
    'Museum': { center: [1.2960, 103.8480], population: 800 },
    'Newton': { center: [1.3185, 103.8384], population: 26000 },
    'North Eastern Islands': { center: [1.4138, 103.9626], population: 40 },
    'Novena': { center: [1.3276, 103.8435], population: 51800 },
    'Orchard': { center: [1.3048, 103.8318], population: 1290 },
    'Outram': { center: [1.2778, 103.8340], population: 16790 },
    'Pasir Ris': { center: [1.3720, 103.9492], population: 146000 },
    'Paya Lebar': { center: [1.3177, 103.8926], population: 20 }, // Likely incorrect - commercial/residential area
    'Pioneer': { center: [1.3154, 103.6974], population: 80 }, // Likely incorrect - industrial area but too low
    'Punggol': { center: [1.4043, 103.9021], population: 198000 },
    'Queenstown': { center: [1.2943, 103.7861], population: 103000 },
    'River Valley': { center: [1.2936, 103.8355], population: 12000 },
    'Rochor': { center: [1.3023, 103.8554], population: 13000 },
    'Seletar': { center: [1.4041, 103.8692], population: 300 },
    'Sembawang': { center: [1.4491, 103.8185], population: 110000 },
    'Sengkang': { center: [1.3868, 103.8914], population: 265000 },
    'Serangoon': { center: [1.3553, 103.8677], population: 118000 },
    'Simpang': { center: [1.3654, 103.9540], population: 20 }, // Likely incorrect
    'Singapore River': { center: [1.2880, 103.8500], population: 4400 },
    'Southern Islands': { center: [1.2085, 103.8405], population: 2500 },
    'Straits View': { center: [1.3280, 103.9280], population: 10 },
    'Sungei Kadut': { center: [1.4138, 103.7568], population: 800 },
    'Tampines': { center: [1.3496, 103.9568], population: 285000 },
    'Tanglin': { center: [1.3063, 103.8134], population: 25000 },
    'Tengah': { center: [1.3745, 103.7149], population: 8000 },
    'Toa Payoh': { center: [1.3343, 103.8563], population: 138000 },
    'Tuas': { center: [1.2966, 103.6361], population: 70 }, // Primarily industrial but still low
    'Western Islands': { center: [1.2085, 103.7405], population: 10 },
    'Western Water Catchment': { center: [1.4041, 103.6893], population: 600 },
    'Woodlands': { center: [1.4382, 103.7890], population: 255000 },
    'Yishun': { center: [1.4230, 103.8350], population: 229000 }
};

// Connectivity scoring weights
const SCORING_WEIGHTS = {
  busStops: 0.30,      // 30% - Bus accessibility
  mrtStations: 0.35,   // 35% - MRT connectivity (highest weight)
  taxiAvailability: 0.15, // 15% - Taxi access
  carparks: 0.20       // 20% - Parking availability
};

// Function to calculate distance between two points (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Function to get planning area for coordinates
function getPlanningArea(lat, lon) {
  let closestArea = null;
  let minDistance = Infinity;
  
  for (const [areaName, data] of Object.entries(PLANNING_AREAS)) {
    const distance = calculateDistance(lat, lon, data.center[0], data.center[1]);
    if (distance < minDistance) {
      minDistance = distance;
      closestArea = areaName;
    }
  }
  
  return minDistance < 3 ? closestArea : null; // Within 3km radius
}

// Function to check if a point is inside a polygon using ray casting algorithm
function isPointInPolygon(point, polygonFeature) {
  const [lat, lng] = point;
  
  try {
    if (!polygonFeature || !polygonFeature.geometry) {
      return false;
    }
    
    const geometry = polygonFeature.geometry;
    
    // Handle both Polygon and MultiPolygon
    if (geometry.type === 'Polygon') {
      return isPointInPolygonRing(lat, lng, geometry.coordinates[0]);
    } else if (geometry.type === 'MultiPolygon') {
      // Check if point is in any of the polygons
      for (const polygon of geometry.coordinates) {
        if (isPointInPolygonRing(lat, lng, polygon[0])) {
          return true;
        }
      }
      return false;
    }
    
    return false;
  } catch (error) {
    console.warn('Error in point-in-polygon check:', error);
    return false;
  }
}

// Helper function for ray casting algorithm
function isPointInPolygonRing(lat, lng, ring) {
  let inside = false;
  
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][1]; // longitude
    const yi = ring[i][0]; // latitude
    const xj = ring[j][1]; // longitude
    const yj = ring[j][0]; // latitude
    
    if (((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  
  return inside;
}

// Fetch bus stops data from local JSON file
async function fetchBusStopsData() {
  try {
    statusDiv.text("🚌 Fetching bus stops data...");
    
    // Load bus stops from local JSON file
    const response = await fetch('./data/bus-stops.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const busStopsData = await response.json();
    
    // Transform the data to match expected format
    const busStops = busStopsData.map(stop => ({
      BusStopCode: stop.name || 'N/A',
      RoadName: 'N/A',
      Description: stop.details || 'Bus Stop',
      Latitude: stop.coordinates.lat,
      Longitude: stop.coordinates.long,
      wab: stop.wab === "true"
    }));
    
    console.log(`✅ Loaded ${busStops.length} bus stops from bus-stops.json`);
    return busStops;
  } catch (error) {
    console.error('Error fetching bus stops:', error);
    statusDiv.text("⚠️ Using fallback bus stops data...");
    
    // Fallback to mock data if file loading fails
    const mockBusStops = [];
    for (const [areaName, data] of Object.entries(PLANNING_AREAS)) {
      if (data.population > 0) {
        // Generate bus stops around each planning area
        const numStops = Math.floor(data.population / 5000) + Math.random() * 10;
        for (let i = 0; i < numStops; i++) {
          mockBusStops.push({
            BusStopCode: `${areaName.substring(0, 3).toUpperCase()}${i.toString().padStart(3, '0')}`,
            RoadName: `${areaName} Road`,
            Description: `${areaName} Bus Stop ${i + 1}`,
            Latitude: data.center[0] + (Math.random() - 0.5) * 0.02,
            Longitude: data.center[1] + (Math.random() - 0.5) * 0.02
          });
        }
      }
    }
    return mockBusStops;
  }
}

// Fetch MRT stations data
async function fetchMRTStationsData() {
  try {
    statusDiv.text("🚇 Fetching MRT stations data...");
    
    // Comprehensive MRT stations in Singapore with actual coordinates
    const mrtStations = [
      // North-South Line (NS)
      { name: "Jurong East", lat: 1.3330, lon: 103.7424, lines: ["NS", "EW"] },
      { name: "Bukit Batok", lat: 1.3589, lon: 103.7497, lines: ["NS"] },
      { name: "Bukit Gombak", lat: 1.3589, lon: 103.7516, lines: ["NS"] },
      { name: "Choa Chu Kang", lat: 1.3854, lon: 103.7442, lines: ["NS"] },
      { name: "Yew Tee", lat: 1.3969, lon: 103.7474, lines: ["NS"] },
      { name: "Kranji", lat: 1.4250, lon: 103.7619, lines: ["NS"] },
      { name: "Marsiling", lat: 1.4327, lon: 103.7740, lines: ["NS"] },
      { name: "Woodlands", lat: 1.4369, lon: 103.7869, lines: ["NS"] },
      { name: "Admiralty", lat: 1.4406, lon: 103.8013, lines: ["NS"] },
      { name: "Sembawang", lat: 1.4491, lon: 103.8200, lines: ["NS"] },
      { name: "Canberra", lat: 1.4430, lon: 103.8296, lines: ["NS"] },
      { name: "Yishun", lat: 1.4294, lon: 103.8350, lines: ["NS"] },
      { name: "Khatib", lat: 1.4173, lon: 103.8329, lines: ["NS"] },
      { name: "Yio Chu Kang", lat: 1.3817, lon: 103.8448, lines: ["NS"] },
      { name: "Ang Mo Kio", lat: 1.3700, lon: 103.8495, lines: ["NS"] },
      { name: "Bishan", lat: 1.3515, lon: 103.8487, lines: ["NS", "CC"] },
      { name: "Braddell", lat: 1.3403, lon: 103.8467, lines: ["NS"] },
      { name: "Toa Payoh", lat: 1.3327, lon: 103.8474, lines: ["NS"] },
      { name: "Novena", lat: 1.3203, lon: 103.8440, lines: ["NS"] },
      { name: "Newton", lat: 1.3127, lon: 103.8388, lines: ["NS"] },
      { name: "Orchard", lat: 1.3044, lon: 103.8318, lines: ["NS"] },
      { name: "Somerset", lat: 1.3008, lon: 103.8389, lines: ["NS"] },
      { name: "Dhoby Ghaut", lat: 1.2987, lon: 103.8458, lines: ["NS", "CC", "NE"] },
      { name: "City Hall", lat: 1.2933, lon: 103.8519, lines: ["NS", "EW"] },
      { name: "Raffles Place", lat: 1.2837, lon: 103.8515, lines: ["NS", "EW"] },
      { name: "Marina Keppel", lat: 1.2739, lon: 103.8554, lines: ["NS"] },
      { name: "Marina Bay", lat: 1.2762, lon: 103.8544, lines: ["NS", "CE"] },
      
      // East-West Line (EW)
      { name: "Pasir Ris", lat: 1.3731, lon: 103.9492, lines: ["EW"] },
      { name: "Tampines", lat: 1.3549, lon: 103.9451, lines: ["EW"] },
      { name: "Simei", lat: 1.3434, lon: 103.9534, lines: ["EW"] },
      { name: "Tanah Merah", lat: 1.3273, lon: 103.9464, lines: ["EW"] },
      { name: "Bedok", lat: 1.3240, lon: 103.9300, lines: ["EW"] },
      { name: "Kembangan", lat: 1.3213, lon: 103.9133, lines: ["EW"] },
      { name: "Eunos", lat: 1.3196, lon: 103.9034, lines: ["EW"] },
      { name: "Paya Lebar", lat: 1.3177, lon: 103.8926, lines: ["EW", "CC"] },
      { name: "Aljunied", lat: 1.3162, lon: 103.8830, lines: ["EW"] },
      { name: "Kallang", lat: 1.3114, lon: 103.8715, lines: ["EW"] },
      { name: "Lavender", lat: 1.3073, lon: 103.8630, lines: ["EW"] },
      { name: "Bugis", lat: 1.3006, lon: 103.8559, lines: ["EW"] },
      { name: "Tanjong Pagar", lat: 1.2768, lon: 103.8456, lines: ["EW"] },
      { name: "Outram Park", lat: 1.2801, lon: 103.8397, lines: ["NE", "EW"] },
      { name: "Tiong Bahru", lat: 1.2860, lon: 103.8270, lines: ["EW"] },
      { name: "Redhill", lat: 1.2896, lon: 103.8168, lines: ["EW"] },
      { name: "Queenstown", lat: 1.2946, lon: 103.8060, lines: ["EW"] },
      { name: "Commonwealth", lat: 1.3026, lon: 103.7980, lines: ["EW"] },
      { name: "Buona Vista", lat: 1.3066, lon: 103.7900, lines: ["CC", "EW"] },
      { name: "Dover", lat: 1.3116, lon: 103.7786, lines: ["EW"] },
      { name: "Clementi", lat: 1.3152, lon: 103.7649, lines: ["EW"] },
      { name: "Chinese Garden", lat: 1.3425, lon: 103.732, lines: ["EW"] },
      { name: "Lakeside", lat: 1.3445, lon: 103.7209, lines: ["EW"] },
      { name: "Boon Lay", lat: 1.3388, lon: 103.7058, lines: ["EW"] },
      { name: "Pioneer", lat: 1.3378, lon: 103.6973, lines: ["EW"] },
      { name: "Joo Koon", lat: 1.3278, lon: 103.6788, lines: ["EW"] },
      { name: "Gul Circle", lat: 1.3194, lon: 103.6607, lines: ["EW"] },
      { name: "Tuas Crescent", lat: 1.3209, lon: 103.6493, lines: ["EW"] },
      { name: "Tuas West Road", lat: 1.3298, lon: 103.6401, lines: ["EW"] },
      { name: "Tuas Link", lat: 1.3404, lon: 103.6363, lines: ["EW"] },
      
      // North East Line (NE)
      { name: "HarbourFront", lat: 1.2653, lon: 103.8220, lines: ["NE", "CC"] },
      { name: "Chinatown", lat: 1.2844, lon: 103.8437, lines: ["NE"] },
      { name: "Clarke Quay", lat: 1.2887, lon: 103.8467, lines: ["NE"] },
      { name: "Little India", lat: 1.3067, lon: 103.8493, lines: ["NE"] },
      { name: "Farrer Park", lat: 1.3123, lon: 103.8544, lines: ["NE"] },
      { name: "Boon Keng", lat: 1.3198, lon: 103.8619, lines: ["NE"] },
      { name: "Potong Pasir", lat: 1.3309, lon: 103.8697, lines: ["NE"] },
      { name: "Woodleigh", lat: 1.3393, lon: 103.8707, lines: ["NE"] },
      { name: "Serangoon", lat: 1.3498, lon: 103.8735, lines: ["NE", "CC"] },
      { name: "Kovan", lat: 1.3598, lon: 103.8850, lines: ["NE"] },
      { name: "Hougang", lat: 1.3713, lon: 103.8924, lines: ["NE"] },
      { name: "Buangkok", lat: 1.3829, lon: 103.8927, lines: ["NE"] },
      { name: "Sengkang", lat: 1.3916, lon: 103.8946, lines: ["NE"] },
      { name: "Punggol", lat: 1.4054, lon: 103.9022, lines: ["NE"] },
      
      // Circle Line (CC)
      { name: "Marymount", lat: 1.3486, lon: 103.8393, lines: ["CC"] },
      { name: "Caldecott", lat: 1.3376, lon: 103.8398, lines: ["CC"] },
      { name: "Botanic Gardens", lat: 1.3221, lon: 103.8155, lines: ["CC"] },
      { name: "Farrer Road", lat: 1.3172, lon: 103.8074, lines: ["CC"] },
      { name: "Holland Village", lat: 1.3115, lon: 103.7962, lines: ["CC"] },
      { name: "one-north", lat: 1.2987, lon: 103.7872, lines: ["CC"] },
      { name: "Kent Ridge", lat: 1.2935, lon: 103.7844, lines: ["CC"] },
      { name: "Haw Par Villa", lat: 1.2822, lon: 103.7817, lines: ["CC"] },
      { name: "Pasir Panjang", lat: 1.2764, lon: 103.7916, lines: ["CC"] },
      { name: "Labrador Park", lat: 1.2722, lon: 103.8027, lines: ["CC"] },
      { name: "Telok Blangah", lat: 1.2707, lon: 103.8097, lines: ["CC"] },
      { name: "Nicoll Highway", lat: 1.2998, lon: 103.8634, lines: ["CC"] },
      { name: "Stadium", lat: 1.3027, lon: 103.8756, lines: ["CC"] },
      { name: "Mountbatten", lat: 1.3063, lon: 103.8825, lines: ["CC"] },
      { name: "Dakota", lat: 1.3079, lon: 103.8884, lines: ["CC"] },
      { name: "MacPherson", lat: 1.3267, lon: 103.8900, lines: ["CC"] },
      { name: "Tai Seng", lat: 1.3354, lon: 103.8881, lines: ["CC"] },
      { name: "Bartley", lat: 1.3423, lon: 103.8796, lines: ["CC"] },
      { name: "Lorong Chuan", lat: 1.3519, lon: 103.8648, lines: ["CC"] },
      
      // Downtown Line (DT)
      { name: "Bukit Panjang", lat: 1.3793, lon: 103.7618, lines: ["DT"] },
      { name: "Cashew", lat: 1.3694, lon: 103.7792, lines: ["DT"] },
      { name: "Hillview", lat: 1.3626, lon: 103.7676, lines: ["DT"] },
      { name: "Beauty World", lat: 1.3414, lon: 103.7759, lines: ["DT"] },
      { name: "King Albert Park", lat: 1.3355, lon: 103.7838, lines: ["DT"] },
      { name: "Sixth Avenue", lat: 1.3306, lon: 103.7965, lines: ["DT"] },
      { name: "Tan Kah Kee", lat: 1.3259, lon: 103.8075, lines: ["DT"] },
      { name: "Stevens", lat: 1.3199, lon: 103.8255, lines: ["DT"] },
      { name: "Rochor", lat: 1.3041, lon: 103.8522, lines: ["DT"] },
      { name: "Bugis", lat: 1.3007, lon: 103.8559, lines: ["DT", "EW"] },
      { name: "Promenade", lat: 1.2932, lon: 103.8613, lines: ["DT", "CC"] },
      { name: "Bayfront", lat: 1.2817, lon: 103.8590, lines: ["DT", "CE"] },
      { name: "Downtown", lat: 1.2798, lon: 103.8522, lines: ["DT"] },
      { name: "Telok Ayer", lat: 1.2822, lon: 103.8486, lines: ["DT"] },
      { name: "Chinatown", lat: 1.2844, lon: 103.8437, lines: ["DT", "NE"] },
      { name: "Fort Canning", lat: 1.2934, lon: 103.8444, lines: ["DT"] },
      { name: "Bencoolen", lat: 1.2986, lon: 103.8500, lines: ["DT"] },
      { name: "Jalan Besar", lat: 1.3055, lon: 103.8548, lines: ["DT"] },
      { name: "Bendemeer", lat: 1.3141, lon: 103.8620, lines: ["DT"] },
      { name: "Geylang Bahru", lat: 1.3215, lon: 103.8714, lines: ["DT"] },
      { name: "Mattar", lat: 1.3266, lon: 103.8831, lines: ["DT"] },
      { name: "Ubi", lat: 1.3300, lon: 103.8996, lines: ["DT"] },
      { name: "Kaki Bukit", lat: 1.3347, lon: 103.9088, lines: ["DT"] },
      { name: "Bedok North", lat: 1.3349, lon: 103.9180, lines: ["DT"] },
      { name: "Bedok Reservoir", lat: 1.3359, lon: 103.9330, lines: ["DT"] },
      { name: "Tampines West", lat: 1.3455, lon: 103.9384, lines: ["DT"] },
      { name: "Tampines", lat: 1.3535, lon: 103.9451, lines: ["DT", "EW"] },
      { name: "Tampines East", lat: 1.3561, lon: 103.9554, lines: ["DT"] },
      { name: "Upper Changi", lat: 1.3413, lon: 103.9616, lines: ["DT"] },
      { name: "Expo", lat: 1.3355, lon: 103.9614, lines: ["DT"] },
      
      // Thomson-East Coast Line (TE)
      { name: "Woodlands North", lat: 1.4480, lon: 103.7865, lines: ["TE"] },
      { name: "Woodlands South", lat: 1.4288, lon: 103.7865, lines: ["TE"] },
      { name: "Springleaf", lat: 1.3970, lon: 103.8178, lines: ["TE"] },
      { name: "Lentor", lat: 1.3842, lon: 103.8367, lines: ["TE"] },
      { name: "Mayflower", lat: 1.3658, lon: 103.8364, lines: ["TE"] },
      { name: "Bright Hill", lat: 1.3582, lon: 103.8329, lines: ["TE"] },
      { name: "Upper Thomson", lat: 1.3544, lon: 103.8307, lines: ["TE"] },
      { name: "Caldecott", lat: 1.3377, lon: 103.8398, lines: ["TE", "CC"] },
      { name: "Mount Pleasant", lat: 1.3246, lon: 103.8358, lines: ["TE"] },
      { name: "Stevens", lat: 1.3199, lon: 103.8255, lines: ["TE", "DT"] },
      { name: "Napier", lat: 1.3049, lon: 103.8196, lines: ["TE"] },
      { name: "Orchard Boulevard", lat: 1.3016, lon: 103.8243, lines: ["TE"] },
      { name: "Orchard", lat: 1.3044, lon: 103.8318, lines: ["TE", "NS"] },
      { name: "Great World", lat: 1.2935, lon: 103.8318, lines: ["TE"] },
      { name: "Havelock", lat: 1.2888, lon: 103.8343, lines: ["TE"] },
      { name: "Outram Park", lat: 1.2801, lon: 103.8397, lines: ["TE", "NE", "EW"] },
      { name: "Maxwell", lat: 1.2808, lon: 103.8442, lines: ["TE"] },
      { name: "Shenton Way", lat: 1.2799, lon: 103.8497, lines: ["TE"] },
      { name: "Marina Bay", lat: 1.2762, lon: 103.8544, lines: ["TE", "NS", "CE"] },
      { name: "Marina South", lat: 1.2713, lon: 103.8633, lines: ["TE"] },
      { name: "Gardens by the Bay", lat: 1.2815, lon: 103.8640, lines: ["TE"] },
      { name: "Tanjong Rhu", lat: 1.2936, lon: 103.8753, lines: ["TE"] },
      { name: "Katong Park", lat: 1.3015, lon: 103.8923, lines: ["TE"] },
      { name: "Tanjong Katong", lat: 1.3095, lon: 103.9026, lines: ["TE"] },
      { name: "Marine Parade", lat: 1.3025, lon: 103.9067, lines: ["TE"] },
      { name: "Marine Terrace", lat: 1.3067, lon: 103.9153, lines: ["TE"] },
      { name: "Siglap", lat: 1.3135, lon: 103.9288, lines: ["TE"] },
      { name: "Bayshore", lat: 1.3180, lon: 103.9432, lines: ["TE"] },
      { name: "Bedok South", lat: 1.3199, lon: 103.9472, lines: ["TE"] },
      
      // LRT Lines
      { name: "Sengkang", lat: 1.3916, lon: 103.8946, lines: ["STC", "NE"] },
      { name: "Compassvale", lat: 1.3945, lon: 103.9001, lines: ["STC"] },
      { name: "Rumbia", lat: 1.3909, lon: 103.9063, lines: ["STC"] },
      { name: "Bakau", lat: 1.3878, lon: 103.9052, lines: ["STC"] },
      { name: "Kangkar", lat: 1.3831, lon: 103.9016, lines: ["STC"] },
      { name: "Ranggung", lat: 1.3816, lon: 103.8973, lines: ["STC"] },
      { name: "Cheng Lim", lat: 1.3960, lon: 103.8934, lines: ["STC"] },
      { name: "Farmway", lat: 1.3972, lon: 103.8897, lines: ["STC"] },
      { name: "Kupang", lat: 1.3985, lon: 103.8859, lines: ["STC"] },
      { name: "Thanggam", lat: 1.3970, lon: 103.8821, lines: ["STC"] },
      { name: "Fernvale", lat: 1.3916, lon: 103.8778, lines: ["STC"] },
      { name: "Layar", lat: 1.3915, lon: 103.8740, lines: ["STC"] },
      { name: "Tongkang", lat: 1.3890, lon: 103.8761, lines: ["STC"] },
      { name: "Renjong", lat: 1.3867, lon: 103.8802, lines: ["STC"] },
      
      // Punggol LRT
      { name: "Punggol", lat: 1.4054, lon: 103.9022, lines: ["PTC", "NE"] },
      { name: "Cove", lat: 1.3993, lon: 103.9056, lines: ["PTC"] },
      { name: "Meridian", lat: 1.3967, lon: 103.9082, lines: ["PTC"] },
      { name: "Coral Edge", lat: 1.3938, lon: 103.9109, lines: ["PTC"] },
      { name: "Riviera", lat: 1.3915, lon: 103.9136, lines: ["PTC"] },
      { name: "Kadaloor", lat: 1.3908, lon: 103.9172, lines: ["PTC"] },
      { name: "Oasis", lat: 1.3918, lon: 103.9211, lines: ["PTC"] },
      { name: "Damai", lat: 1.3949, lon: 103.9239, lines: ["PTC"] },
      { name: "Sam Kee", lat: 1.3988, lon: 103.9212, lines: ["PTC"] },
      { name: "Teck Lee", lat: 1.4020, lon: 103.9180, lines: ["PTC"] },
      { name: "Punggol Point", lat: 1.4059, lon: 103.9151, lines: ["PTC"] },
      { name: "Samudera", lat: 1.4089, lon: 103.9119, lines: ["PTC"] },
      { name: "Nibong", lat: 1.4115, lon: 103.9087, lines: ["PTC"] },
      { name: "Sumang", lat: 1.4139, lon: 103.9055, lines: ["PTC"] },
      { name: "Soo Teck", lat: 1.4139, lon: 103.9017, lines: ["PTC"] }
    ];

    
    return mrtStations;
  } catch (error) {
    console.error('Error fetching MRT stations:', error);
    return [];
  }
}

// Display MRT stations on map
async function displayMRTStations() {
  try {
    // Clear existing MRT stations layer
    if (mapLayers.mrtStations) {
      connectivityMap.removeLayer(mapLayers.mrtStations);
    }
    
    statusDiv.text("🚇 Loading MRT stations on map...");
    
    // Get MRT stations data
    const mrtStations = await fetchMRTStationsData();
    
    // Create layer group for MRT stations
    mapLayers.mrtStations = L.layerGroup();
    
    // Create MRT station markers
    mrtStations.forEach(station => {
      // Determine line colors for the station
      const lineColors = {
        'NS': '#d32f2f',    // Red (North-South)
        'EW': '#4caf50',    // Green (East-West)
        'NE': '#9c27b0',    // Purple (North East)
        'CC': '#ff9800',    // Orange (Circle)
        'DT': '#2196f3',    // Blue (Downtown)
        'TE': '#795548',    // Brown (Thomson-East Coast)
        'STC': '#607d8b',   // Blue Grey (Sengkang LRT)
        'PTC': '#607d8b'    // Blue Grey (Punggol LRT)
      };
      
      // Get primary line color (first line)
      const primaryColor = lineColors[station.lines[0]] || '#757575';
      
      // Create custom MRT icon
      const mrtIcon = L.divIcon({
        html: `
          <div style="
            background: ${primaryColor}; 
            width: 10px; 
            height: 10px; 
            border-radius: 50%; 
            border: 2px solid white;
            box-shadow: 0 0 3px rgba(0,0,0,0.3);
          "></div>
        `,
        className: 'mrt-station-icon',
        iconSize: [10, 10],
        iconAnchor: [5, 5]
      });
      
      // Create marker
      const marker = L.marker([station.lat, station.lon], {
        icon: mrtIcon
      });
      
      // Create popup content
      const popupContent = `
        <div style="font-family: Arial, sans-serif; min-width: 180px; background: #222222; color: #eee; padding: 8px; border-radius: 6px;">
          <h4 style="margin: 0 0 8px 0; color: #fff;">🚇 ${station.name}</h4>
          <div style="margin-bottom: 8px;">
            <strong>Lines:</strong> ${station.lines.map(line => `<span style="background: ${lineColors[line] || '#757575'}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px; margin-right: 3px;">${line}</span>`).join('')}
          </div>
          <div style="font-size: 12px; color: #ccc;">
            📍 ${station.lat.toFixed(4)}, ${station.lon.toFixed(4)}
          </div>
        </div>
      `;
      
      marker.bindPopup(popupContent, {
        maxWidth: 250,
        className: 'connectivity-popup'
      });
      
      // Add marker to layer group
      mapLayers.mrtStations.addLayer(marker);
    });
    
    // Add layer to map
    connectivityMap.addLayer(mapLayers.mrtStations);
    
    statusDiv
      .style("color", "#27ae60")
      .style("background", "#1a4d3a")
      .text(`✅ Displayed ${mrtStations.length} MRT stations on map`);
    
    console.log(`✅ Displayed ${mrtStations.length} MRT stations on map`);
    
  } catch (error) {
    console.error('Error displaying MRT stations:', error);
    statusDiv
      .style("color", "#e74c3c")
      .style("background", "#4d1a1a")
      .text("❌ Error loading MRT stations");
  }
}

// Display bus stops on map
async function displayBusStops() {
  try {
    // Clear existing bus stops layer
    if (mapLayers.busStops) {
      connectivityMap.removeLayer(mapLayers.busStops);
    }
    
    statusDiv.text("🚌 Loading bus stops on map...");
    
    // Get bus stops data
    const busStops = await fetchBusStopsData();
    
    // Create layer group for bus stops
    mapLayers.busStops = L.layerGroup();
    
    // Create bus stop markers (using a subset for performance - every 10th stop)
    const displayStops = busStops.filter((stop, index) => index % 5 === 0); // Show every 5th stop to avoid overcrowding
    
    displayStops.forEach(stop => {
      // Create custom bus icon
      const busIcon = L.divIcon({
        html: `
          <div style="
            background: #3498db; 
            width: 6px; 
            height: 6px; 
            border-radius: 2px; 
            border: 1px solid white;
            box-shadow: 0 0 2px rgba(0,0,0,0.3);
          "></div>
        `,
        className: 'bus-stop-icon',
        iconSize: [6, 6],
        iconAnchor: [3, 3]
      });
      
      // Create marker
      const marker = L.marker([stop.Latitude, stop.Longitude], {
        icon: busIcon
      });
      
      // Create popup content
      const popupContent = `
        <div style="font-family: Arial, sans-serif; min-width: 180px; background: #222222; color: #eee; padding: 8px; border-radius: 6px;">
          <h4 style="margin: 0 0 8px 0; color: #fff;">🚌 ${stop.Description}</h4>
          <div style="margin-bottom: 6px;">
            <strong>Stop Code:</strong> ${stop.BusStopCode}
          </div>
          ${stop.RoadName !== 'N/A' ? `<div style="margin-bottom: 6px;">
            <strong>Road:</strong> ${stop.RoadName}
          </div>` : ''}
          ${stop.wab ? `<div style="margin-bottom: 6px; color: #3498db;">
            <strong>🦽 Wheelchair Accessible</strong>
          </div>` : ''}
          <div style="font-size: 12px; color: #ccc;">
            📍 ${stop.Latitude.toFixed(4)}, ${stop.Longitude.toFixed(4)}
          </div>
        </div>
      `;
      
      marker.bindPopup(popupContent, {
        maxWidth: 250,
        className: 'connectivity-popup'
      });
      
      // Add marker to layer group
      mapLayers.busStops.addLayer(marker);
    });
    
    // Add layer to map
    connectivityMap.addLayer(mapLayers.busStops);
    
    statusDiv
      .style("color", "#27ae60")
      .style("background", "#1a4d3a")
      .text(`✅ Displayed ${displayStops.length} bus stops on map (${busStops.length} total loaded)`);
    
    console.log(`✅ Displayed ${displayStops.length} bus stops on map out of ${busStops.length} total`);
    
  } catch (error) {
    console.error('Error displaying bus stops:', error);
    statusDiv
      .style("color", "#e74c3c")
      .style("background", "#4d1a1a")
      .text("❌ Error loading bus stops");
  }
}

// Display taxis on map
async function displayTaxis() {
  try {
    // Clear existing taxi layer
    if (mapLayers.taxiAvailability) {
      connectivityMap.removeLayer(mapLayers.taxiAvailability);
    }
    
    statusDiv.text("🚕 Loading taxis on map...");
    
    // Get taxi data
    const taxiData = await fetchTaxiAvailabilityData();
    
    if (!taxiData || taxiData.length === 0) {
      statusDiv.text("⚠️ No taxi data available");
      return;
    }
    
    // Create layer group for taxis
    mapLayers.taxiAvailability = L.layerGroup();
    
    // Extract coordinates from the first feature
    const taxiCoordinates = taxiData[0]?.geometry?.coordinates || [];
    
    if (taxiCoordinates.length === 0) {
      statusDiv.text("⚠️ No taxi coordinates found");
      return;
    }
    
    // Create taxi markers (show every 3rd taxi to avoid overcrowding)
    const displayTaxis = taxiCoordinates.filter((coord, index) => index % 3 === 0);
    
    displayTaxis.forEach((coord, index) => {
      const lat = coord[1]; // GeoJSON format is [longitude, latitude]
      const lng = coord[0];
      
      // Find which planning area this taxi is in
      let planningArea = 'Unknown';
      for (const [areaName, polygonData] of Object.entries(PLANNING_AREA_POLYGONS)) {
        if (isPointInPolygon([lat, lng], polygonData)) {
          planningArea = areaName;
          break;
        }
      }
      
      // Fallback to distance-based area assignment
      if (planningArea === 'Unknown') {
        planningArea = getPlanningArea(lat, lng) || 'Unknown';
      }
      
      // Create custom taxi icon
      const taxiIcon = L.divIcon({
        html: `
          <div style="
            background: #f39c12; 
            width: 8px; 
            height: 8px; 
            border-radius: 50%; 
            border: 2px solid white;
            box-shadow: 0 0 3px rgba(0,0,0,0.4);
          "></div>
        `,
        className: 'taxi-icon',
        iconSize: [8, 8],
        iconAnchor: [4, 4]
      });
      
      // Create marker
      const marker = L.marker([lat, lng], {
        icon: taxiIcon
      });
      
      // Create popup content
      const areaCount = taxiCountByArea[planningArea] || 0;
      const popupContent = `
        <div style="font-family: Arial, sans-serif; min-width: 180px; background: #222222; color: #eee; padding: 8px; border-radius: 6px;">
          <h4 style="margin: 0 0 8px 0; color: #fff;">🚕 Available Taxi</h4>
          <div style="margin-bottom: 6px;">
            <strong>Planning Area:</strong> ${planningArea}
          </div>
          <div style="margin-bottom: 6px;">
            <strong>Area Taxi Count:</strong> ${areaCount}
          </div>
          <div style="font-size: 12px; color: #ccc;">
            📍 ${lat.toFixed(4)}, ${lng.toFixed(4)}
          </div>
          <div style="font-size: 11px; color: #999; margin-top: 6px;">
            Real-time data from Singapore Open Data
          </div>
        </div>
      `;
      
      marker.bindPopup(popupContent, {
        maxWidth: 220,
        className: 'connectivity-popup'
      });
      
      // Add marker to layer group
      mapLayers.taxiAvailability.addLayer(marker);
    });
    
    // Add layer to map
    connectivityMap.addLayer(mapLayers.taxiAvailability);
    
    statusDiv
      .style("color", "#f39c12")
      .style("background", "#3d2914")
      .text(`✅ Displayed ${displayTaxis.length} taxis on map (${taxiCoordinates.length} total available)`);
    
    console.log(`✅ Displayed ${displayTaxis.length} taxis on map out of ${taxiCoordinates.length} total`);
    
  } catch (error) {
    console.error('Error displaying taxis:', error);
    statusDiv
      .style("color", "#e74c3c")
      .style("background", "#4d1a1a")
      .text("❌ Error loading taxis");
  }
}

// Display carparks on map
async function displayCarparks() {
  try {
    // Clear existing carpark layer
    if (mapLayers.carparks) {
      connectivityMap.removeLayer(mapLayers.carparks);
    }
    
    statusDiv.text("🅿️ Loading carparks on map...");
    
    // Get carpark data
    const carparkData = await fetchCarparkData();
    
    if (!carparkData || carparkData.length === 0) {
      statusDiv.text("⚠️ No carpark data available");
      return;
    }
    
    // Create layer group for carparks
    mapLayers.carparks = L.layerGroup();
    
    // Filter carparks that have coordinates
    const carparksWithLocation = carparkData.filter(carpark => 
      carpark.location && carpark.location.coordinates
    );
    
    if (carparksWithLocation.length === 0) {
      statusDiv.text("⚠️ No carpark coordinates found");
      return;
    }
    
    // Create carpark markers (show every 2nd carpark to avoid overcrowding)
    const displayCarparks = carparksWithLocation.filter((carpark, index) => index % 2 === 0);
    
    displayCarparks.forEach((carpark, index) => {
      const [lng, lat] = carpark.location.coordinates;
      
      // Get carpark availability info
      const carparkInfo = carpark.carpark_info?.[0];
      const totalLots = carparkInfo?.total_lots || 'N/A';
      const availableLots = carparkInfo?.lots_available || 'N/A';
      const lotType = carparkInfo?.lot_type || 'C'; // Default to Car
      
      // Create custom carpark icon with color based on availability
      let iconColor = '#2ecc71'; // Green - good availability
      if (typeof availableLots === 'number' && typeof totalLots === 'number') {
        const occupancyRate = (totalLots - availableLots) / totalLots;
        if (occupancyRate > 0.8) iconColor = '#e74c3c'; // Red - high occupancy
        else if (occupancyRate > 0.6) iconColor = '#f39c12'; // Orange - medium occupancy
      }
      
      const carparkIcon = L.divIcon({
        html: `
          <div style="
            background: ${iconColor}; 
            width: 10px; 
            height: 10px; 
            border-radius: 2px; 
            border: 2px solid white;
            box-shadow: 0 0 3px rgba(0,0,0,0.4);
          "></div>
        `,
        className: 'carpark-icon',
        iconSize: [10, 10],
        iconAnchor: [5, 5]
      });
      
      // Create marker
      const marker = L.marker([lat, lng], {
        icon: carparkIcon
      });
      
      // Create popup content
      const areaCount = carparkCountByArea[carpark.planningArea] || 0;
      const popupContent = `
        <div style="font-family: Arial, sans-serif; min-width: 200px; background: #222222; color: #eee; padding: 8px; border-radius: 6px;">
          <h4 style="margin: 0 0 8px 0; color: #fff;">🅿️ ${carpark.carpark_number}</h4>
          <div style="margin-bottom: 6px;">
            <strong>Planning Area:</strong> ${carpark.planningArea || 'Unknown'}
          </div>
          <div style="margin-bottom: 6px;">
            <strong>Area Carpark Count:</strong> ${areaCount}
          </div>
          <div style="margin-bottom: 6px;">
            <strong>Available Lots:</strong> ${availableLots}/${totalLots}
          </div>
          ${lotType !== 'C' ? `<div style="margin-bottom: 6px;">
            <strong>Lot Type:</strong> ${lotType}
          </div>` : ''}
          <div style="margin-bottom: 6px; font-size: 12px;">
            <strong>Address:</strong> ${carpark.address || 'Not available'}
          </div>
          <div style="font-size: 12px; color: #ccc;">
            📍 ${lat.toFixed(4)}, ${lng.toFixed(4)}
          </div>
          <div style="font-size: 11px; color: #999; margin-top: 6px;">
            Real-time data from Singapore Open Data + HDB CSV
          </div>
        </div>
      `;
      
      marker.bindPopup(popupContent, {
        maxWidth: 280,
        className: 'connectivity-popup'
      });
      
      // Add marker to layer group
      mapLayers.carparks.addLayer(marker);
    });
    
    // Add layer to map
    connectivityMap.addLayer(mapLayers.carparks);
    
    statusDiv
      .style("color", "#2ecc71")
      .style("background", "#1a4d3a")
      .text(`✅ Displayed ${displayCarparks.length} carparks on map (${carparksWithLocation.length} total with coordinates)`);
    
    console.log(`✅ Displayed ${displayCarparks.length} carparks on map out of ${carparksWithLocation.length} with coordinates`);
    
  } catch (error) {
    console.error('Error displaying carparks:', error);
    statusDiv
      .style("color", "#e74c3c")
      .style("background", "#4d1a1a")
      .text("❌ Error loading carparks");
  }
}

// Fetch taxi availability data with enhanced counting functionality
async function fetchTaxiAvailabilityData() {
  try {
    statusDiv.text("🚕 Fetching taxi availability data...");
    
    const response = await fetch(APIs.taxiAvailability);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract coordinates from the response
    const taxiCoordinates = data.features[0].geometry.coordinates;
    
    // Extract additional information for logging
    const timestamp = data.features[0].properties?.timestamp || 'N/A';
    const taxiCount = taxiCoordinates.length;
    const status = data.features[0].properties?.api_info?.status || 'N/A';
    
    console.log("📊 Taxi Availability Data Summary:", {
      timestamp: timestamp,
      totalTaxis: taxiCount,
      status: status
    });
    
    // Count taxis in each planning area
    const localTaxiCountByArea = {};
    
    // Initialize all areas with 0 count
    Object.keys(PLANNING_AREAS).forEach(areaName => {
      localTaxiCountByArea[areaName] = 0;
    });
    
    // Count taxis in each planning area using polygon intersection
    taxiCoordinates.forEach(coord => {
      const lat = coord[1]; // GeoJSON format is [longitude, latitude]
      const lng = coord[0];
      
      // Find which planning area this taxi belongs to
      let foundArea = null;
      
      // Check against polygon boundaries if available
      for (const [areaName, polygonData] of Object.entries(PLANNING_AREA_POLYGONS)) {
        if (isPointInPolygon([lat, lng], polygonData)) {
          foundArea = areaName;
          break;
        }
      }
      
      // Fallback to distance-based assignment if polygon check fails
      if (!foundArea) {
        foundArea = getPlanningArea(lat, lng);
      }
      
      if (foundArea && localTaxiCountByArea.hasOwnProperty(foundArea)) {
        localTaxiCountByArea[foundArea]++;
      }
    });
    
    // Store taxi count data globally for use in other functions
    taxiCountByArea = localTaxiCountByArea;
    
    // Log taxi distribution
    console.log("🚕 Taxi Distribution by Planning Area:", taxiCountByArea);
    
    // Update status with taxi distribution summary
    const areasWithTaxis = Object.values(taxiCountByArea).filter(count => count > 0).length;
    statusDiv.text(`🚕 Loaded ${taxiCount} taxis across ${areasWithTaxis} planning areas`);
    
    return data.features || [];
  } catch (error) {
    console.error('Error fetching taxi data:', error);
    statusDiv.text("⚠️ Using fallback taxi data...");
    return [];
  }
}

// Fetch carpark availability data from data.gov.sg and match with local CSV data
async function fetchCarparkData() {
  try {
    statusDiv.text("🅿️ Fetching carpark data...");
    
    // Fetch carpark availability data
    const response = await fetch(APIs.carparks);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();  
    
    // Load carpark coordinates and address from local CSV file
    let carparkInfo = {};
    try {
      const csvResponse = await fetch('data/HDBCarparkInformation_with_wgs84.csv');
      const csvText = await csvResponse.text();
      
      // Parse CSV
      const lines = csvText.split('\n');
      const headers = lines[0].split(',');
      
      // Find indices for the columns we need
      const carParkNoIdx = headers.findIndex(h => h.trim().toLowerCase() === 'car_park_no');
      const latIdx = headers.findIndex(h => h.trim().toLowerCase() === 'latitude' || h.trim().toLowerCase() === 'lat');
      const lngIdx = headers.findIndex(h => h.trim().toLowerCase() === 'longitude' || h.trim().toLowerCase() === 'lng');
      const addressIdx = headers.findIndex(h => h.trim().toLowerCase() === 'address');
      
      // Process each line to create mapping
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue; // Skip empty lines
        
        const values = lines[i].split(',');
        const carParkNo = values[carParkNoIdx]?.trim();
        const lat = parseFloat(values[latIdx]);
        const lng = parseFloat(values[lngIdx]);
        const address = addressIdx !== -1 && values[addressIdx]?.trim() 
                ? values[addressIdx].trim() 
                : `Approximate location at coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        
        if (carParkNo && !isNaN(lat) && !isNaN(lng)) {
          carparkInfo[carParkNo] = { lat, lng, address };
        }
      }
      
      console.log(`Loaded data for ${Object.keys(carparkInfo).length} carparks from CSV`);
    } catch (error) {
      console.error("Error loading carpark data from CSV:", error);
    }
    
    // Combine API data with CSV coordinates
    const carparkData = data.items[0]?.carpark_data || [];
    const enrichedCarparks = [];
    
    // Count carparks by planning area
    const localCarparkCountByArea = {};
    Object.keys(PLANNING_AREAS).forEach(areaName => {
      localCarparkCountByArea[areaName] = 0;
    });
    
    carparkData.forEach(carpark => {
      const carparkNo = carpark.carpark_number;
      const coordinates = carparkInfo[carparkNo];
      
      if (coordinates) {
        // Find which planning area this carpark belongs to
        let foundArea = null;
        
        // Check against polygon boundaries if available
        for (const [areaName, polygonData] of Object.entries(PLANNING_AREA_POLYGONS)) {
          if (isPointInPolygon([coordinates.lat, coordinates.lng], polygonData)) {
            foundArea = areaName;
            break;
          }
        }
        
        // Fallback to distance-based assignment if polygon check fails
        if (!foundArea) {
          foundArea = getPlanningArea(coordinates.lat, coordinates.lng);
        }
        
        if (foundArea && localCarparkCountByArea.hasOwnProperty(foundArea)) {
          localCarparkCountByArea[foundArea]++;
        }
        
        enrichedCarparks.push({
          ...carpark,
          location: {
            coordinates: [coordinates.lng, coordinates.lat]
          },
          address: coordinates.address,
          planningArea: foundArea || 'Unknown'
        });
      } else {
        // If no coordinates found, add without location
        enrichedCarparks.push({
          ...carpark,
          location: null,
          address: 'Location not available',
          planningArea: 'Unknown'
        });
      }
    });
    
    // Store carpark count data globally
    carparkCountByArea = localCarparkCountByArea;
    
    console.log("🅿️ Carpark Distribution by Planning Area:", carparkCountByArea);
    console.log(`✅ Loaded ${enrichedCarparks.length} carparks with ${enrichedCarparks.filter(c => c.location).length} having coordinates`);
    
    return enrichedCarparks;
    
  } catch (error) {
    console.error('Error fetching carpark data:', error);
    // Return mock data if API fails
    const mockCarparks = [];
    for (const [areaName, data] of Object.entries(PLANNING_AREAS)) {
      if (data.population > 0) {
        const numCarparks = Math.floor(data.population / 15000) + Math.random() * 3;
        for (let i = 0; i < numCarparks; i++) {
          mockCarparks.push({
            carpark_number: `${areaName.substring(0, 2).toUpperCase()}${i}CP`,
            area: areaName,
            development: `${areaName} Shopping Centre`,
            location: {
              coordinates: [
                data.center[1] + (Math.random() - 0.5) * 0.015,
                data.center[0] + (Math.random() - 0.5) * 0.015
              ]
            },
            address: `Mock address in ${areaName}`,
            planningArea: areaName,
            carpark_info: [{
              total_lots: Math.floor(Math.random() * 500) + 100,
              lots_available: Math.floor(Math.random() * 200) + 50
            }]
          });
        }
      }
    }
    return mockCarparks;
  }
}

// Calculate connectivity scores for each planning area using density-based scoring
async function calculateConnectivityScores() {
  try {
    statusDiv.text("📊 Calculating connectivity scores...");
    
    // Fetch all transportation data
    const [busStops, mrtStations, taxiData, carparkData] = await Promise.all([
      fetchBusStopsData(),
      fetchMRTStationsData(),
      fetchTaxiAvailabilityData(),
      fetchCarparkData()
    ]);
    
    // Initialize scores
    const areaScores = {};
    
    // Calculate scores for each planning area using polygon-based counting
    for (const [areaName, areaData] of Object.entries(PLANNING_AREAS)) {
      if (areaData.population === 0) continue; // Skip uninhabited areas
      
      const polygonData = PLANNING_AREA_POLYGONS[areaName];
      if (!polygonData) {
        console.warn(`No polygon data found for ${areaName}, skipping...`);
        continue;
      }
      
      // Count bus stops within the planning area polygon
      const busStopsInArea = busStops.filter(stop => 
        isPointInPolygon([stop.Latitude, stop.Longitude], polygonData)
      );
      
      // Count MRT stations within the planning area polygon
      const mrtStationsInArea = mrtStations.filter(station =>
        isPointInPolygon([station.lat, station.lon], polygonData)
      );
      
      // Count taxis within the planning area polygon
      let taxisInArea = 0;
      if (taxiData && taxiData.length > 0 && taxiData[0].geometry) {
        const taxiCoordinates = taxiData[0].geometry.coordinates || [];
        taxisInArea = taxiCoordinates.filter(coord => {
          const [lon, lat] = coord;
          return isPointInPolygon([lat, lon], polygonData);
        }).length;
      }
      
      // Count carparks within the planning area polygon
      const carparksInArea = carparkData.filter(carpark => {
        if (carpark.location && carpark.location.coordinates) {
          const [lon, lat] = carpark.location.coordinates;
          return isPointInPolygon([lat, lon], polygonData);
        }
        return false;
      });
      
      // Calculate density-based scores (residents per facility for intuitive understanding)
      const population = areaData.population;
      
      // Bus density: Calculate residents per bus stop (lower = better accessibility)
      const residentsPerBusStop = busStopsInArea.length > 0 ? Math.round(population / busStopsInArea.length) : Infinity;
      const busScore = Math.min(100, Math.max(0, 100 - (residentsPerBusStop / 40))); // Adjusted: 0 score when >4000 residents per stop
      
      // MRT density: Calculate residents per MRT station (lower = better accessibility)
      const residentsPerMRTStation = mrtStationsInArea.length > 0 ? Math.round(population / mrtStationsInArea.length) : Infinity;
      const mrtScore = Math.min(100, Math.max(0, 100 - (residentsPerMRTStation / 400))); // Adjusted: 0 score when >40000 residents per station
      
      // Taxi density: Calculate residents per taxi (lower = better availability)
      const residentsPerTaxi = taxisInArea > 0 ? Math.round(population / taxisInArea) : Infinity;
      const taxiScore = Math.min(100, Math.max(0, 100 - (residentsPerTaxi / 150))); // Adjusted: 0 score when >15000 residents per taxi
      
      // Carpark density: Calculate residents per carpark (lower = better parking availability)
      const residentsPerCarpark = carparksInArea.length > 0 ? Math.round(population / carparksInArea.length) : Infinity;
      const carparkScore = Math.min(100, Math.max(0, 100 - (residentsPerCarpark / 80))); // Adjusted: 0 score when >8000 residents per carpark
      
      // Calculate weighted total score
      const totalScore = (
        busScore * SCORING_WEIGHTS.busStops +
        mrtScore * SCORING_WEIGHTS.mrtStations +
        taxiScore * SCORING_WEIGHTS.taxiAvailability +
        carparkScore * SCORING_WEIGHTS.carparks
      );
      
      areaScores[areaName] = {
        totalScore: Math.round(totalScore),
        busScore: Math.round(busScore),
        mrtScore: Math.round(mrtScore),
        taxiScore: Math.round(taxiScore),
        carparkScore: Math.round(carparkScore),
        busStops: busStopsInArea.length,
        mrtStations: mrtStationsInArea.length,
        taxis: taxisInArea,
        carparks: carparksInArea.length,
        population: areaData.population,
        // Add density metrics for analysis (residents per facility)
        residentsPerBusStop: residentsPerBusStop === Infinity ? 'No bus stops' : residentsPerBusStop,
        residentsPerMRTStation: residentsPerMRTStation === Infinity ? 'No MRT stations' : residentsPerMRTStation,
        residentsPerTaxi: residentsPerTaxi === Infinity ? 'No taxis' : residentsPerTaxi,
        residentsPerCarpark: residentsPerCarpark === Infinity ? 'No carparks' : residentsPerCarpark
      };
    }
    
    return areaScores;
  } catch (error) {
    console.error('Error calculating connectivity scores:', error);
    throw error;
  }
}

// Get color based on connectivity score
function getConnectivityColor(score) {
  if (score >= 85) return '#27ae60'; // Excellent - Bright Green
  if (score >= 70) return '#2ecc71'; // Very Good - Green
  if (score >= 55) return '#f39c12'; // Good - Orange
  if (score >= 40) return '#e67e22'; // Fair - Dark Orange
  if (score >= 25) return '#e74c3c'; // Poor - Red
  if (score >= 10) return '#c0392b'; // Very Poor - Dark Red
  return '#7f8c8d'; // Extremely Poor - Gray
}

// Function to create planning area polygons
function createPlanningAreaPolygons() {
  // Clear existing polygon layer
  if (mapLayers.planningAreaPolygons) {
    connectivityMap.removeLayer(mapLayers.planningAreaPolygons);
  }
  
  mapLayers.planningAreaPolygons = L.layerGroup().addTo(connectivityMap);
  
  // Add each planning area polygon
  for (const [areaName, polygonData] of Object.entries(PLANNING_AREA_POLYGONS)) {
    // Include all areas that have polygon data, regardless of population
    if (PLANNING_AREAS[areaName]) {
      const score = connectivityScores[areaName] ? connectivityScores[areaName].totalScore : 0;
      const color = getConnectivityColor(score);
      
      // Create polygon using coordinates - handle both Polygon and MultiPolygon
      let polygon;
      
      if (polygonData.geometry.type === 'Polygon') {
        // Standard polygon creation
        polygon = L.polygon(polygonData.geometry.coordinates, {
          fillColor: color,
          fillOpacity: 0.7,
          color: '#ffffff',
          weight: 2,
          opacity: 0.8
        });
      } else if (polygonData.geometry.type === 'MultiPolygon') {
        // MultiPolygon creation - Leaflet can handle MultiPolygon coordinates directly
        polygon = L.polygon(polygonData.geometry.coordinates, {
          fillColor: color,
          fillOpacity: 0.7,
          color: '#ffffff',
          weight: 2,
          opacity: 0.8
        });
        console.log(`✅ Created MultiPolygon for ${areaName} with ${polygonData.geometry.coordinates.length} polygon parts`);
      }
      
      // Add click handler for polygon highlighting
      polygon.on('click', function() {
        highlightPlanningArea(areaName, this);
      });
      
      
      
      // Get the detailed score data for this area
      const scoreData = connectivityScores[areaName] || {
        totalScore: score,
        busScore: 0,
        mrtScore: 0,
        taxiScore: 0,
        carparkScore: 0,
        busStops: 0,
        mrtStations: 0,
        taxis: 0,
        carparks: 0,
        population: PLANNING_AREAS[areaName].population
      };
      
      // Create detailed popup content
    const popupContent = `
        <div style="font-family: Arial, sans-serif; min-width: 250px; background: #222; color: #eee; padding: 10px; border-radius: 8px;">
            <h3 style="margin: 0 0 10px 0; color: #fff;">${areaName}</h3>
            <div style="background: linear-gradient(90deg, ${color} 0%, ${color} ${scoreData.totalScore}%, #444 ${scoreData.totalScore}%, #444 100%); 
                            height: 20px; border-radius: 10px; margin: 5px 0; position: relative;">
            <span style="position: absolute; left: 50%; top: 50%; transform: translate(-50%, -48%); 
                             font-weight: bold; color: white; font-size: 14px;">
                ${scoreData.totalScore} / 100
            </span>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 15px;">
            <div style="background: #333; padding: 8px; border-radius: 5px; border-left: 3px solid #3498db; ">
                🚌 Bus Access<br><br>
                <span style="font-weight: normal">
                Score: ${scoreData.busScore} / 100
                <br>
                Count: ${scoreData.busStops}
                <br>
                <small style="color: #80ccffff;">${scoreData.residentsPerBusStop} Residents per Bus Stop</small>
                </span>
            </div>
            <div style="background: #333; padding: 8px; border-radius: 5px; border-left: 3px solid #9b59b6;">
            🚇MRT Access<br><br>
                <span style="font-weight: normal">
                Score: ${scoreData.mrtScore} / 100
                <br>
                Count: ${scoreData.mrtStations}
                <br>
                <small style="color: #d89bf0ff;">${scoreData.residentsPerMRTStation} Residents per MRT Station</small>
            </div>
            <div style="background: #333; padding: 8px; border-radius: 5px; border-left: 3px solid #f39c12;">
            🚕 Taxis<br><br>
                <span style="font-weight: normal">
                Score: ${scoreData.taxiScore} / 100<br>
                Count: ${scoreData.taxis}
                <br>
                <small style="color: #fac46eff;">${scoreData.residentsPerTaxi} Residents per Taxi</small>
            </div>
            <div style="background: #333; padding: 8px; border-radius: 5px; border-left: 3px solid #2ecc71;">
            🅿️ Parking<br><br>
                <span style="font-weight: normal">
                Score: ${scoreData.carparkScore} / 100
                <br>
                Count: ${scoreData.carparks}
                <br>
                <small style="color: #88f0b3ff;">${scoreData.residentsPerCarpark} Residents per Carpark</small>
            </div>
            </div>
            
            <div style="margin-top: 15px; padding: 8px; font-weight: normal; background: #2c3e50; border-radius: 5px;">
            <strong>Population: Approximately </strong> ${scoreData.population.toLocaleString()} residents<br>
            <strong>Scoring Method:</strong> Density-based (residents per facility)<br>
            <strong>Overall Rating:</strong> 
            ${scoreData.totalScore >= 85 ? '⭐⭐⭐⭐⭐ Excellent' : 
                scoreData.totalScore >= 70 ? '⭐⭐⭐⭐⭐ Very Good' : 
                scoreData.totalScore >= 55 ? '⭐⭐⭐⭐ Good' : 
                scoreData.totalScore >= 40 ? '⭐⭐⭐ Fair' : 
                scoreData.totalScore >= 25 ? '⭐⭐ Poor' : 
                scoreData.totalScore >= 10 ? '⭐ Very Poor' : '☆ Extremely Poor'}
            </div>
        </div>
    `;
      
      polygon.bindPopup(popupContent, {
        maxWidth: 350,
        className: 'connectivity-popup'
      });
      
      mapLayers.planningAreaPolygons.addLayer(polygon);
    }
  }
}

// Function to highlight a selected planning area
function highlightPlanningArea(areaName, polygon) {
  // Reset previous highlight
  if (mapLayers.highlightedPolygon && selectedArea) {
    mapLayers.highlightedPolygon.setStyle({
      weight: 2,
      fillOpacity: 0.7,
      color: '#ffffff'
    });
  }
  
  // Set new highlight
  selectedArea = areaName;
  mapLayers.highlightedPolygon = polygon;
  
  polygon.setStyle({
    weight: 4,
    fillOpacity: 0.7,
    color: '#ffff00' // Bright yellow border for highlight
  });
  
  // Update info panel
  displayAreaDetails(areaName);
  
  // Center map on selected area
  const areaCenter = PLANNING_AREAS[areaName].center;
  connectivityMap.setView(areaCenter, 11, { animate: true });
  
  console.log(`Selected planning area: ${areaName}`);
}

// Function to display detailed information for selected area
function displayAreaDetails(areaName) {
  // Remove existing details panel
  d3.select("#area-details").remove();
  
  const scoreData = connectivityScores[areaName];
  if (!scoreData) return;
  
  const detailsPanel = app3.insert("div", "#connectivity-stats")
    .attr("id", "area-details")
    .style("margin", "20px 0")
    .style("padding", "20px")
    .style("background", "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)")
    .style("border-radius", "12px")
    .style("border", `3px solid ${getConnectivityColor(scoreData.totalScore)}`)
    .style("box-shadow", "0 8px 32px rgba(0,0,0,0.3)");
  
  // Title with selection indicator
  detailsPanel.append("div")
    .style("display", "flex")
    .style("align-items", "center")
    .style("margin-bottom", "15px")
    .html(`
      <h2 style="color: #fff; margin: 0; font-size: 1.5rem; flex: 1;">
        📍 ${areaName}
      </h2>
      <button id="clear-selection" style="
        background: #e74c3c; color: white; border: none; 
        padding: 8px 12px; border-radius: 6px; cursor: pointer;
        font-size: 12px; font-weight: bold;
      ">✕ Clear Selection</button>
    `);
  
  // Add click handler for clear selection button
  d3.select("#clear-selection").on("click", function() {
    clearAreaSelection();
  });
  
  // Score visualization
  const scoreColor = getConnectivityColor(scoreData.totalScore);
  detailsPanel.append("div")
    .style("background", scoreColor)
    .style("color", "white")
    .style("padding", "15px")
    .style("border-radius", "8px")
    .style("margin-bottom", "20px")
    .style("text-align", "center")
    .style("font-size", "1.2rem")
    .style("font-weight", "bold")
    .html(`
      🎯 Overall Connectivity Score: ${scoreData.totalScore}/100<br>
      <div style="font-size: 0.9rem; margin-top: 5px; opacity: 0.9;">
        ${scoreData.totalScore >= 85 ? '⭐⭐⭐⭐⭐ Excellent Connectivity' : 
          scoreData.totalScore >= 70 ? '⭐⭐⭐⭐⭐ Very Good Connectivity' : 
          scoreData.totalScore >= 55 ? '⭐⭐⭐⭐ Good Connectivity' : 
          scoreData.totalScore >= 40 ? '⭐⭐⭐ Fair Connectivity' : 
          scoreData.totalScore >= 25 ? '⭐⭐ Poor Connectivity' : 
          scoreData.totalScore >= 10 ? '⭐ Very Poor Connectivity' : '☆ Extremely Poor Connectivity'}
      </div>
    `);
  
  // Detailed breakdown
  const breakdownContainer = detailsPanel.append("div")
    .style("display", "grid")
    .style("grid-template-columns", "1fr 1fr")
    .style("gap", "15px");
  
  // Transportation metrics
  const transportMetrics = [
    { icon: "🚇", label: "MRT Access", score: scoreData.mrtScore, count: scoreData.mrtStations, unit: "stations", weight: "35%" },
    { icon: "🚌", label: "Bus Access", score: scoreData.busScore, count: scoreData.busStops, unit: "stops", weight: "30%" },
    { icon: "🅿️", label: "Parking", score: scoreData.carparkScore, count: scoreData.carparks, unit: "carparks", weight: "20%" },
    { icon: "🚕", label: "Taxi Access", score: scoreData.taxiScore, count: scoreData.taxis, unit: "available", weight: "15%" }
  ];
  
  transportMetrics.forEach(metric => {
    const metricDiv = breakdownContainer.append("div")
      .style("background", "#2c3e50")
      .style("padding", "15px")
      .style("border-radius", "8px")
      .style("border-left", `4px solid ${getConnectivityColor(metric.score)}`);
    
    metricDiv.html(`
      <div style="color: #ecf0f1; font-weight: bold; margin-bottom: 8px;">
        ${metric.icon} ${metric.label} <span style="font-size: 0.8rem; color: #bdc3c7;">(${metric.weight})</span>
      </div>
      <div style="background: linear-gradient(90deg, ${getConnectivityColor(metric.score)} 0%, ${getConnectivityColor(metric.score)} ${metric.score}%, #34495e ${metric.score}%, #34495e 100%); 
                  height: 12px; border-radius: 6px; margin: 8px 0; position: relative;">
        <span style="position: absolute; right: 5px; top: -2px; font-size: 10px; color: white; font-weight: bold;">
          ${metric.score}/100
        </span>
      </div>
      <div style="color: #bdc3c7; font-size: 0.85rem;">
        ${metric.count} ${metric.unit} within 2km radius
      </div>
    `);
  });
  
  // Population and area info
  detailsPanel.append("div")
    .style("margin-top", "15px")
    .style("padding", "12px")
    .style("background", "#34495e")
    .style("border-radius", "6px")
    .style("color", "#ecf0f1")
    .html(`
      <strong>📊 Area Statistics:</strong><br>
      Population: ${scoreData.population.toLocaleString()} residents<br>
      Density: ${Math.round(scoreData.population / 4)} people/km² (estimated)<br>
      Coordinates: ${PLANNING_AREAS[areaName].center[0].toFixed(4)}, ${PLANNING_AREAS[areaName].center[1].toFixed(4)}
    `);
}

// Function to clear area selection
function clearAreaSelection() {
  if (mapLayers.highlightedPolygon && selectedArea) {
    // Reset polygon style
    mapLayers.highlightedPolygon.setStyle({
      weight: 2,
      fillOpacity: 0.7,
      color: '#ffffff'
    });
  }
  
  selectedArea = null;
  mapLayers.highlightedPolygon = null;
  
  // Remove details panel
  d3.select("#area-details").remove();
  
  // Reset map view
  connectivityMap.setView([1.3521, 103.8198], 11, { animate: true });
  
  console.log('Area selection cleared');
}

// Display connectivity scores on map
async function displayConnectivityScores() {
  try {
    const scores = await calculateConnectivityScores();
    connectivityScores = scores;
    
    // Clear existing layers - connectivityAreas layer no longer needed
    // Circle markers removed - functionality transferred to polygon popups
    
    // Create planning area polygons with detailed popups
    createPlanningAreaPolygons();
    
    // Update status
    statusDiv
      .style("color", "#27ae60")
      .style("background", "#1a4d3a")
      .text(`✅ Density-based connectivity analysis complete! Analyzed ${Object.keys(scores).length} planning areas. Click any area to highlight.`);
    
    // Display summary statistics
    displaySummaryStats(scores);
    
  } catch (error) {
    console.error('Error displaying connectivity scores:', error);
    statusDiv
      .style("color", "#e74c3c")
      .style("background", "#4d1a1a")
      .text(`❌ Error loading connectivity data: ${error.message}`);
  }
}

// Display summary statistics
function displaySummaryStats(scores) {
  // Remove existing stats if any
  d3.select("#connectivity-stats").remove();
  
  const statsContainer = app3.append("div")
    .attr("id", "connectivity-stats")
    .style("margin-top", "20px")
    .style("display", "grid")
    .style("grid-template-columns", "1fr 1fr 1fr")
    .style("gap", "15px");
  
  // Calculate statistics
  const scoreValues = Object.values(scores).map(s => s.totalScore);
  const avgScore = Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length);
  const maxScore = Math.max(...scoreValues);
  const minScore = Math.min(...scoreValues);
  
  const topArea = Object.entries(scores).find(([name, data]) => data.totalScore === maxScore);
  const bottomArea = Object.entries(scores).find(([name, data]) => data.totalScore === minScore);
  
  // Top performing area
  statsContainer.append("div")
    .style("background", "#1a4d3a")
    .style("padding", "15px")
    .style("border-radius", "8px")
    .style("border", "1px solid #27ae60")
    .html(`
      <h4 style="color: #27ae60; margin: 0 0 10px 0;">🏆 Best Connectivity</h4>
      <div style="color: #eee;">
        <strong>${topArea[0]}</strong><br>
        Score: ${topArea[1].totalScore}/100<br>
        Population: ${topArea[1].population.toLocaleString()}
      </div>
    `);
  
  // Average statistics
  statsContainer.append("div")
    .style("background", "#1a2332")
    .style("padding", "15px")
    .style("border-radius", "8px")
    .style("border", "1px solid #3498db")
    .html(`
      <h4 style="color: #3498db; margin: 0 0 10px 0;">📊 Island Average</h4>
      <div style="color: #eee;">
        <strong>Average Score: ${avgScore}/100</strong><br>
        Range: ${minScore} - ${maxScore}<br>
        Areas Analyzed: ${scoreValues.length}
      </div>
    `);
  
  // Lowest performing area
  statsContainer.append("div")
    .style("background", "#4d1a1a")
    .style("padding", "15px")
    .style("border-radius", "8px")
    .style("border", "1px solid #e74c3c")
    .html(`
      <h4 style="color: #e74c3c; margin: 0 0 10px 0;">⚠️ Needs Improvement</h4>
      <div style="color: #eee;">
        <strong>${bottomArea[0]}</strong><br>
        Score: ${bottomArea[1].totalScore}/100<br>
        Population: ${bottomArea[1].population.toLocaleString()}
      </div>
    `);
}

// Function to display taxi analysis summary
function displayTaxiAnalysisSummary() {
  if (!taxiCountByArea || Object.keys(taxiCountByArea).length === 0) {
    console.log('📊 Taxi Analysis: No taxi data available yet');
    return;
  }
  
  // Calculate statistics
  const totalTaxis = Object.values(taxiCountByArea).reduce((sum, count) => sum + count, 0);
  const areasWithTaxis = Object.values(taxiCountByArea).filter(count => count > 0).length;
  const totalAreas = Object.keys(taxiCountByArea).length;
  
  // Find top 10 areas with most taxis
  const sortedAreas = Object.entries(taxiCountByArea)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10);
    
  // Find areas with no taxis
  const areasWithoutTaxis = Object.entries(taxiCountByArea)
    .filter(([area, count]) => count === 0)
    .map(([area, count]) => area);
  
  console.log('\n🚕 === TAXI DISTRIBUTION ANALYSIS ===');
  console.log(`📊 Total Taxis: ${totalTaxis}`);
  console.log(`🏙️ Areas with Taxis: ${areasWithTaxis}/${totalAreas} (${Math.round(areasWithTaxis/totalAreas*100)}%)`);
  console.log(`📈 Average per Area: ${Math.round(totalTaxis/totalAreas)} taxis`);
  
  console.log('\n🥇 TOP 10 AREAS BY TAXI COUNT:');
  sortedAreas.forEach(([area, count], index) => {
    const population = PLANNING_AREAS[area]?.population || 0;
    const density = population > 0 ? Math.round((count / population) * 10000) : 0;
    console.log(`${index + 1}. ${area}: ${count} taxis (${density} per 10k residents)`);
  });
  
  if (areasWithoutTaxis.length > 0) {
    console.log(`\n❌ AREAS WITH NO TAXIS (${areasWithoutTaxis.length}):`, areasWithoutTaxis.join(', '));
  }
  
  // Update status with summary
  statusDiv.text(`🚕 Analysis: ${totalTaxis} taxis across ${areasWithTaxis} areas. Top: ${sortedAreas[0][0]} (${sortedAreas[0][1]} taxis)`);
  
  console.log('🚕 === END TAXI ANALYSIS ===\n');
}

// Add control buttons
const controlsContainer = app3.append("div")
  .style("margin-top", "20px")
  .style("display", "flex")
  .style("gap", "10px")
  .style("justify-content", "center")
  .style("flex-wrap", "wrap");

// Refresh button
controlsContainer.append("button")
  .text("🔄 Refresh Analysis")
  .style("padding", "12px 24px")
  .style("background", "#3498db")
  .style("color", "#fff")
  .style("border", "none")
  .style("border-radius", "6px")
  .style("cursor", "pointer")
  .style("font-size", "14px")
  .style("font-weight", "bold")
  .on("click", async function() {
    d3.select(this).text("🔄 Refreshing...").property("disabled", true);
    try {
      await displayConnectivityScores();
      displayTaxiAnalysisSummary(); // Add taxi analysis to refresh
      d3.select(this).text("🔄 Refresh Analysis").property("disabled", false);
    } catch (error) {
      d3.select(this).text("❌ Error - Try Again").property("disabled", false);
    }
  });

// Export data button
controlsContainer.append("button")
  .text("⬆️")
  .style("padding", "12px")
  .style("background", "#27ae60")
  .style("color", "#fff")
  .style("border", "none")
  .style("border-radius", "6px")
  .style("cursor", "pointer")
  .style("font-size", "18px")
  .style("font-weight", "bold")
  .style("width", "48px")
  .style("height", "48px")
  .attr("title", "Export Data")
  .on("click", function() {
    if (Object.keys(connectivityScores).length === 0) {
      alert("No data to export. Please run the analysis first.");
      return;
    }
    
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Planning Area,Total Score,Bus Score,MRT Score,Taxi Score,Carpark Score,Population,Bus Stops,MRT Stations,Taxis,Carparks\n" +
      Object.entries(connectivityScores).map(([area, data]) =>
        `${area},${data.totalScore},${data.busScore},${data.mrtScore},${data.taxiScore},${data.carparkScore},${data.population},${data.busStops},${data.mrtStations},${data.taxis},${data.carparks}`
      ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "singapore_connectivity_index.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

// Toggle polygons button
let polygonsVisible = true;
controlsContainer.append("button")
  .text("✏️")
  .style("padding", "12px")
  .style("background", "#9b59b6")
  .style("color", "#fff")
  .style("border", "none")
  .style("border-radius", "6px")
  .style("cursor", "pointer")
  .style("font-size", "18px")
  .style("font-weight", "bold")
  .style("width", "48px")
  .style("height", "48px")
  .attr("title", "Toggle Planning Areas")
  .on("click", function() {
    if (polygonsVisible) {
      if (mapLayers.planningAreaPolygons) {
        connectivityMap.removeLayer(mapLayers.planningAreaPolygons);
      }
      d3.select(this).style("opacity", "0.5").attr("title", "Show Planning Areas");
      polygonsVisible = false;
    } else {
      if (mapLayers.planningAreaPolygons) {
        connectivityMap.addLayer(mapLayers.planningAreaPolygons);
      }
      d3.select(this).style("opacity", "1").attr("title", "Hide Planning Areas");
      polygonsVisible = true;
    }
  });

// Bus stops toggle button
let busStopsVisible = false; // Bus stops are hidden by default
controlsContainer.append("button")
  .text("🚌")
  .style("padding", "12px")
  .style("background", "#3498db")
  .style("color", "#fff")
  .style("border", "none")
  .style("border-radius", "6px")
  .style("cursor", "pointer")
  .style("font-size", "18px")
  .style("font-weight", "bold")
  .style("width", "48px")
  .style("height", "48px")
  .style("opacity", "0.5")
  .attr("title", "Show Bus Stops")
  .on("click", async function() {
    if (busStopsVisible) {
      // Hide bus stops
      if (mapLayers.busStops) {
        connectivityMap.removeLayer(mapLayers.busStops);
      }
      d3.select(this).style("opacity", "0.5").attr("title", "Show Bus Stops");
      busStopsVisible = false;
    } else {
      // Show bus stops
      d3.select(this).text("🔄").property("disabled", true).attr("title", "Loading...");
      try {
        await displayBusStops();
        d3.select(this).text("🚌").style("opacity", "1").property("disabled", false).attr("title", "Hide Bus Stops");
        busStopsVisible = true;
      } catch (error) {
        d3.select(this).text("❌").property("disabled", false).attr("title", "Error - Try Again");
      }
    }
  });

// MRT stations toggle button
let mrtStationsVisible = true; // MRT stations are shown by default
controlsContainer.append("button")
  .text("🚇")
  .style("padding", "12px")
  .style("background", "#9b59b6")
  .style("color", "#fff")
  .style("border", "none")
  .style("border-radius", "6px")
  .style("cursor", "pointer")
  .style("font-size", "18px")
  .style("font-weight", "bold")
  .style("width", "48px")
  .style("height", "48px")
  .attr("title", "Toggle MRT Stations")
  .on("click", async function() {
    if (mrtStationsVisible) {
      // Hide MRT stations
      if (mapLayers.mrtStations) {
        connectivityMap.removeLayer(mapLayers.mrtStations);
      }
      d3.select(this).style("opacity", "0.5").attr("title", "Show MRT Stations");
      mrtStationsVisible = false;
    } else {
      // Show MRT stations
      d3.select(this).text("🔄").property("disabled", true).attr("title", "Loading...");
      try {
        await displayMRTStations();
        d3.select(this).text("🚇").style("opacity", "1").property("disabled", false).attr("title", "Hide MRT Stations");
        mrtStationsVisible = true;
      } catch (error) {
        d3.select(this).text("❌").property("disabled", false).attr("title", "Error - Try Again");
      }
    }
  });

// Taxis toggle button
let taxisVisible = false; // Taxis are hidden by default
controlsContainer.append("button")
  .text("🚕")
  .style("padding", "12px")
  .style("background", "#f39c12")
  .style("color", "#fff")
  .style("border", "none")
  .style("border-radius", "6px")
  .style("cursor", "pointer")
  .style("font-size", "18px")
  .style("font-weight", "bold")
  .style("width", "48px")
  .style("height", "48px")
  .style("opacity", "0.5")
  .attr("title", "Show Taxis")
  .on("click", async function() {
    if (taxisVisible) {
      // Hide taxis
      if (mapLayers.taxiAvailability) {
        connectivityMap.removeLayer(mapLayers.taxiAvailability);
      }
      d3.select(this).style("opacity", "0.5").attr("title", "Show Taxis");
      taxisVisible = false;
    } else {
      // Show taxis
      d3.select(this).text("🔄").property("disabled", true).attr("title", "Loading...");
      try {
        await displayTaxis();
        d3.select(this).text("🚕").style("opacity", "1").property("disabled", false).attr("title", "Hide Taxis");
        taxisVisible = true;
      } catch (error) {
        d3.select(this).text("❌").property("disabled", false).attr("title", "Error - Try Again");
      }
    }
  });

// Carparks toggle button
let carparksVisible = false; // Carparks are hidden by default
controlsContainer.append("button")
  .text("🅿️")
  .style("padding", "12px")
  .style("background", "#2ecc71")
  .style("color", "#fff")
  .style("border", "none")
  .style("border-radius", "6px")
  .style("cursor", "pointer")
  .style("font-size", "18px")
  .style("font-weight", "bold")
  .style("width", "48px")
  .style("height", "48px")
  .style("opacity", "0.5")
  .attr("title", "Show Carparks")
  .on("click", async function() {
    if (carparksVisible) {
      // Hide carparks
      if (mapLayers.carparks) {
        connectivityMap.removeLayer(mapLayers.carparks);
      }
      d3.select(this).style("opacity", "0.5").attr("title", "Show Carparks");
      carparksVisible = false;
    } else {
      // Show carparks
      d3.select(this).text("🔄").property("disabled", true).attr("title", "Loading...");
      try {
        await displayCarparks();
        d3.select(this).text("🅿️").style("opacity", "1").property("disabled", false).attr("title", "Hide Carparks");
        carparksVisible = true;
      } catch (error) {
        d3.select(this).text("❌").property("disabled", false).attr("title", "Error - Try Again");
      }
    }
  });

// reset view button
controlsContainer.append("button")
  .text("✨ Reset View")
  .style("padding", "12px 24px")
  .style("background", "#e67e22")
  .style("color", "#fff")
  .style("border", "none")
  .style("border-radius", "6px")
  .style("cursor", "pointer")
  .style("font-size", "14px")
  .style("font-weight", "bold")
  .on("click", function() {
    clearAreaSelection();
  });

//  methodology information
app3.append("div")
  .style("margin-top", "30px")
  .style("padding", "20px")
  .style("background", "#1a1a2e")
  .style("border-radius", "8px")
  .style("border-left", "4px solid #3498db")
  .html(`
    <h3 style="color: #3498db; margin: 0 0 15px 0;">📋 Methodology</h3>
    <div style="color: #ddd; line-height: 1.6;">
      <p><strong>Connectivity Index Calculation:</strong></p>
      <ul>
        <li><strong>MRT Stations (35%):</strong> Density of MRT stations within each area</li>
        <li><strong>Bus Stops (30%):</strong> Density of bus stops relative to population</li>
        <li><strong>Carparks (20%):</strong> Available parking facilities per capita</li>
        <li><strong>Taxi Availability (15%):</strong> Real-time taxi density in each planning area</li>
      </ul>
      <p><strong>Scoring:</strong> Each component is scored 0-100, then weighted to produce the final connectivity index. 
      Areas with scores 80+ are considered to have excellent connectivity, while scores below 20 indicate areas that need infrastructure improvement.</p>
      
      <p style="margin-top: 15px; font-size: 12px; color: #888;">
        <strong>Data Sources:</strong> Singapore LTA DataMall • Data.gov.sg Transport APIs • URA Master Plan • Population Census
      </p>
    </div>
  `);

// Initialize the connectivity analysis
console.log('🚀 Starting Singapore Transportation Connectivity Index...');

// Make functions globally available for popup buttons
window.highlightPlanningArea = highlightPlanningArea;
window.clearAreaSelection = clearAreaSelection;
window.mapLayers = mapLayers;

// Auto-start the analysis
setTimeout(async () => {
  try {
    // Load planning area polygons first from pa.geojson
    await loadPlanningAreaPolygons();
    // Then start the connectivity analysis
    await displayConnectivityScores();
    // Display MRT stations by default
    await displayMRTStations();
    // Bus stops are hidden by default - user can toggle them on
  } catch (error) {
    console.error('Error during initialization:', error);
  }
}, 1000);

console.log('✅ App3 (Connectivity Index) initialization complete');


// Made with love footer for second map
app3.append("p")
  .style("color", "#c9c9c9ff")
  .style("font-size", "0.75rem")
  .style("margin-top", "20px")
  .style("text-align", "center")
  .style("font-style", "italic")
  .html("Made with ❤️ in NYC for &#127480;&#127468; Singapore");