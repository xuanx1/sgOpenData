// Initialize app2 container (second map)
const app2 = d3.select("#app2")
  .html("")
  .style("position", "relative")  // Changed from fixed to relative
  .style("margin-top", "20px")    // Add some space from the first map
  .style("padding", "30px")
  .append("div")
  .style("margin", "0 auto")
  .style("padding", "20px")
  .style("border-radius", "10px")
  .style("width", "100%")
  .style("max-width", "900px")
  .style("background", "#0c0c1c")
  .style("box-shadow", "0px 0px 2px hsla(0,0%,0%,0.2)");

// Title for second map
app2.append("h1")
  .style("color", "#eee")
  .style("font-size", "1.2rem")
  .style("margin-bottom", "12px")
  .text("🚕 Where's My Taxi?");

// Map container for second map
const mapElement2 = app2.append("div")
  .attr("id", "map2")  // Changed ID to avoid conflicts
  .style("height", "520px")
  .style("border-radius", "8px");

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

// Add buttons for toggling markers and heatmap
const markerToggleButton = app2.append("button")
  .text("Hide Taxi Points")
  .style("margin-top", "20px")
  .style("padding", "10px 20px")
  .style("background", "#ffd000")
  .style("color", "#745e00ff")
  .style("border", "none")
  .style("border-radius", "5px")
  .style("cursor", "pointer")
  .style("margin-right", "10px")
  .on("click", () => {
    if (map2.hasLayer(taxiMarkers)) {
      map2.removeLayer(taxiMarkers);
      markerToggleButton.text("Show Taxi Points");
    } else {
      map2.addLayer(taxiMarkers);
      markerToggleButton.text("Hide Taxi Points");
    }
  });

const heatMapToggleButton = app2.append("button")
  .text("Show Taxi Heat Map")
  .style("margin-top", "20px")
  .style("padding", "10px 20px")
  .style("background", "#ff7700")
  .style("color", "#fff")
  .style("border", "none")
  .style("border-radius", "5px")
  .style("cursor", "pointer")
  .on("click", () => {
    if (!heatLayer) return;
    
    if (map2.hasLayer(heatLayer)) {
      map2.removeLayer(heatLayer);
      heatMapToggleButton.text("Show Heat Map");
    } else {
      map2.addLayer(heatLayer);
      heatMapToggleButton.text("Hide Heat Map");
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
        
        // Create a circle marker (yellow dot) for each taxi
        L.circleMarker([lat, lng], {
          radius: 4,
          fillColor: '#ffd000ff',
          color: '#000',
          weight: 0.1,
          opacity: 1,
          fillOpacity: 0.5
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
const trafficToggleButton2 = app2.append("button")
  .text("Loading Traffic Data...")
  .style("margin-top", "20px")
  .style("margin-left", "10px")
  .style("padding", "10px 20px")
  .style("background", "#00be9d")
  .style("color", "#fff")
  .style("border", "none")
  .style("border-radius", "5px")
  .style("cursor", "pointer")
  .property("disabled", true)
  .on("click", () => {
    if (!window.trafficLayer2) return;
    
    if (map2.hasLayer(window.trafficLayer2)) {
      map2.removeLayer(window.trafficLayer2);
      trafficToggleButton2.text("Show Traffic Data");
    } else {
      map2.addLayer(window.trafficLayer2);
      trafficToggleButton2.text("Hide Traffic Data");
    }
  });

// Initialize the traffic layer for second map
addGoogleTrafficLayer2();





// Function to update description text with real data
function updateDescriptionText(taxiCount, status, timestamp) {
  const descriptionElement = document.getElementById('taxi-description');
  if (descriptionElement) {
    const now = new Date();
    const nextUpdate = new Date(now.getTime() + 30000); // 30 seconds from now
    descriptionElement.innerHTML = `This map shows real-time taxi availability across Singapore. Toggle the buttons above to view different visualizations of taxi distribution. Currently displaying <span style='color:#ffd000; font-weight:bold;'>${taxiCount}</span> taxis with the operational status designated as <span style='color:#ffd000; font-weight:bold;'>${status}</span>. Accurate as at <span style='color:#ffd000; font-weight:bold;'>${new Date(timestamp).toLocaleString()}</span>. <br><small style='color:#888;'>Last updated: ${now.toLocaleTimeString()} • Next update: ${nextUpdate.toLocaleTimeString()}</small>`;
  }
}

// description text
app2.append("p")
  .attr("id", "taxi-description")
  .style("color", "#ddd")
  .style("font-size", "0.9rem")
  .style("margin-top", "15px")
  .style("margin-bottom", "15px")
  .style("line-height", "1.5")
  .html("This map shows real-time taxi availability across Singapore. Loading taxi data... Toggle the buttons above to view different visualizations of taxi distribution.");



// Made with love footer for second map
app2.append("p")
  .style("color", "#c9c9c9ff")
  .style("font-size", "0.75rem")
  .style("margin-top", "20px")
  .style("text-align", "center")
  .style("font-style", "italic")
  .html("Made with ❤️ in NYC for &#127480;&#127468; Singapore");