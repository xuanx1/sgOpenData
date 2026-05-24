// Initialize app container (chrome lives in the ST figure wrapper in index.html)
const app = d3.select("#app")
  .html("")
  .classed("st-viz-card", true);

// Map container
const mapElement = app.append("div")
  .attr("id", "map")
  .attr("class", "st-viz-map");

// Create map centered on Singapore
const map = L.map(mapElement.node(), {
  minZoom: 11,
  maxZoom: 16
}).setView([1.3521, 103.8198], 11);

// Google Maps tiles
L.tileLayer("https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
  attribution: "&copy; Google Maps",
  subdomains: ["mt0", "mt1", "mt2", "mt3"],
  maxZoom: 16,
  minZoom: 11,
}).addTo(map);


// Fetch carpark availability data from data.gov.sg and match with local CSV data
const getCarparksData = async () => {
  try {
    // Fetch carpark availability data
    const response = await fetch('https://api.data.gov.sg/v1/transport/carpark-availability');
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
    
    // Note: Using hardcoded rates as they are standardized across HDB carparks
    
    // Process carpark data
    const carparks = data.items[0].carpark_data.map(carpark => {
      const carparkInfo_data = carpark.carpark_info[0];
      const info = carparkInfo[carpark.carpark_number] || (() => {
        // Generate random coordinates near Singapore if not found
        const lat = 1.3521 + (Math.random() - 0.5) * 0.1;
        const lng = 103.8198 + (Math.random() - 0.5) * 0.1;
        
        // Approximate address based on coordinates
        return {
          lat,
          lng,
          address: (() => {
            // Identify Singapore region based on coordinates
            const getSingaporeRegion = (lat, lng) => {
              // Simple region identification based on coordinates
              if (lat > 1.38) return "North";
              if (lat < 1.27) return "South";
              if (lng > 103.9) return "East";
              if (lng < 103.7) return "West";
              
              // Central regions with more detail
              if (lat > 1.34 && lng > 103.85) return "North-East";
              if (lat > 1.34 && lng < 103.85) return "North-West";
              if (lat < 1.34 && lat > 1.29 && lng > 103.85) return "East";
              if (lat < 1.34 && lat > 1.29 && lng < 103.85) return "Central";
              if (lat < 1.29 && lng > 103.85) return "South-East";
              if (lat < 1.29 && lng < 103.85) return "South-West";
              
              return "Central";
            };
            
            return `Location in ${getSingaporeRegion(lat, lng)} Singapore (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
          })()
        };
      })();
      
      // Note: Using hardcoded rates as they are standardized across HDB carparks
      
      return {
        name: `Carpark ${carpark.carpark_number}`,
        lat: info.lat,
        lng: info.lng,
        address: info.address,
        lots: parseInt(carparkInfo_data.lots_available) || 0,
        total: parseInt(carparkInfo_data.total_lots) || 0,
        lastUpdated: carpark.update_datetime
      };
    });
    
    return carparks;
  } catch (error) {
    console.error("Error fetching carpark data:", error);
    return [];
  }
};

// Initialize carparks as empty array, will be populated after API call
let carparks = [];

// Create global variable for carpark layer
let carparkLayer = null;

// Carpark pin: bold square with a 'P' — newspaper data style.
// Fill colour reflects availability (red / amber / green semantics).
const getParkingIcon = (availabilityPercent) => {
  let color, level;
  if (availabilityPercent <= 20) { color = '#B91C1C'; level = 'low'; }
  else if (availabilityPercent <= 50) { color = '#B45309'; level = 'medium'; }
  else { color = '#1F6E3C'; level = 'high'; }

  return L.divIcon({
    html: `<svg width="22" height="26" viewBox="0 0 22 26" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="1" width="20" height="20" rx="2" fill="${color}" stroke="#ffffff" stroke-width="1.5"/>
            <path d="M11 21 L8 25 L14 25 Z" fill="${color}" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round"/>
            <text x="11" y="16" text-anchor="middle" font-family="'Roboto Condensed', 'Arial Narrow', sans-serif" font-size="14" font-weight="700" fill="#ffffff">P</text>
          </svg>`,
    className: `st-carpark-pin st-carpark-pin--${level}`,
    iconSize: [22, 26],
    iconAnchor: [11, 25],
    popupAnchor: [0, -25]
  });
};

// Default parking icon that will be updated in the marker creation loop
const parkingIcon = getParkingIcon(100);

// Function to refresh carpark data
const refreshCarparksData = async () => {
  try {
    console.log("Refreshing carpark data...");
    const updatedCarparks = await getCarparksData();
    
    // Clear existing markers
    if (carparkLayer) {
      carparkLayer.clearLayers();
    }
    
    // Update carparks array
    carparks = updatedCarparks;
    
    // Recreate markers with updated data
    for (const cp of carparks) {
      const availabilityPercent = cp.total > 0 ? Math.round((cp.lots / cp.total) * 100) : 0;
      const marker = L.marker([cp.lat, cp.lng], {
        icon: getParkingIcon(availabilityPercent)
      });
      
      // Determine color based on availability
      const barColor = availabilityPercent <= 20 ? '#B91C1C' :
                      availabilityPercent <= 50 ? '#B45309' : '#1F6E3C';
      
      // Create popup with availability info, progress bar, and parking rates
      const popup = `
        <div style="min-width: 220px">
          <b>${cp.name}</b>
          <p style="margin: 5px 0; font-size: 0.9em;">${cp.address}</p>
          
          <div style="margin: 10px 0;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <span style="font-weight: bold;">Available: ${cp.lots}/${cp.total}</span>
              <span style="font-weight: bold; color: ${barColor};">${availabilityPercent}%</span>
            </div>
            <div style="background: #ddd; border-radius: 3px; height: 8px; overflow: hidden;">
              <div style="background: ${barColor}; height: 100%; width: ${availabilityPercent}%; transition: width 0.3s ease;"></div>
            </div>
          </div>
          
          <div style="margin: 10px 0; padding: 8px; background: #f8f9fa; border-radius: 4px; font-size: 0.85em;">
            <b>Parking Rates:</b><br>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-top: 4px;">
              <div><strong>Motor Car:</strong> 60¢ / 30 min</div>
              <div><strong>Motorcycle:</strong> 20¢ / 60 min</div>
            </div>
          </div>
          
          <div style="margin-top: 10px; font-size: 0.8em; color: #666;">
            Last updated: ${new Date().toLocaleTimeString()}
          </div>
        </div>
      `;
      
      marker.bindPopup(popup);
      carparkLayer.addLayer(marker);
    }
    
    // Re-add layer to map if it was visible
    if (!map.hasLayer(carparkLayer)) {
      // Only add if toggle button shows "Show Carparks" (meaning it's currently hidden)
      const buttonText = carparkToggleButton.text();
      if (buttonText === "Hide carparks") {
        map.addLayer(carparkLayer);
      }
    }
    
    console.log(`Refreshed data for ${carparks.length} carparks`);
    
    // Update the figure-source "Last updated" stamp
    const stamp = document.getElementById('parking-last-updated');
    if (stamp) stamp.textContent = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' SGT';
  } catch (error) {
    console.error("Error refreshing carpark data:", error);
  }
};

// Call the function and populate the carparks array
(async () => {
  carparks = await getCarparksData();
  
  // Carpark marker layer - using normal layerGroup instead of markerClusterGroup
  carparkLayer = L.layerGroup();

  for (const cp of carparks) {
    const availabilityPercent = cp.total > 0 ? Math.round((cp.lots / cp.total) * 100) : 0;
    const marker = L.marker([cp.lat, cp.lng], {
      icon: getParkingIcon(availabilityPercent)  // Use the function to get appropriate icon color
    });
    
    // Determine color based on availability
    const barColor = availabilityPercent <= 20 ? '#B91C1C' :
                    availabilityPercent <= 50 ? '#B45309' : '#1F6E3C';
    
    // Create popup with availability info, progress bar, and parking rates
    const popup = `
      <div class="st-popup">
        <div class="st-popup-eyebrow">Carpark</div>
        <div class="st-popup-title">${cp.name}</div>
        <p class="st-popup-meta">${cp.address}</p>
        <div class="st-popup-bar">
          <div class="st-popup-bar-track">
            <div class="st-popup-bar-fill" style="width:${availabilityPercent}%;background:${barColor};"></div>
          </div>
          <span class="st-popup-bar-value" style="color:${barColor};">${availabilityPercent}%</span>
        </div>
        <div class="st-popup-meta">Lots available: ${cp.lots} / ${cp.total}</div>
        <div class="st-popup-section">
          <div class="st-popup-section-label">Parking rates · Motor car</div>
          <table class="st-popup-table">
            <tr><td>Weekdays</td><td>60¢ / 30 min</td></tr>
            <tr><td>Saturday</td><td>60¢ / 30 min</td></tr>
            <tr><td>Sun / Holiday</td><td>60¢ / 30 min</td></tr>
          </table>
          <div class="st-popup-section-label">Motorcycle</div>
          <table class="st-popup-table">
            <tr><td>Weekdays</td><td>20¢ / 60 min</td></tr>
            <tr><td>Saturday</td><td>20¢ / 60 min</td></tr>
            <tr><td>Sun / Holiday</td><td>20¢ / 60 min</td></tr>
          </table>
        </div>
      </div>`;
    
    marker.bindPopup(popup);
    carparkLayer.addLayer(marker);
  }
  map.addLayer(carparkLayer);
  
  // Update the carpark toggle button state
  carparkToggleButton.property("disabled", false);
  carparkToggleButton.text("Hide carparks");
  
  // Set up auto-refresh for carpark data every 60 seconds
  setInterval(refreshCarparksData, 60000); // 60000ms = 60 seconds
})();

// Toolbar wrapper for buttons
const parkingToolbar = app.append("div").attr("class", "st-viz-toolbar");

// Add button to toggle carpark layer
const carparkToggleButton = parkingToolbar.append("button")
  .attr("class", "st-btn")
  .text("Loading carparks…")
  .property("disabled", true)
  .on("click", () => {
    if (!carparkLayer) return;
    
    if (map.hasLayer(carparkLayer)) {
      map.removeLayer(carparkLayer);
      carparkToggleButton.text("Show carparks");
    } else {
      map.addLayer(carparkLayer);
      carparkToggleButton.text("Hide carparks");
    }
  });




// Global variable to store the camera layer
let cameraLayer = null;

// Live Traffic Cameras from LTA
const fetchTrafficCameras = async () => {
  const cameraIcon = L.divIcon({
    html: `<div style="background-color: #1A3A6C; width: 8px; height: 8px; border-radius: 50%; border: 1.5px solid #fff; box-shadow: 0 0 0 1px rgba(26,58,108,0.30);"></div>`,
    className: 'camera-icon',
    iconSize: [10, 10],
    iconAnchor: [5, 5],
    popupAnchor: [0, -5]
  });
  
  const url = "https://api.data.gov.sg/v1/transport/traffic-images";
  const response = await fetch(url);
  const data = await response.json();

  cameraLayer = L.layerGroup();
  data.items[0].cameras.forEach(cam => {
    const marker = L.marker([cam.location.latitude, cam.location.longitude], {icon: cameraIcon});
    const popup = `<div class="st-popup">
      <div class="st-popup-eyebrow">Traffic camera</div>
      <div class="st-popup-title">Camera ${cam.camera_id}</div>
      <p class="st-popup-meta" id="address-${cam.camera_id}">Loading address…</p>
      <img class="st-popup-image" src="${cam.image}" alt="Traffic camera feed"/>
      <p class="st-popup-source">Captured ${new Date(cam.timestamp).toLocaleString()}</p>
    </div>`;
    
    // Add event to fetch address when popup opens
    marker.on('popupopen', async function() {
      try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${cam.location.latitude}&lon=${cam.location.longitude}&zoom=18&addressdetails=1&accept-language=en`);
      const data = await response.json();
      const address = data.display_name || "Address not found";
      const addressElement = document.getElementById(`address-${cam.camera_id}`);
      addressElement.classList.add("is-loaded");
      addressElement.innerText = address;
      } catch (error) {
      const addressElement = document.getElementById(`address-${cam.camera_id}`);
      addressElement.classList.add("is-error");
      addressElement.innerText = "Could not load address";
      console.error("Error fetching address:", error);
      }
    });
    marker.bindPopup(popup);
    cameraLayer.addLayer(marker);
  });
  map.addLayer(cameraLayer);
};

fetchTrafficCameras();

// Set up auto-refresh for traffic cameras every 2 minutes
setInterval(fetchTrafficCameras, 120000); // 120000ms = 2 minutes


//button to toggle traffic cameras
const toggleButton = parkingToolbar.append("button")
  .attr("class", "st-btn st-btn-accent")
  .text("Hide traffic cameras")
  .on("click", () => {
    if (cameraLayer && map.hasLayer(cameraLayer)) {
      map.removeLayer(cameraLayer);
      toggleButton.text("Show traffic cameras");
    } else {
      if (!cameraLayer) {
        fetchTrafficCameras();
      } else {
        map.addLayer(cameraLayer);
      }
      toggleButton.text("Hide traffic cameras");
    }
  });


// Add Google Maps Traffic Layer 
const addGoogleTrafficLayer = () => {
  // Create a global variable for the traffic layer
  window.trafficLayer = null;
  
  // Load Google Maps API script
  const googleMapsScript = document.createElement('script');
  googleMapsScript.src = 'https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&callback=initGoogleTraffic';
  googleMapsScript.async = true;
  googleMapsScript.defer = true;
  document.head.appendChild(googleMapsScript);
  
  // Initialize Google Traffic overlay
  window.initGoogleTraffic = function() {
    // Create Google Maps traffic tile layer for Leaflet
    window.trafficLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=m@221097413,traffic&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      attribution: '&copy; Google Maps',
      opacity: 0.7
    });
    
    
    // toggle button
    trafficToggleButton.text("Show traffic");
    trafficToggleButton.property("disabled", false);

  };
};

// Add button to toggle traffic layer
const trafficToggleButton = parkingToolbar.append("button")
  .attr("class", "st-btn st-btn-ghost")
  .text("Loading traffic data…")
  .property("disabled", true)
  .on("click", () => {
    if (!window.trafficLayer) return;

    if (map.hasLayer(window.trafficLayer)) {
      map.removeLayer(window.trafficLayer);
      trafficToggleButton.text("Show traffic data");
    } else {
      map.addLayer(window.trafficLayer);
      trafficToggleButton.text("Hide traffic data");
    }
  });

// Initialize the traffic layer
addGoogleTrafficLayer();


// Update the figure-source "Last updated" stamp once camera data lands
const fetchCameraTimestamp = async () => {
  try {
    const response = await fetch("https://api.data.gov.sg/v1/transport/traffic-images");
    const data = await response.json();
    if (data?.items?.[0]?.cameras?.length) {
      const formatted = new Date(data.items[0].cameras[0].timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' SGT';
      const stamp = document.getElementById('parking-last-updated');
      if (stamp) stamp.textContent = formatted;
    }
  } catch (error) {
    console.error("Error fetching camera timestamp:", error);
  }
};

(async () => {
  const check = () => {
    if (carparks && carparks.length > 0) fetchCameraTimestamp();
    else setTimeout(check, 1000);
  };
  check();
})();

// // Made with love footer
// app.append("p")
//   .style("color", "#666")
//   .style("font-size", "0.75rem")
//   .style("margin-top", "20px")
//   .style("text-align", "center")
//   .style("font-style", "italic")
//   .html("Made with ❤️ in NYC for &#127480;&#127468; Singapore");