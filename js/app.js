// Initialize app container
const app = d3.select("#app")
  .html("")
  .style("position", "relative")  // Changed from fixed to relative
  .style("padding", "30px")
  .append("div")
  .style("margin", "0 auto")
  .style("padding", "20px")
  .style("border-radius", "10px")
  .style("width", "100%")
  .style("max-width", "900px")
  .style("background", "#0c0c1c")
  .style("box-shadow", "0px 0px 2px hsla(0,0%,0%,0.2)");

// Title
app.append("h1")
  .style("color", "#eee")
  .style("font-size", "1.2rem")
  .style("margin-bottom", "12px")
  .text("🚘 Singapore Parking-Traffic Map");

// Map container
const mapElement = app.append("div")
  .attr("id", "map")
  .style("height", "520px")
  .style("border-radius", "8px");

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
        const address = addressIdx !== -1 ? values[addressIdx]?.trim() : 'Address not available';
        
        if (carParkNo && !isNaN(lat) && !isNaN(lng)) {
          carparkInfo[carParkNo] = { lat, lng, address };
        }
      }
      
      console.log(`Loaded data for ${Object.keys(carparkInfo).length} carparks from CSV`);
    } catch (error) {
      console.error("Error loading carpark data from CSV:", error);
    }
    
    // Load carpark rates
    let carparkRates = {};
    try {
      const rateResponse = await fetch('data/CarparkRates.csv');
      const rateText = await rateResponse.text();
      
      // Parse CSV
      const lines = rateText.split('\n');
      const headers = lines[0].split(',');
      
      // Find indices for the columns we need
      const carParkNoIdx = headers.findIndex(h => h.trim().toLowerCase() === 'car_park_no');
      const weekdaysRate1Idx = headers.findIndex(h => h.trim().toLowerCase() === 'weekdays_rate_1');
      const saturdayRateIdx = headers.findIndex(h => h.trim().toLowerCase() === 'saturday_rate');
      const sundayRateIdx = headers.findIndex(h => h.trim().toLowerCase() === 'sunday_publicholiday_rate');
      
      // Process each line to create mapping
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue; // Skip empty lines
        
        const values = lines[i].split(',');
        const carParkNo = values[carParkNoIdx]?.trim();
        const weekdaysRate1 = values[weekdaysRate1Idx]?.trim() || '-';
        const saturdayRate = values[saturdayRateIdx]?.trim() || '-';
        const sundayRate = values[sundayRateIdx]?.trim() || '-';
        
        if (carParkNo) {
          carparkRates[carParkNo] = { 
            weekdays1: weekdaysRate1 === '-' ? 'N/A' : weekdaysRate1,
            saturday: saturdayRate === '-' ? 'N/A' : saturdayRate,
            sunday: sundayRate === '-' ? 'N/A' : sundayRate
          };
        }
      }
      
      console.log(`Loaded rates for ${Object.keys(carparkRates).length} carparks`);
    } catch (error) {
      console.error("Error loading carpark rates:", error);
    }
    
    // Process carpark data
    const carparks = data.items[0].carpark_data.map(carpark => {
      const carparkInfo_data = carpark.carpark_info[0];
      const info = carparkInfo[carpark.carpark_number] || 
                 { lat: 1.3521 + (Math.random() - 0.5) * 0.1, 
                   lng: 103.8198 + (Math.random() - 0.5) * 0.1,
                   address: 'Address not available' };
      
      const rates = carparkRates[carpark.carpark_number] || 
                  { weekdays: 'N/A', saturday: 'N/A', sunday: 'N/A' };
      
      return {
        name: `Carpark ${carpark.carpark_number}`,
        lat: info.lat,
        lng: info.lng,
        address: info.address,
        lots: parseInt(carparkInfo_data.lots_available) || 0,
        total: parseInt(carparkInfo_data.total_lots) || 0,
        lastUpdated: carpark.update_datetime,
        rates
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

// Create custom garage icon
// Create function to get parking icon based on availability
const getParkingIcon = (availabilityPercent) => {
  // Determine color based on availability percentage
  let color;
  if (availabilityPercent <= 20) {
    color = "#e74c3c"; // Red for low availability
  } else if (availabilityPercent <= 50) {
    color = "#f39c12"; // Yellow for medium availability
  } else {
    color = "#27ae60"; // Green for high availability
  }
  
  return L.divIcon({
    html: `<svg width="10" height="10" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7.20938 0.0931333C7.38323 -0.0310444 7.61677 -0.0310444 7.79062 0.0931333L14.7906 5.09313C14.922 5.18699 15 5.33852 15 5.5V14.5C15 14.7761 14.7761 15 14.5 15H13V7H2V15H0.5C0.223858 15 0 14.7761 0 14.5V5.5C0 5.33852 0.0779828 5.18699 0.209381 5.09313L7.20938 0.0931333Z" fill="${color}"/>
            <path fill-rule="evenodd" clip-rule="evenodd" d="M3 15H12V11H3V15ZM9 13H6V12H9V13Z" fill="${color}"/>
            <path d="M12 10V8H3V10H12Z" fill="${color}"/>
          </svg>`,
    className: 'garage-icon',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28]
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
      const barColor = availabilityPercent <= 20 ? '#e74c3c' : 
                      availabilityPercent <= 50 ? '#f39c12' : '#27ae60';
      
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
              <div><strong>Weekdays 1:</strong> ${cp.rates.weekdays1}</div>
              <div><strong>Saturday:</strong> ${cp.rates.saturday}</div>
              <div><strong>Sun/Holiday:</strong> ${cp.rates.sunday}</div>
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
      if (buttonText === "Hide Carparks") {
        map.addLayer(carparkLayer);
      }
    }
    
    console.log(`Refreshed data for ${carparks.length} carparks`);
    
    // Update status display
    const statusElement = document.getElementById('data-refresh-status');
    if (statusElement) {
      const now = new Date();
      const nextCarparksUpdate = new Date(now.getTime() + 60000);
      statusElement.innerHTML = `Carpark data: Last updated ${now.toLocaleTimeString()} • Next update ${nextCarparksUpdate.toLocaleTimeString()}. Traffic cameras refresh every 2 minutes`;
    }
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
    const barColor = availabilityPercent <= 20 ? '#e74c3c' : 
                    availabilityPercent <= 50 ? '#f39c12' : '#27ae60';
    
    // Create popup with availability info, progress bar, and parking rates
    const popup = `
      <div style="min-width: 220px">
        <b>${cp.name}</b>
        <p style="margin: 5px 0; font-size: 0.9em;">${cp.address}</p>
        <div style="margin: 8px 0;">
          <div style="display: flex; align-items: center; gap: 5px;">
            <div style="flex-grow: 1; background-color: #eee; height: 10px; border-radius: 5px;">
              <div style="width: ${availabilityPercent}%; background-color: ${barColor}; height: 100%; border-radius: 5px;"></div>
            </div>
            <span style="color: ${barColor}; font-weight: bold;">${availabilityPercent}%</span>
          </div>
          <div style="margin-top: 5px;">
            Lots Available: ${cp.lots} / ${cp.total}
          </div>
        </div>
        <div style="margin-top: 8px; border-top: 1px solid #eee; padding-top: 8px;">
          <h4 style="margin: 0 0 5px 0; font-size: 0.9em;">Parking Rates:</h4>
          <table style="width: 100%; font-size: 0.85em;">
            <tr>
              <td style="padding: 2px 0;"><b>Weekdays:</b></td>
              <td style="padding: 2px 0;">${cp.rates.weekdays}</td>
            </tr>
            <tr>
              <td style="padding: 2px 0;"><b>Saturday:</b></td>
              <td style="padding: 2px 0;">${cp.rates.saturday}</td>
            </tr>
            <tr>
              <td style="padding: 2px 0;"><b>Sun/Holiday:</b></td>
              <td style="padding: 2px 0;">${cp.rates.sunday}</td>
            </tr>
          </table>
        </div>
      </div>`;
    
    marker.bindPopup(popup);
    carparkLayer.addLayer(marker);
  }
  map.addLayer(carparkLayer);
  
  // Update the carpark toggle button state
  carparkToggleButton.property("disabled", false);
  carparkToggleButton.text("Hide Carparks");
  
  // Set up auto-refresh for carpark data every 60 seconds
  setInterval(refreshCarparksData, 60000); // 60000ms = 60 seconds
})();

// Add button to toggle carpark layer
const carparkToggleButton = app.append("button")
  .text("Loading Carparks...")
  .style("margin-top", "20px")
  .style("margin-right", "20px")
  .style("padding", "10px 20px")
  .style("background", "#0787ffff")
  .style("color", "#fff")
  .style("border", "none")
  .style("border-radius", "5px")
  .style("cursor", "pointer")
  .property("disabled", true)
  .on("click", () => {
    if (!carparkLayer) return;
    
    if (map.hasLayer(carparkLayer)) {
      map.removeLayer(carparkLayer);
      carparkToggleButton.text("Show Carparks");
    } else {
      map.addLayer(carparkLayer);
      carparkToggleButton.text("Hide Carparks");
    }
  });




// Global variable to store the camera layer
let cameraLayer = null;

// Live Traffic Cameras from LTA
const fetchTrafficCameras = async () => {
  const cameraIcon = L.divIcon({
    html: `<div style="background-color: #ff2424c0; width: 7px; height: 7px; border-radius: 50%; box-shadow: 0 0 0px #000;"></div>`,
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
    const popup = `<div>
      <b>Location:</b> <span id="address-${cam.camera_id}">Loading address...</span><br/><br>
      <small style="color: #666;">Image captured on ${new Date(cam.timestamp).toLocaleString()}</small><br/>
      <img src="${cam.image}" style="width:100%;border-radius:6px;"/>
    </div>`;
    
    // Add event to fetch address when popup opens
    marker.on('popupopen', async function() {
      try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${cam.location.latitude}&lon=${cam.location.longitude}&zoom=18&addressdetails=1&accept-language=en`);
      const data = await response.json();
      const address = data.display_name || "Address not found";
      const addressElement = document.getElementById(`address-${cam.camera_id}`);
      addressElement.style.color = "#e74c3c"; // Grey color
      addressElement.style.fontWeight = "normal"; // Ensure text is not bold
      addressElement.innerText = address;
      } catch (error) {
      const addressElement = document.getElementById(`address-${cam.camera_id}`);
      addressElement.style.color = "#999"; // Grey color
      addressElement.style.fontWeight = "normal"; // Ensure text is not bold
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
const toggleButton = app.append("button")
  .text("Hide Traffic Cameras")
  .style("margin-top", "20px")
  .style("padding", "10px 20px")
  .style("background", "#e74c3c")
  .style("color", "#fff")
  .style("border", "none")
  .style("border-radius", "5px")
  .style("cursor", "pointer")
  .on("click", () => {
    if (cameraLayer && map.hasLayer(cameraLayer)) {
      map.removeLayer(cameraLayer);
      toggleButton.text("Show Traffic Cameras");
    } else {
      if (!cameraLayer) {
        fetchTrafficCameras();
      } else {
        map.addLayer(cameraLayer);
      }
      toggleButton.text("Hide Traffic Cameras");
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
    trafficToggleButton.text("Hide Traffic");
    trafficToggleButton.property("disabled", false);
    
  };
};

// Add button to toggle traffic layer
const trafficToggleButton = app.append("button")
  .text("Loading Traffic Data...")
  .style("margin-top", "20px")
  .style("margin-left", "20px")
  .style("padding", "10px 20px")
  .style("background", "#00be9d")
  .style("color", "#fff")
  .style("border", "none")
  .style("border-radius", "5px")
  .style("cursor", "pointer")
  .property("disabled", true)
  .on("click", () => {
    if (!window.trafficLayer) return;
    
    if (map.hasLayer(window.trafficLayer)) {
      map.removeLayer(window.trafficLayer);
      trafficToggleButton.text("Show Traffic Data");
    } else {
      map.addLayer(window.trafficLayer);
      trafficToggleButton.text("Hide Traffic Data");
    }
  });

// Initialize the traffic layer
addGoogleTrafficLayer();


// Add text below map
// Display the timestamp of the last traffic camera update
const cameraTimestampDisplay = app.append("p")
  .attr("id", "camera-timestamp-display")
  .style("color", "#ddd")
  .style("font-size", "0.9rem")
  .style("margin-top", "15px")
  .style("margin-bottom", "10px")
  .text("Loading traffic camera data...");

// Function to fetch and display the camera timestamp
const fetchCameraTimestamp = async () => {
  try {
    const response = await fetch("https://api.data.gov.sg/v1/transport/traffic-images");
    const data = await response.json();
    if (data && data.items && data.items[0] && data.items[0].cameras && data.items[0].cameras.length > 0) {
      const timestamp = data.items[0].cameras[0].timestamp;
      const formattedTime = new Date(timestamp).toLocaleString();
      cameraTimestampDisplay.html(`Navigate Singapore's urban landscape with this comprehensive traffic and parking tool, providing real-time data on carpark availability, traffic conditions via live cameras, and road congestion levels. Toggle between different information layers using the buttons below to customize your view and make informed travel decisions across the city. Accurate as at <span style="color:#e74c3c;font-weight:bold">${formattedTime}</span>`);
    } else {
      cameraTimestampDisplay.text("No traffic camera data available");
    }
  } catch (error) {
    console.error("Error fetching camera timestamp:", error);
    cameraTimestampDisplay.text("Could not retrieve traffic camera update time");
  }
};

// Fetch the camera timestamp
fetchCameraTimestamp();



// Data refresh status display
const dataRefreshStatus = app.append("p")
  .attr("id", "data-refresh-status")
  .style("color", "#888")
  .style("font-size", "0.75rem")
  .style("margin-bottom", "15px")
  .style("font-style", "italic")
  .html("Carpark data refreshes every 60 seconds • Traffic cameras refresh every 2 minutes");

// // Made with love footer
// app.append("p")
//   .style("color", "#666")
//   .style("font-size", "0.75rem")
//   .style("margin-top", "20px")
//   .style("text-align", "center")
//   .style("font-style", "italic")
//   .html("Made with ❤️ in NYC for &#127480;&#127468; Singapore");