// Initialize app3 container (third map)
const app3 = d3.select("#app3")
  .html("")
  .style("position", "relative")
  .style("margin-top", "20px")    // Add some space from the second map
  .style("padding", "30px")
  .append("div")
  .style("margin", "0 auto")
  .style("padding", "20px")
  .style("border-radius", "10px")
  .style("width", "100%")
  .style("max-width", "900px")
  .style("background", "#0c0c1c")
  .style("box-shadow", "0px 0px 2px hsla(0,0%,0%,0.2)");

// Title for third map
app3.append("h1")
  .style("color", "#eee")
  .style("font-size", "1.2rem")
  .style("margin-bottom", "12px")
  .text("🌤️ Singapore Weather & Environment");

// Map container for third map
const mapElement3 = app3.append("div")
  .attr("id", "map3")  // Changed ID to avoid conflicts
  .style("height", "520px")
  .style("border-radius", "8px");

// Create third map centered on Singapore
const map3 = L.map(mapElement3.node(), {
  minZoom: 11,
  maxZoom: 16
}).setView([1.3521, 103.8198], 11);

// Google Maps tiles for third map
L.tileLayer("https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
  attribution: "&copy; Google Maps",
  subdomains: ["mt0", "mt1", "mt2", "mt3"],
  maxZoom: 16,
  minZoom: 11,
}).addTo(map3);

// Global variables for weather data
let weatherStationsLayer = null;
let airQualityLayer = null;

// Weather Station Data
const fetchWeatherStations = async () => {
  try {
    const response = await fetch('https://api.data.gov.sg/v1/environment/air-temperature');
    const data = await response.json();
    
    weatherStationsLayer = L.layerGroup();
    
    if (data.items && data.items[0] && data.items[0].readings) {
      data.items[0].readings.forEach(reading => {
        // Create weather icon
        const weatherIcon = L.divIcon({
          html: `<div style="background-color: #3498db; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${Math.round(reading.value)}°</div>`,
          className: 'weather-icon',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
          popupAnchor: [0, -12]
        });
        
        // Find station metadata
        const station = data.metadata.stations.find(s => s.id === reading.station_id);
        if (station) {
          const marker = L.marker([station.location.latitude, station.location.longitude], {
            icon: weatherIcon
          });
          
          const popup = `
            <div style="min-width: 200px">
              <b>🌡️ ${station.name}</b>
              <div style="margin: 10px 0;">
                <div style="font-size: 1.2em; color: #3498db; font-weight: bold;">
                  Temperature: ${reading.value}°C
                </div>
              </div>
              <div style="margin-top: 10px; font-size: 0.8em; color: #666;">
                Station ID: ${station.id}<br>
                Last updated: ${new Date().toLocaleTimeString()}
              </div>
            </div>
          `;
          
          marker.bindPopup(popup);
          weatherStationsLayer.addLayer(marker);
        }
      });
    }
    
    map3.addLayer(weatherStationsLayer);
    console.log('Weather stations loaded');
  } catch (error) {
    console.error('Error fetching weather data:', error);
  }
};

// Air Quality Data
const fetchAirQuality = async () => {
  try {
    const response = await fetch('https://api.data.gov.sg/v1/environment/psi');
    const data = await response.json();
    
    airQualityLayer = L.layerGroup();
    
    if (data.items && data.items[0] && data.items[0].readings) {
      const readings = data.items[0].readings;
      
      // Define regions with approximate coordinates
      const regions = {
        'west': { lat: 1.3521, lng: 103.7 },
        'east': { lat: 1.3521, lng: 103.94 },
        'central': { lat: 1.3521, lng: 103.8198 },
        'south': { lat: 1.26, lng: 103.8198 },
        'north': { lat: 1.44, lng: 103.8198 }
      };
      
      Object.keys(regions).forEach(region => {
        if (readings.psi_twenty_four_hourly && readings.psi_twenty_four_hourly[region]) {
          const psiValue = readings.psi_twenty_four_hourly[region];
          
          // Determine color based on PSI value
          let color = '#2ecc71'; // Good (0-50)
          if (psiValue > 100) color = '#e74c3c'; // Unhealthy (101-200)
          else if (psiValue > 50) color = '#f39c12'; // Moderate (51-100)
          
          const airQualityIcon = L.divIcon({
            html: `<div style="background-color: ${color}; color: white; border-radius: 8px; padding: 4px 8px; font-size: 11px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); min-width: 30px; text-align: center;">PSI<br>${psiValue}</div>`,
            className: 'air-quality-icon',
            iconSize: [40, 30],
            iconAnchor: [20, 15],
            popupAnchor: [0, -15]
          });
          
          const marker = L.marker([regions[region].lat, regions[region].lng], {
            icon: airQualityIcon
          });
          
          const getAirQualityStatus = (psi) => {
            if (psi <= 50) return { status: 'Good', color: '#2ecc71' };
            if (psi <= 100) return { status: 'Moderate', color: '#f39c12' };
            if (psi <= 200) return { status: 'Unhealthy', color: '#e74c3c' };
            return { status: 'Hazardous', color: '#8e44ad' };
          };
          
          const aqStatus = getAirQualityStatus(psiValue);
          
          const popup = `
            <div style="min-width: 200px">
              <b>🏭 Air Quality - ${region.charAt(0).toUpperCase() + region.slice(1)}</b>
              <div style="margin: 10px 0;">
                <div style="font-size: 1.2em; color: ${aqStatus.color}; font-weight: bold;">
                  PSI: ${psiValue}
                </div>
                <div style="color: ${aqStatus.color}; font-weight: bold;">
                  Status: ${aqStatus.status}
                </div>
              </div>
              <div style="margin-top: 10px; font-size: 0.8em; color: #666;">
                24-hour PSI reading<br>
                Last updated: ${new Date().toLocaleTimeString()}
              </div>
            </div>
          `;
          
          marker.bindPopup(popup);
          airQualityLayer.addLayer(marker);
        }
      });
    }
    
    console.log('Air quality data loaded');
  } catch (error) {
    console.error('Error fetching air quality data:', error);
  }
};

// Initialize weather and air quality data
(async () => {
  await fetchWeatherStations();
  await fetchAirQuality();
  
  // Update button states
  weatherToggleButton.property("disabled", false);
  weatherToggleButton.text("Hide Weather Stations");
  
  airQualityToggleButton.property("disabled", false);
  airQualityToggleButton.text("Hide Air Quality");
})();

// Button to toggle weather stations
const weatherToggleButton = app3.append("button")
  .text("Loading Weather...")
  .style("margin-top", "20px")
  .style("margin-right", "20px")
  .style("padding", "10px 20px")
  .style("background", "#3498db")
  .style("color", "#fff")
  .style("border", "none")
  .style("border-radius", "5px")
  .style("cursor", "pointer")
  .property("disabled", true)
  .on("click", () => {
    if (!weatherStationsLayer) return;
    
    if (map3.hasLayer(weatherStationsLayer)) {
      map3.removeLayer(weatherStationsLayer);
      weatherToggleButton.text("Show Weather Stations");
    } else {
      map3.addLayer(weatherStationsLayer);
      weatherToggleButton.text("Hide Weather Stations");
    }
  });

// Button to toggle air quality
const airQualityToggleButton = app3.append("button")
  .text("Loading Air Quality...")
  .style("margin-top", "20px")
  .style("padding", "10px 20px")
  .style("background", "#e67e22")
  .style("color", "#fff")
  .style("border", "none")
  .style("border-radius", "5px")
  .style("cursor", "pointer")
  .property("disabled", true)
  .on("click", () => {
    if (!airQualityLayer) return;
    
    if (map3.hasLayer(airQualityLayer)) {
      map3.removeLayer(airQualityLayer);
      airQualityToggleButton.text("Show Air Quality");
    } else {
      map3.addLayer(airQualityLayer);
      airQualityToggleButton.text("Hide Air Quality");
    }
  });

// Refresh weather data function
const refreshWeatherData = async () => {
  try {
    console.log("Refreshing weather data...");
    
    // Clear existing layers
    if (weatherStationsLayer) {
      weatherStationsLayer.clearLayers();
    }
    if (airQualityLayer) {
      airQualityLayer.clearLayers();
    }
    
    // Refetch data
    await fetchWeatherStations();
    await fetchAirQuality();
    
    console.log("Weather data refreshed");
  } catch (error) {
    console.error("Error refreshing weather data:", error);
  }
};

// Set up auto-refresh for weather data every 5 minutes
setInterval(refreshWeatherData, 300000); // 300000ms = 5 minutes

// Information text
app3.append("p")
  .style("color", "#ddd")
  .style("font-size", "0.9rem")
  .style("margin-top", "15px")
  .style("margin-bottom", "10px")
  .html("Monitor Singapore's environmental conditions with real-time temperature readings from weather stations across the island and air quality indices (PSI) by region. Temperature data refreshes every 5 minutes, while air quality readings provide 24-hour PSI values to help you plan outdoor activities.");

// Data refresh status for weather
app3.append("p")
  .style("color", "#888")
  .style("font-size", "0.75rem")
  .style("margin-bottom", "15px")
  .style("font-style", "italic")
  .html("Weather data refreshes every 5 minutes • Air quality shows 24-hour PSI readings");
