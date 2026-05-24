// Initialize app2 container (second map)
const app2 = d3.select("#app2")
  .html("")
  .classed("st-viz-card", true);

// Map container for second map
const mapElement2 = app2.append("div")
  .attr("id", "map2")
  .attr("class", "st-viz-map");

// Create second map centered on Singapore
const map2 = L.map(mapElement2.node(), {
  minZoom: 11,
  maxZoom: 16
}).setView([1.3521, 103.8198], 11);

// Google Maps tiles for second map
L.tileLayer("https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
  attribution: "&copy; Google Maps",
  subdomains: ["mt0", "mt1", "mt2", "mt3"],
  maxZoom: 16,
  minZoom: 11,
}).addTo(map2);




// taxi availablity
let taxiMarkers = L.layerGroup(); // Layer group for taxi markers
let heatLayer; // Variable to store heat map layer

// Toolbar wrapper
const taxiToolbar = app2.append("div").attr("class", "st-viz-toolbar");

const markerToggleButton = taxiToolbar.append("button")
  .attr("class", "st-btn")
  .text("Hide taxi points")
  .on("click", () => {
    if (map2.hasLayer(taxiMarkers)) {
      map2.removeLayer(taxiMarkers);
      markerToggleButton.text("Show taxi points");
    } else {
      map2.addLayer(taxiMarkers);
      markerToggleButton.text("Hide taxi points");
    }
  });

const heatMapToggleButton = taxiToolbar.append("button")
  .attr("class", "st-btn st-btn-accent")
  .text("Show taxi heat map")
  .on("click", () => {
    if (!heatLayer) return;

    if (map2.hasLayer(heatLayer)) {
      map2.removeLayer(heatLayer);
      heatMapToggleButton.text("Show heat map");
    } else {
      map2.addLayer(heatLayer);
      heatMapToggleButton.text("Hide heat map");
    }
  });

// Load Leaflet.heat plugin
const heatScript = document.createElement('script');
heatScript.src = 'https://unpkg.com/leaflet.heat/dist/leaflet-heat.js';
document.head.appendChild(heatScript);

heatScript.onload = () => {
  // Fetch taxi data once the heat plugin is loaded
  fetchTaxiData();
  
  // Set up auto-refresh every 30 seconds
  setInterval(fetchTaxiData, 30000); // 30000ms = 30 seconds
};

function fetchTaxiData() {
  fetch('https://api.data.gov.sg/v1/transport/taxi-availability')
    .then(response => response.json())
    .then(data => {
      // Process taxi availability data
      console.log("Taxi Availability Data:", data);
      
      // Extract coordinates from the response
      const taxiCoordinates = data.features[0].geometry.coordinates;

      // Extract additional information
      const timestamp = data.features[0].properties.timestamp || 'N/A';
      const taxiCount = taxiCoordinates.length;
      const status = data.features[0].properties.api_info.status || 'N/A';
      
      // Update the description text with actual data
      updateDescriptionText(taxiCount, status, timestamp);
      
      // Clear previous markers
      taxiMarkers.clearLayers();
      
      // Create array for heat map
      const heatData = [];
      
      // Create a marker for each taxi position
      taxiCoordinates.forEach(coord => {
        // Note: GeoJSON format is [longitude, latitude] but Leaflet uses [latitude, longitude]
        const lat = coord[1];
        const lng = coord[0];
        
        // Add point to heat map data
        heatData.push([lat, lng, 0.5]); // lat, lng, intensity
        
        // ST-navy dot for each taxi
        L.circleMarker([lat, lng], {
          radius: 4,
          fillColor: '#1A3A6C',
          color: '#ffffff',
          weight: 0.8,
          opacity: 1,
          fillOpacity: 0.7
        }).addTo(taxiMarkers);
      });
      
      // Add marker layer to map
      taxiMarkers.addTo(map2);
      
      // Create heat map if the plugin is loaded
      if (window.L.heatLayer) {
        // Remove previous heat layer if it exists
        if (heatLayer) {
          map2.removeLayer(heatLayer);
        }
        
        // Create new heat layer
        heatLayer = L.heatLayer(heatData, {
          radius: 20,
          blur: 15,
          maxZoom: 16,
          gradient: {0.4: 'blue', 0.65: 'lime', 1: 'red'}
        });
        
        // Enable heat map button
        heatMapToggleButton.property("disabled", false);
      }
    })
    .catch(error => {
      console.error("Error fetching taxi availability data:", error);
    });
}




// Add Google Maps Traffic Layer for second map
const addGoogleTrafficLayer2 = () => {
  // Create a global variable for the traffic layer (second map)
  window.trafficLayer2 = null;
  
  // Load Google Maps API script (only if not already loaded)
  if (!window.initGoogleTraffic2) {
    const googleMapsScript = document.createElement('script');
    googleMapsScript.src = 'https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&callback=initGoogleTraffic2';
    googleMapsScript.async = true;
    googleMapsScript.defer = true;
    document.head.appendChild(googleMapsScript);
  }
  
  // Initialize Google Traffic overlay for second map
  window.initGoogleTraffic2 = function() {
    // Create Google Maps traffic tile layer for Leaflet (second map)
    window.trafficLayer2 = L.tileLayer('https://mt1.google.com/vt/lyrs=m@221097413,traffic&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      attribution: '&copy; Google Maps',
      opacity: 0.7
    });
        
    // toggle button
    trafficToggleButton2.text("Show Traffic Data");
    trafficToggleButton2.property("disabled", false);
  };
};

// Add button to toggle traffic layer for second map
const trafficToggleButton2 = taxiToolbar.append("button")
  .attr("class", "st-btn st-btn-ghost")
  .text("Loading traffic data…")
  .property("disabled", true)
  .on("click", () => {
    if (!window.trafficLayer2) return;

    if (map2.hasLayer(window.trafficLayer2)) {
      map2.removeLayer(window.trafficLayer2);
      trafficToggleButton2.text("Show traffic data");
    } else {
      map2.addLayer(window.trafficLayer2);
      trafficToggleButton2.text("Hide traffic data");
    }
  });

// Initialize the traffic layer for second map
addGoogleTrafficLayer2();





// Update the figure-source "Last updated" stamp
function updateDescriptionText(taxiCount, status, timestamp) {
  const stamp = document.getElementById('taxi-last-updated');
  if (stamp) {
    const ts = new Date(timestamp || Date.now()).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    stamp.textContent = `${ts} SGT · ${taxiCount} taxis · ${status}`;
  }
}



