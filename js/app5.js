// Flight Data Visualization for Singapore Airspace
// Real-time visualization of flights entering and leaving Singapore with airspace demarcation

(function() {
    console.log('=== SINGAPORE FLIGHT TRACKER INITIALIZATION ===');
    
    // Add universal CSS styles for app5
    const universalStyles = document.createElement('style');
    universalStyles.textContent = `
        /* Flight tracker specific styles */
        #flight-map5 {
            will-change: transform;
            transform: translateZ(0);
            -webkit-transform: translateZ(0);
        }
        
        .flight-marker {
            will-change: transform, opacity;
            transform: translateZ(0);
            -webkit-transform: translateZ(0);
        }
        
        .flight-path {
            stroke-width: 2;
            opacity: 0.7;
            transition: opacity 0.3s ease;
        }
        
        .flight-path:hover {
            opacity: 1;
            stroke-width: 3;
        }
        
        .airspace-boundary {
            fill: rgba(255, 165, 0, 0.1);
            stroke: #ffa500;
            stroke-width: 2;
            stroke-dasharray: 5,5;
        }
        
        .loading-spinner {
            border: 3px solid rgba(0, 188, 212, 0.3);
            border-top: 3px solid #00bcd4;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .flight-info-popup {
            background: rgba(26, 26, 46, 0.95);
            border: 1px solid rgba(0, 188, 212, 0.5);
            border-radius: 8px;
            padding: 12px;
            color: #ffffff;
            font-size: 0.9rem;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(10px);
        }
        
        /* Override Leaflet popup default styles */
        .leaflet-popup-content-wrapper {
            background: transparent !important;
            border-radius: 8px !important;
            box-shadow: none !important;
        }
        
        .leaflet-popup-content {
            margin: 0 !important;
            background: transparent !important;
        }
        
        .leaflet-popup-tip {
            background: rgba(26, 26, 46, 0.95) !important;
            border: 1px solid rgba(0, 188, 212, 0.5) !important;
            box-shadow: none !important;
        }
        
        .flight-controls {
            background: rgba(26, 26, 46, 0.9);
            border: 1px solid rgba(0, 188, 212, 0.3);
            border-radius: 12px;
            backdrop-filter: blur(10px);
        }
    `;
    document.head.appendChild(universalStyles);

    // Initialize app container with aviation theme
    const app5 = d3.select("#container5")
        .html("")
        .style("position", "relative")
        .style("padding", "0")
        .style("background", "linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)")
        .style("min-height", "100vh")
        .style("overflow", "hidden")
        .append("div")
        .style("position", "relative")
        .style("margin", "0 auto")
        .style("padding", "20px")
        .style("width", "100%")
        .style("max-width", "1400px")
        .style("background", "transparent");

    // Title with aviation styling
    const titleContainer = app5.append("div")
        .style("text-align", "center")
        .style("margin-bottom", "20px")
        .style("position", "relative");

    titleContainer.append("h1")
        .style("color", "#ffffff")
        .style("font-size", "2.5rem")
        .style("font-weight", "300")
        .style("margin", "0")
        .style("text-shadow", "0 0 20px rgba(0, 188, 212, 0.4)")
        .style("letter-spacing", "2px")
        .html("✈️ Singapore Flight Tracker");

    titleContainer.append("p")
        .style("color", "#8892b0")
        .style("font-size", "1.1rem")
        .style("margin", "10px 0 0 0")
        .style("font-weight", "300")
        .text("Real-time visualization of flights entering and leaving Singapore airspace");

    // Controls container
    const controlsContainer5 = app5.append("div")
        .attr("class", "flight-controls")
        .style("position", "relative")
        .style("z-index", "10")
        .style("margin-bottom", "20px")
        .style("padding", "20px")
        .style("display", "flex")
        .style("flex-wrap", "wrap")
        .style("gap", "15px")
        .style("align-items", "center");

    // Flight type filter
    const flightTypeGroup = controlsContainer5.append("div")
        .style("display", "flex")
        .style("align-items", "center")
        .style("gap", "8px");

    flightTypeGroup.append("label")
        .style("color", "#00bcd4")
        .style("font-size", "0.9rem")
        .style("font-weight", "500")
        .text("Flight Type:");

    const flightTypeSelect = flightTypeGroup.append("select")
        .attr("id", "flight-type-filter")
        .style("padding", "8px 12px")
        .style("border-radius", "20px")
        .style("border", "1px solid rgba(0, 188, 212, 0.3)")
        .style("background", "rgba(26, 26, 46, 0.9)")
        .style("color", "#00bcd4")
        .style("font-size", "0.85rem")
        .style("cursor", "pointer");

    // Airline filter
    const airlineGroup = controlsContainer5.append("div")
        .style("display", "flex")
        .style("align-items", "center")
        .style("gap", "8px");

    airlineGroup.append("label")
        .style("color", "#00bcd4")
        .style("font-size", "0.9rem")
        .style("font-weight", "500")
        .text("Airline:");

    const airlineSelect = airlineGroup.append("select")
        .attr("id", "airline-filter")
        .style("padding", "8px 12px")
        .style("border-radius", "20px")
        .style("border", "1px solid rgba(0, 188, 212, 0.3)")
        .style("background", "rgba(26, 26, 46, 0.9)")
        .style("color", "#00bcd4")
        .style("font-size", "0.85rem")
        .style("cursor", "pointer");

    // API status indicator
    const apiStatusIndicator = controlsContainer5.append("div")
        .attr("id", "api-status")
        .style("display", "flex")
        .style("align-items", "center")
        .style("gap", "8px")
        .style("padding", "8px 12px")
        .style("border-radius", "20px")
        .style("border", "1px solid rgba(0, 188, 212, 0.3)")
        .style("background", "rgba(26, 26, 46, 0.9)")
        .style("font-size", "0.85rem");

    apiStatusIndicator.append("span")
        .attr("id", "status-indicator")
        .style("width", "8px")
        .style("height", "8px")
        .style("border-radius", "50%")
        .style("background", "#8892b0");

    apiStatusIndicator.append("span")
        .attr("id", "status-text")
        .style("color", "#8892b0")
        .text("Initializing...");

    // Update API status
    const updateApiStatus = (status, message) => {
        const colors = {
            'live': '#4CAF50',  // Back to green
            'sample': '#FF9800', 
            'error': '#ff4757',
            'loading': '#00bcd4'
        };
        
        d3.select('#status-indicator')
            .style('background', colors[status] || '#8892b0');
            
        d3.select('#status-text')
            .style('color', colors[status] || '#8892b0')
            .text(message);
    };

    // Map container
    const mapContainer = app5.append("div")
        .attr("id", "flight-map5")
        .style("height", "600px")
        .style("position", "relative")
        .style("z-index", "5")
        .style("border-radius", "20px")
        .style("border", "1px solid rgba(0, 188, 212, 0.3)")
        .style("overflow", "hidden")
        .style("background", "#1a1a2e");

    // Flight statistics panel
    const statsContainer = app5.append("div")
        .attr("id", "flight-stats")
        .style("position", "relative")
        .style("z-index", "10")
        .style("margin-top", "20px")
        .style("padding", "20px")
        .style("background", "rgba(26, 26, 46, 0.8)")
        .style("border", "1px solid rgba(0, 188, 212, 0.3)")
        .style("border-radius", "15px")
        .style("backdrop-filter", "blur(10px)")
        .style("color", "#ffffff");

    // Flight details panel (initially hidden)
    const detailsPanel = app5.append("div")
        .attr("id", "flight-details")
        .style("position", "relative")
        .style("z-index", "10")
        .style("margin-top", "20px")
        .style("padding", "20px")
        .style("background", "rgba(26, 26, 46, 0.8)")
        .style("border", "1px solid rgba(0, 188, 212, 0.3)")
        .style("border-radius", "15px")
        .style("backdrop-filter", "blur(10px)")
        .style("color", "#ffffff")
        .style("display", "none");

    // Global variables
    let map, flightData = [], airlineData = new Set();
    let currentFilters = { type: 'all', airline: 'all' };
    let flightMarkers = [];
    let updateInterval;
    let isLiveUpdateEnabled = true;
    
    // Status update function - same as news visualization
    const showStatusUpdate = (message) => {
        // Create or update status element
        let statusElement = document.getElementById('news-api-status');
        if (!statusElement) {
            statusElement = document.createElement('div');
            statusElement.id = 'news-api-status';
            statusElement.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(26, 26, 46, 0.95);
                border: 1px solid rgba(100, 255, 218, 0.5);
                border-radius: 8px;
                padding: 10px 15px;
                color: #64ffda;
                font-size: 12px;
                font-family: monospace;
                z-index: 10000;
                backdrop-filter: blur(10px);
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                transition: opacity 0.3s ease;
            `;
            document.body.appendChild(statusElement);
        }
        
        statusElement.textContent = message;
        statusElement.style.opacity = '1';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            statusElement.style.opacity = '0';
        }, 5000);
    };
    
    // Flight API configuration
    const FLIGHT_API = {
        // Primary APIs
        OPENSKY_BASE: 'https://opensky-network.org/api',
        FLIGHTAWARE_BASE: 'https://aeroapi.flightaware.com/aeroapi',
        
        // Additional Aviation APIs
        AIRPLANES_LIVE_BASE: 'https://api.airplanes.live/v2',
        ADSB_FI_BASE: 'https://api.adsb.fi/v2',
        VADSO_BASE: 'https://api.vadso.com/v1',
        
        // Backup/Alternative APIs
        PLANEFINDER_BASE: 'https://planefinder.net/api',
        RADARBOX_BASE: 'https://www.radarbox.com/api',
        
        CORS_PROXY: 'https://api.allorigins.win/raw?url=', // CORS proxy for API access
        CORS_PROXY_ALT: 'https://corsproxy.io/?', // Alternative CORS proxy
        CORS_PROXY_ALT2: 'https://api.codetabs.com/v1/proxy?quest=', // Another alternative
        
        SINGAPORE_BOUNDS: {
            lat_min: 0.8,
            lat_max: 2.0,
            lon_min: 102.8,
            lon_max: 104.7
        },
        CHANGI_VICINITY: {
            lat: 1.3644,
            lon: 103.9915,
            radius: 0.8 // degrees (~90km) - increased for better coverage
        },
        
        // API Keys (normally these would be in environment variables)
        API_KEYS: {
            flightaware: 'demo',   // Replace with actual key - free tier: 100 req/month
            rapidapi: 'demo'       // Replace with actual RapidAPI key
        }
    };
    
    // Cache for API calls to avoid rate limiting
    let apiCache = {
        lastUpdate: 0,
        data: [],
        updateInterval: 30000 // 30 seconds
    };

    // Singapore coordinates and airspace definition
    const SINGAPORE_CENTER = [1.3521, 103.8198];
    const CHANGI_AIRPORT = [1.3644, 103.9915];
    const SELETAR_AIRPORT = [1.4169, 103.8679];

    // Singapore Flight Information Region (FIR) boundaries (approximate)
    const SINGAPORE_FIR = [
        [1.0, 103.0],
        [1.8, 103.0],
        [1.8, 104.5],
        [1.0, 104.5],
        [1.0, 103.0]
    ];

    // Singapore Terminal Control Area (TCA) boundaries (approximate)
    const SINGAPORE_TCA = [
        [1.1, 103.4],
        [1.6, 103.4],
        [1.6, 104.2],
        [1.1, 104.2],
        [1.1, 103.4]
    ];

    // Control Traffic Region (CTR) around Changi Airport
    const CHANGI_CTR = [
        [1.25, 103.85],
        [1.45, 103.85],
        [1.45, 104.15],
        [1.25, 104.15],
        [1.25, 103.85]
    ];

    // Air traffic corridors (simplified)
    const TRAFFIC_CORRIDORS = [
        {
            name: "North Corridor",
            path: [[1.8, 103.8], [1.6, 103.9], [1.4, 104.0]],
            direction: "Inbound from North Asia"
        },
        {
            name: "South Corridor", 
            path: [[1.0, 103.8], [1.2, 103.9], [1.35, 104.0]],
            direction: "Inbound from Australia/Indonesia"
        },
        {
            name: "West Corridor",
            path: [[1.35, 103.0], [1.35, 103.5], [1.35, 103.9]],
            direction: "Inbound from Europe/Middle East/India"
        }
    ];

    // Initialize Leaflet map
    const initializeMap = () => {
        console.log('Initializing Leaflet map...');
        
        // Create map centered on Singapore
        map = L.map('flight-map5', {
            center: SINGAPORE_CENTER,
            zoom: 10,
            zoomControl: true,
            scrollWheelZoom: true
        });

        // Add dark tile layer for aviation theme
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(map);

        // Add Singapore FIR boundary
        const firPolygon = L.polygon(SINGAPORE_FIR, {
            color: '#ffa500',
            weight: 2,
            opacity: 0.8,
            fillColor: '#ffa500',
            fillOpacity: 0.1,
            dashArray: '10,10'
        }).addTo(map);

        firPolygon.bindPopup(`
            <div class="flight-info-popup">
                <strong>Singapore Flight Information Region (FIR)</strong><br>
                Area: ~65,000 sq km<br>
                Altitude: Surface to FL999<br>
                Manages all air traffic in Singapore airspace
            </div>
        `);

        // Add Singapore TCA boundary
        const tcaPolygon = L.polygon(SINGAPORE_TCA, {
            color: '#00bcd4',
            weight: 2,
            opacity: 0.9,
            fillColor: '#00bcd4',
            fillOpacity: 0.15,
            dashArray: '5,5'
        }).addTo(map);

        tcaPolygon.bindPopup(`
            <div class="flight-info-popup">
                <strong>Singapore Terminal Control Area (TCA)</strong><br>
                Altitude: Surface to FL195<br>
                High-density airspace around major airports<br>
                Strict air traffic control
            </div>
        `);

        // Add Changi CTR boundary
        const ctrPolygon = L.polygon(CHANGI_CTR, {
            color: '#ff6b6b',
            weight: 2,
            opacity: 0.9,
            fillColor: '#ff6b6b',
            fillOpacity: 0.1,
            dashArray: '3,3'
        }).addTo(map);

        ctrPolygon.bindPopup(`
            <div class="flight-info-popup">
                <strong>Changi Control Traffic Region (CTR)</strong><br>
                Altitude: Surface to 3,000 ft<br>
                Immediate airport control zone<br>
                All aircraft require clearance
            </div>
        `);

        // Add traffic corridors
        TRAFFIC_CORRIDORS.forEach(corridor => {
            const corridorLine = L.polyline(corridor.path, {
                color: '#9C27B0',
                weight: 3,
                opacity: 0.6,
                dashArray: '15,10'
            }).addTo(map);

            corridorLine.bindPopup(`
                <div class="flight-info-popup">
                    <strong>${corridor.name}</strong><br>
                    ${corridor.direction}<br>
                    Standard arrival/departure route
                </div>
            `);
        });

        // Add airspace legend
        const legend = L.control({position: 'bottomleft'});
        legend.onAdd = function (map) {
            const div = L.DomUtil.create('div', 'airspace-legend');
            div.innerHTML = `
                <div style="
                    background: rgba(26, 26, 46, 0.5);
                    padding: 10px;
                    border-radius: 8px;
                    border: 1px solid rgba(0, 188, 212, 0.5);
                    color: white;
                    font-size: 12px;
                    line-height: 1.4;
                    backdrop-filter: blur(10px);
                ">
                    <strong style="color: #00bcd4;">Airspace Zones</strong><br>
                    <span style="color: #ffa500;">━━━</span> Flight Information Region (FIR)<br>
                    <span style="color: #00bcd4;">━━━</span> Terminal Control Area (TCA)<br>
                    <span style="color: #ff6b6b;">━━━</span> Control Traffic Region (CTR)<br>
                    <span style="color: #9C27B0;">━━━</span> Traffic Corridors<br><br>
                    <strong style="color: #00bcd4;">Airports</strong><br>
                    🛬 Changi International<br>
                    🛩️ Seletar Airport
                </div>
            `;
            return div;
        };
        legend.addTo(map);

        // Add airport markers
        const changiMarker = L.marker(CHANGI_AIRPORT, {
            icon: L.divIcon({
                className: 'airport-marker',
                html: '🛬',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            })
        }).addTo(map);

        changiMarker.bindPopup(`
            <div class="flight-info-popup">
                <strong>Singapore Changi Airport (SIN)</strong><br>
                ICAO: WSSS<br>
                Major international hub<br>
                4 terminals, 3 runways
            </div>
        `);

        const seletarMarker = L.marker(SELETAR_AIRPORT, {
            icon: L.divIcon({
                className: 'airport-marker',
                html: '🛩️',
                iconSize: [25, 25],
                iconAnchor: [12, 12]
            })
        }).addTo(map);

        seletarMarker.bindPopup(`
            <div class="flight-info-popup">
                <strong>Seletar Airport (XSP)</strong><br>
                ICAO: WSSL<br>
                General aviation and charter flights<br>
                Single runway
            </div>
        `);

        console.log('Map initialization completed');
    };

    // Fetch real-time flight data from multiple sources
    const fetchRealTimeFlights = async () => {
        console.log('Fetching real-time flight data from multiple sources...');
        
        let allFlights = [];
        const flightIds = new Set(); // To prevent duplicates
        
        try {
            // Check cache first
            const now = Date.now();
            if (now - apiCache.lastUpdate < apiCache.updateInterval && apiCache.data.length > 0) {
                console.log('Using cached flight data');
                return apiCache.data;
            }
            
            // Fetch from multiple sources in parallel
            const apiPromises = [
                fetchFromOpenSky().catch(err => ({ source: 'OpenSky', error: err.message, flights: [] })),
                fetchFromAirplanesLive().catch(err => ({ source: 'Airplanes.live', error: err.message, flights: [] })),
                fetchFromADSBFi().catch(err => ({ source: 'ADSB.fi', error: err.message, flights: [] }))
            ];
            
            const results = await Promise.allSettled(apiPromises);
            
            // Process results from all APIs
            results.forEach((result, index) => {
                const apiNames = ['OpenSky', 'Airplanes.live', 'ADSB.fi'];
                const apiName = apiNames[index];
                
                if (result.status === 'fulfilled' && result.value.flights) {
                    const flights = result.value.flights;
                    console.log(`${apiName}: ${flights.length} flights`);
                    
                    // Add unique flights only
                    flights.forEach(flight => {
                        if (!flightIds.has(flight.id)) {
                            flightIds.add(flight.id);
                            allFlights.push({
                                ...flight,
                                apiSource: apiName
                            });
                        }
                    });
                } else {
                    console.warn(`${apiName} failed:`, result.reason || result.value?.error);
                }
            });
            
            // If we have flights from multiple sources, great!
            if (allFlights.length > 0) {
                console.log(`Successfully loaded ${allFlights.length} flights from multiple sources`);
                
                // Update cache
                apiCache.lastUpdate = now;
                apiCache.data = allFlights;
                
                return allFlights;
            } else {
                console.warn('No real flight data available from any API source - only showing live data when APIs are working');
                return []; // Return empty array instead of simulated data
            }
            
        } catch (error) {
            console.error('Error fetching real-time flight data from all sources:', error);
            throw error;
        }
    };
    
    // Fetch from OpenSky Network API
    const fetchFromOpenSky = async () => {
        console.log('Fetching from OpenSky Network...');
        
        const { lat_min, lat_max, lon_min, lon_max } = FLIGHT_API.SINGAPORE_BOUNDS;
        const apiUrl = `${FLIGHT_API.OPENSKY_BASE}/states/all?lamin=${lat_min}&lomin=${lon_min}&lamax=${lat_max}&lomax=${lon_max}`;
        
        let response;
        try {
            response = await fetch(apiUrl);
        } catch (corsError) {
            console.log('OpenSky: Direct API failed, trying CORS proxy...');
            const proxyUrl = `${FLIGHT_API.CORS_PROXY}${encodeURIComponent(apiUrl)}`;
            response = await fetch(proxyUrl);
        }
        
        if (!response.ok) {
            throw new Error(`OpenSky API response: ${response.status}`);
        }
        
        const data = await response.json();
        if (!data.states || !Array.isArray(data.states)) {
            return { source: 'OpenSky', flights: [] };
        }
        
        const flights = data.states.map(async (state, index) => {
            const [icao24, callsign, origin_country, time_position, last_contact, 
                   longitude, latitude, baro_altitude, on_ground, velocity, 
                   true_track, vertical_rate] = state;
            
            if (longitude === null || latitude === null) return null;
            
            // Try to get route information from OpenSky route API
            let routeData = null;
            if (callsign && callsign.trim()) {
                try {
                    const routeUrl = `${FLIGHT_API.OPENSKY_BASE}/routes?callsign=${callsign.trim()}`;
                    const routeResponse = await fetch(routeUrl);
                    if (routeResponse.ok) {
                        const routes = await routeResponse.json();
                        if (routes && routes.length > 0) {
                            const route = routes[0];
                            routeData = {
                                originIata: route.estDepartureAirport,
                                destinationIata: route.estArrivalAirport,
                                origin: route.estDepartureAirport,
                                destination: route.estArrivalAirport
                            };
                        }
                    }
                } catch (routeError) {
                    console.log(`Route lookup failed for ${callsign}:`, routeError.message);
                }
            }
            
            return await processFlightData({
                id: icao24 || `opensky_${index}`,
                callsign: (callsign || '').trim() || `UNKNWN${index}`,
                country: origin_country || 'Unknown',
                longitude, latitude, baro_altitude, on_ground, velocity, true_track, vertical_rate,
                lastContact: last_contact ? new Date(last_contact * 1000) : new Date(),
                source: 'OpenSky',
                // Include route data if available
                originAirport: routeData?.origin,
                destinationAirport: routeData?.destination,
                originIata: routeData?.originIata,
                destinationIata: routeData?.destinationIata
            });
        });
        
        // Wait for all flight processing to complete
        const resolvedFlights = await Promise.all(flights);
        return { source: 'OpenSky', flights: resolvedFlights.filter(flight => flight !== null) };
    };
    
    // Process flight data from different API sources into a unified format
    const processFlightData = async (rawData) => {
        if (!rawData.longitude || !rawData.latitude) return null;
        
        // Determine if it's arrival or departure based on heading relative to Changi
        const distanceFromChangi = Math.sqrt(
            Math.pow(rawData.latitude - CHANGI_AIRPORT[0], 2) + 
            Math.pow(rawData.longitude - CHANGI_AIRPORT[1], 2)
        );
        
        // Calculate bearing from aircraft to Changi
        const bearingToChangi = Math.atan2(
            CHANGI_AIRPORT[1] - rawData.longitude,
            CHANGI_AIRPORT[0] - rawData.latitude
        ) * 180 / Math.PI;
        
        // Normalize bearing to 0-360
        const normalizedBearingToChangi = (bearingToChangi + 360) % 360;
        
        // Aircraft heading
        const aircraftHeading = rawData.true_track || 0;
        
        // Calculate difference between aircraft heading and bearing to Changi
        let headingDiff = Math.abs(aircraftHeading - normalizedBearingToChangi);
        if (headingDiff > 180) headingDiff = 360 - headingDiff;
        
        // Extract airline code from callsign
        const cleanCallsign = (rawData.callsign || '').trim();
        const airlineCode = cleanCallsign.replace(/[0-9]/g, '').substring(0, 3);
        
        // Determine flight type based on heading direction relative to Changi
        let flightType = 'arrival';
        if (headingDiff < 90) {
            // Heading towards Changi = arrival
            flightType = 'arrival';
        } else {
            // Heading away from Changi = departure
            flightType = 'departure';
        }
        
        // Get airline name
        const airlineName = getAirlineName(airlineCode) || 'Unknown Airline';
        
        // Calculate heading
        const heading = rawData.true_track || 0;
        
        // Get REAL origin/destination from APIs - only use real data
        const routeInfo = await getAirlineRoute(airlineCode, cleanCallsign, flightType, {
            origin: rawData.originAirport,
            destination: rawData.destinationAirport,
            originIata: rawData.originIata,
            destinationIata: rawData.destinationIata
        });
        
        // Only use route info if we got real data, otherwise set up proper movement direction
        let origin, destination, originCoords, destinationCoords;
        
        if (routeInfo) {
            origin = routeInfo.origin;
            destination = routeInfo.destination;
            originCoords = routeInfo.originCoords;
            destinationCoords = routeInfo.destinationCoords;
        } else {
            // No real route data available - set up movement based on flight type
            if (flightType === 'arrival') {
                origin = `Flight ${cleanCallsign}`;
                destination = 'Singapore Airspace';
                originCoords = [rawData.latitude, rawData.longitude];
                destinationCoords = CHANGI_AIRPORT;
            } else {
                // Departure - moving away from Changi
                origin = 'Singapore Airspace';
                destination = `Flight ${cleanCallsign}`;
                originCoords = CHANGI_AIRPORT;
                destinationCoords = [rawData.latitude, rawData.longitude];
            }
        }
        
        return {
            id: rawData.id,
            callsign: cleanCallsign || `UNKNWN${Math.floor(Math.random() * 1000)}`,
            airline: airlineCode || 'UNK',
            airlineName: airlineName,
            type: flightType,
            origin: origin,
            destination: destination,
            currentPosition: [rawData.latitude, rawData.longitude],
            originCoords: originCoords,
            destinationCoords: destinationCoords,
            altitude: Math.max(0, rawData.baro_altitude || 0),
            speed: Math.max(0, Math.round((rawData.velocity || 0) * 1.944)), // Convert m/s to knots
            heading: Math.max(0, Math.min(360, Math.round(heading || 0))),
            estimatedTime: new Date(Date.now() + (Math.random() * 4 * 60 * 60 * 1000)),
            aircraftType: getAircraftType(rawData.id) || 'Unknown',
            status: getFlightStatus(rawData.baro_altitude, rawData.velocity, rawData.on_ground) || 'Unknown',
            onGround: rawData.on_ground || false,
            lastContact: rawData.lastContact || new Date(),
            country: rawData.country || 'Unknown',
            verticalRate: rawData.vertical_rate || 0,
            apiSource: rawData.source
        };
    };
    
    // Fetch from Airplanes.live API (free, no API key required)
    const fetchFromAirplanesLive = async () => {
        console.log('Fetching from Airplanes.live...');
        
        try {
            // Airplanes.live provides free ADS-B data
            const { lat_min, lat_max, lon_min, lon_max } = FLIGHT_API.SINGAPORE_BOUNDS;
            const apiUrl = `${FLIGHT_API.AIRPLANES_LIVE_BASE}/point/${(lat_min + lat_max) / 2}/${(lon_min + lon_max) / 2}/50`;
            
            const response = await fetch(`${FLIGHT_API.CORS_PROXY_ALT2}${encodeURIComponent(apiUrl)}`);
            if (!response.ok) throw new Error(`Airplanes.live API: ${response.status}`);
            
            const data = await response.json();
            if (!data.ac || !Array.isArray(data.ac)) {
                return { source: 'Airplanes.live', flights: [] };
            }
            
            const flightPromises = data.ac.map(async (aircraft, index) => {
                if (!aircraft.lat || !aircraft.lon) return null;
                
                return await processFlightData({
                    id: aircraft.hex || `airplaneslive_${index}`,
                    callsign: aircraft.flight || `APL${index}`,
                    country: aircraft.flag || 'Unknown',
                    longitude: aircraft.lon,
                    latitude: aircraft.lat,
                    baro_altitude: aircraft.alt_baro,
                    on_ground: aircraft.alt_baro < 100,
                    velocity: aircraft.gs,
                    true_track: aircraft.track,
                    vertical_rate: aircraft.baro_rate,
                    lastContact: aircraft.seen ? new Date(Date.now() - aircraft.seen * 1000) : new Date(),
                    source: 'Airplanes.live'
                });
            });
            
            const flights = (await Promise.all(flightPromises)).filter(flight => flight !== null);
            
            return { source: 'Airplanes.live', flights };
        } catch (error) {
            console.log('Airplanes.live API unavailable - no fallback data:', error.message);
            // Return empty flights array - no simulated data
            return { source: 'Airplanes.live', flights: [] };
        }
    };
    
    // Fetch from ADSB.fi API (free, no API key required)
    const fetchFromADSBFi = async () => {
        console.log('Fetching from ADSB.fi...');
        
        try {
            // ADSB.fi provides free ADS-B data
            const { lat, lon } = FLIGHT_API.CHANGI_VICINITY;
            const apiUrl = `${FLIGHT_API.ADSB_FI_BASE}/lat/${lat}/lon/${lon}/dist/50`;
            
            const response = await fetch(`${FLIGHT_API.CORS_PROXY}${encodeURIComponent(apiUrl)}`);
            if (!response.ok) throw new Error(`ADSB.fi API: ${response.status}`);
            
            const data = await response.json();
            if (!data.ac || !Array.isArray(data.ac)) {
                return { source: 'ADSB.fi', flights: [] };
            }
            
            const flightPromises = data.ac.map(async (aircraft, index) => {
                if (!aircraft.lat || !aircraft.lon) return null;
                
                return await processFlightData({
                    id: aircraft.hex || `adsbfi_${index}`,
                    callsign: aircraft.flight || `ADF${index}`,
                    country: aircraft.flag || 'Unknown',
                    longitude: aircraft.lon,
                    latitude: aircraft.lat,
                    baro_altitude: aircraft.alt_baro,
                    on_ground: aircraft.alt_baro < 100,
                    velocity: aircraft.gs,
                    true_track: aircraft.track,
                    vertical_rate: aircraft.baro_rate,
                    lastContact: aircraft.seen ? new Date(Date.now() - aircraft.seen * 1000) : new Date(),
                    source: 'ADSB.fi'
                });
            });
            
            const flights = (await Promise.all(flightPromises)).filter(flight => flight !== null);
            
            return { source: 'ADSB.fi', flights };
        } catch (error) {
            console.log('ADSB.fi API unavailable - no fallback data:', error.message);
            // Return empty flights array - no simulated data
            return { source: 'ADSB.fi', flights: [] };
        }
    };

    // Get airport coordinates for major airports - comprehensive database
    const getAirportCoords = (iataCode) => {
        if (!iataCode) return null;
        
        const airports = {
            // Major Asian Hubs
            'SIN': CHANGI_AIRPORT,        // Singapore Changi
            'SGN': [10.8231, 106.6297],   // Ho Chi Minh City (Tan Son Nhat)
            'HAN': [21.0285, 105.8542],   // Hanoi (Noi Bai)
            'DAD': [16.0544, 108.2022],   // Da Nang
            'BKK': [13.6900, 100.7501],   // Bangkok Suvarnabhumi
            'DMK': [13.9126, 100.6067],   // Bangkok Don Mueang
            'KUL': [2.7456, 101.7072],    // Kuala Lumpur
            'CGK': [-6.1256, 106.6559],   // Jakarta Soekarno-Hatta
            'MNL': [14.5086, 120.9114],   // Manila Ninoy Aquino
            'CEB': [10.3157, 123.8854],   // Cebu
            'HKG': [22.3080, 113.9185],   // Hong Kong
            'TPE': [25.0797, 121.2342],   // Taipei Taoyuan
            'PEN': [5.2971, 100.2770],    // Penang International
            'DPS': [-8.7467, 115.1672],   // Denpasar Bali
            
            // Japan
            'NRT': [35.7656, 140.3864],   // Tokyo Narita
            'HND': [35.5494, 139.7798],   // Tokyo Haneda
            'KIX': [34.4348, 135.2440],   // Osaka Kansai
            'ITM': [34.7851, 135.4380],   // Osaka Itami
            
            // South Korea
            'ICN': [37.4602, 126.4407],   // Seoul Incheon
            'GMP': [37.5583, 126.7906],   // Seoul Gimpo
            
            // China
            'PEK': [40.0799, 116.6031],   // Beijing Capital
            'PVG': [31.1988, 121.3397],   // Shanghai Pudong
            'SHA': [31.1988, 121.3397],   // Shanghai
            'CAN': [23.3924, 113.2988],   // Guangzhou
            'SZX': [22.6393, 113.8108],   // Shenzhen
            
            // India
            'BOM': [19.0896, 72.8656],    // Mumbai
            'DEL': [28.5562, 77.1000],    // Delhi
            'MAA': [12.9941, 80.1709],    // Chennai
            'CCU': [22.6542, 88.4479],    // Kolkata
            'BLR': [13.1979, 77.7063],    // Bangalore
            'HYD': [17.2313, 78.4298],    // Hyderabad
            
            // Australia/New Zealand
            'SYD': [-33.9399, 151.1753],  // Sydney Kingsford Smith
            'MEL': [-37.6733, 144.8430],  // Melbourne
            'PER': [-31.9403, 115.9669],  // Perth
            'BNE': [-27.3842, 153.1175],  // Brisbane
            'ADL': [-34.9285, 138.5304],  // Adelaide
            'AKL': [-37.0082, 174.7850],  // Auckland
            'CHC': [-43.4895, 172.5320],  // Christchurch
            
            // Middle East
            'DXB': [25.2532, 55.3657],    // Dubai
            'AUH': [24.4539, 54.6515],    // Abu Dhabi
            'DOH': [25.2732, 51.6080],    // Doha
            'MCT': [23.5933, 58.2844],    // Muscat
            'KWI': [29.2267, 47.9689],    // Kuwait
            'RUH': [24.9576, 46.6984],    // Riyadh
            
            // Europe
            'LHR': [51.4700, -0.4543],    // London Heathrow
            'LGW': [51.1481, -0.1903],    // London Gatwick
            'FRA': [50.0264, 8.5431],     // Frankfurt
            'CDG': [49.0097, 2.5479],     // Paris Charles de Gaulle
            'AMS': [52.3105, 4.7683],     // Amsterdam
            'ZUR': [47.4647, 8.5492],     // Zurich
            'IST': [41.2753, 28.7519],    // Istanbul
            'MUC': [48.3538, 11.7861],    // Munich
            'FCO': [41.8003, 12.2389],    // Rome Fiumicino
            
            // North America
            'JFK': [40.6413, -73.7781],   // New York JFK
            'LAX': [34.0522, -118.2437],  // Los Angeles
            'SFO': [37.6213, -122.3790],  // San Francisco
            'ORD': [41.9742, -87.9073],   // Chicago O'Hare
            'ATL': [33.6407, -84.4277],   // Atlanta
            'YVR': [49.1939, -123.1844],  // Vancouver
            'YYZ': [43.6777, -79.6248],   // Toronto
            
            // Africa
            'CAI': [30.1127, 31.4000],    // Cairo
            'JNB': [-26.1367, 28.2411],   // Johannesburg
            'CPT': [-33.9690, 18.6021],   // Cape Town
            'ADD': [8.9806, 38.7626],     // Addis Ababa
            
            // Others
            'GRU': [-23.4322, -46.4692],  // São Paulo
            'EZE': [-34.8222, -58.5358],  // Buenos Aires
            'SCL': [-33.3928, -70.7858],  // Santiago
            'LIM': [-12.0219, -77.1143]   // Lima
        };
        
        return airports[iataCode.toUpperCase()] || null;
    };
    const getAirlineName = (code) => {
        const airlines = {
            'SQ': 'Singapore Airlines', 'SIA': 'Singapore Airlines',
            'TR': 'Scoot', 'TGW': 'Scoot',
            'MI': 'SilkAir',
            'CX': 'Cathay Pacific', 'CPA': 'Cathay Pacific',
            'TG': 'Thai Airways', 'THA': 'Thai Airways',
            'MH': 'Malaysia Airlines', 'MAS': 'Malaysia Airlines',
            'QF': 'Qantas', 'QFA': 'Qantas',
            'EK': 'Emirates', 'UAE': 'Emirates',
            'LH': 'Lufthansa', 'DLH': 'Lufthansa',
            'BA': 'British Airways', 'BAW': 'British Airways',
            'AF': 'Air France', 'AFR': 'Air France',
            'KL': 'KLM', 'KLM': 'KLM Royal Dutch Airlines',
            'JL': 'Japan Airlines', 'JAL': 'Japan Airlines',
            'NH': 'ANA', 'ANA': 'All Nippon Airways',
            'QR': 'Qatar Airways', 'QTR': 'Qatar Airways',
            'EY': 'Etihad Airways', 'ETD': 'Etihad Airways',
            'AI': 'Air India', 'AIC': 'Air India',
            'SV': 'Saudi Arabian Airlines', 'SVA': 'Saudi Arabian Airlines',
            'TK': 'Turkish Airlines', 'THY': 'Turkish Airlines'
        };
        return airlines[code] || airlines[code.substring(0, 2)] || null;
    };

    // Get route information from flight codes and position analysis
    const getAirlineRoute = async (airlineCode, callsign, flightType, apiData = null) => {
        // For now, we only use real route data if the APIs provide it
        // Most ADS-B APIs (OpenSky, Airplanes.live, ADSB.fi) don't include route info
        // so we'll return null and use generic labels instead of fake data
        return null;
    };

    // Helper function to get airport names from IATA codes
    const getAirportName = (iataCode) => {
        if (!iataCode) return null;
        
        const airports = {
            // Major Asian Hubs
            'SIN': 'Singapore Changi',
            'SGN': 'Ho Chi Minh City',
            'HAN': 'Hanoi',
            'DAD': 'Da Nang',
            'BKK': 'Bangkok Suvarnabhumi',
            'DMK': 'Bangkok Don Mueang',
            'KUL': 'Kuala Lumpur',
            'CGK': 'Jakarta',
            'MNL': 'Manila',
            'CEB': 'Cebu',
            'HKG': 'Hong Kong',
            'TPE': 'Taipei',
            'PEN': 'Penang',
            'DPS': 'Denpasar Bali',
            
            // Japan
            'NRT': 'Tokyo Narita',
            'HND': 'Tokyo Haneda',
            'KIX': 'Osaka Kansai',
            'ITM': 'Osaka Itami',
            
            // South Korea
            'ICN': 'Seoul Incheon',
            'GMP': 'Seoul Gimpo',
            
            // China
            'PEK': 'Beijing Capital',
            'PVG': 'Shanghai Pudong',
            'SHA': 'Shanghai Hongqiao',
            'CAN': 'Guangzhou',
            'SZX': 'Shenzhen',
            
            // India
            'BOM': 'Mumbai',
            'DEL': 'Delhi',
            'MAA': 'Chennai',
            'CCU': 'Kolkata',
            'BLR': 'Bangalore',
            'HYD': 'Hyderabad',
            
            // Australia/New Zealand
            'SYD': 'Sydney',
            'MEL': 'Melbourne',
            'PER': 'Perth',
            'BNE': 'Brisbane',
            'ADL': 'Adelaide',
            'AKL': 'Auckland',
            'CHC': 'Christchurch',
            
            // Middle East
            'DXB': 'Dubai',
            'AUH': 'Abu Dhabi',
            'DOH': 'Doha',
            'MCT': 'Muscat',
            'KWI': 'Kuwait',
            'RUH': 'Riyadh',
            
            // Europe
            'LHR': 'London Heathrow',
            'LGW': 'London Gatwick',
            'FRA': 'Frankfurt',
            'CDG': 'Paris Charles de Gaulle',
            'AMS': 'Amsterdam',
            'ZUR': 'Zurich',
            'IST': 'Istanbul',
            'MUC': 'Munich',
            'FCO': 'Rome Fiumicino',
            
            // North America
            'JFK': 'New York JFK',
            'LAX': 'Los Angeles',
            'SFO': 'San Francisco',
            'ORD': 'Chicago O\'Hare',
            'ATL': 'Atlanta',
            'YVR': 'Vancouver',
            'YYZ': 'Toronto',
            
            // Africa
            'CAI': 'Cairo',
            'JNB': 'Johannesburg',
            'CPT': 'Cape Town',
            'ADD': 'Addis Ababa',
            
            // Others
            'GRU': 'São Paulo',
            'EZE': 'Buenos Aires',
            'SCL': 'Santiago',
            'LIM': 'Lima'
        };
        
        return airports[iataCode.toUpperCase()] || null;
    };

    // Helper function to get airport codes from city names
    const getAirportCode = (cityName) => {
        const cityToCode = {
            'Bangkok': 'BKK',
            'Kuala Lumpur': 'KUL', 
            'Hong Kong': 'HKG',
            'Dubai': 'DXB',
            'Doha': 'DOH',
            'Jakarta': 'CGK',
            'Tokyo': 'NRT',
            'Seoul': 'ICN',
            'Manila': 'MNL',
            'Ho Chi Minh City': 'SGN',
            'Delhi': 'DEL',
            'Mumbai': 'BOM',
            'Sydney': 'SYD',
            'Melbourne': 'MEL',
            'London': 'LHR',
            'Paris': 'CDG',
            'Frankfurt': 'FRA',
            'Amsterdam': 'AMS',
            'Zurich': 'ZUR',
            'Istanbul': 'IST'
        };
        return cityToCode[cityName] || null;
    };







    // Calculate flight progress based on position
    const calculateProgress = (lat, lon, type) => {
        if (!lat || !lon || isNaN(lat) || isNaN(lon)) return 0.5; // Default progress if invalid coordinates
        
        const distanceFromChangi = Math.sqrt(
            Math.pow(lat - CHANGI_AIRPORT[0], 2) + 
            Math.pow(lon - CHANGI_AIRPORT[1], 2)
        );
        
        // Normalize distance to progress (0-1)
        const maxDistance = 2.0; // degrees (~220km)
        return Math.max(0, Math.min(1, 1 - (distanceFromChangi / maxDistance)));
    };
    
    // Get aircraft type (simplified)
    const getAircraftType = (icao24) => {
        // In real implementation, you'd query aircraft database
        const types = ['A320', 'A330', 'A350', 'A380', 'B737', 'B777', 'B787'];
        return types[Math.floor(Math.random() * types.length)];
    };
    
    // Determine flight status
    const getFlightStatus = (altitude, velocity, onGround) => {
        // Add safety checks for undefined/null values
        altitude = altitude || 0;
        velocity = velocity || 0;
        onGround = onGround || false;
        
        if (onGround) return 'On Ground';
        if (altitude < 5000) return 'Approaching';
        if (altitude > 30000 && velocity > 400) return 'En Route';
        if (velocity < 200) return 'Holding';
        return 'Flying';
    };

    // Create flight marker
    const createFlightMarker = (flight) => {
        const isArrival = flight.type === 'arrival';
        const icon = isArrival ? '🛬' : '🛫';
        const color = isArrival ? '#4CAF50' : '#FF9800';  // Back to green for arrivals
        const isRealTime = !!flight.lastContact;
        
        // Add indicator for real-time vs simulated data
        const borderColor = isRealTime ? (isArrival ? '#FF9800' : '#00ff00') : '#ffffff';  // Orange for arrivals, green for departures
        const borderWidth = isRealTime ? '3px' : '2px';

        const marker = L.marker(flight.currentPosition, {
            icon: L.divIcon({
                className: 'flight-marker',
                html: `<div style="
                    background: ${color};
                    color: white;
                    border-radius: 50%;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    border: ${borderWidth} solid ${borderColor};
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    ${isRealTime ? 'animation: pulse 2s infinite;' : ''}
                ">${icon}</div>
                <style>
                    @keyframes pulse {
                        0% { box-shadow: 0 0 0 0 ${isArrival ? 'rgba(255, 152, 0, 0.7)' : 'rgba(0, 255, 0, 0.7)'}; }
                        70% { box-shadow: 0 0 0 8px ${isArrival ? 'rgba(255, 152, 0, 0)' : 'rgba(0, 255, 0, 0)'}; }
                        100% { box-shadow: 0 0 0 0 ${isArrival ? 'rgba(255, 152, 0, 0)' : 'rgba(0, 255, 0, 0)'}; }
                    }
                </style>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            }),
            title: flight.callsign
        });

        // Add flight path
        const pathCoords = [flight.originCoords, flight.destinationCoords];
        const flightPath = L.polyline(pathCoords, {
            color: color,
            weight: 2,
            opacity: isRealTime ? 0.8 : 0.6,
            dashArray: isRealTime ? '3,3' : '5,10'
        });

        const dataSource = isRealTime ? `LIVE - ${flight.apiSource || 'API'}` : 'SIMULATED';
        const lastUpdate = isRealTime ? 
            `Last Contact: ${flight.lastContact.toLocaleTimeString()}` : 
            'Generated Data';

        marker.bindPopup(`
            <div class="flight-info-popup">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <strong>${flight.callsign}</strong>
                    <span style="
                        background: ${isRealTime ? '#4CAF50' : '#FF9800'};
                        color: white;
                        padding: 2px 6px;
                        border-radius: 10px;
                        font-size: 0.7rem;
                        font-weight: bold;
                    ">${dataSource}</span>
                </div>
                <strong>Airline:</strong> ${flight.airlineName}<br>
                <strong>Route:</strong> ${flight.origin} → ${flight.destination}<br>
                <strong>Type:</strong> ${flight.type}<br>
                <strong>Aircraft:</strong> ${flight.aircraftType}<br>
                <strong>Altitude:</strong> ${(flight.altitude || 0).toLocaleString()} ft<br>
                <strong>Speed:</strong> ${flight.speed} kts<br>
                <strong>Heading:</strong> ${flight.heading}°<br>
                <strong>Status:</strong> ${flight.status}<br>
                ${flight.onGround ? '<strong style="color: #FF9800;">On Ground</strong><br>' : ''}
                ${flight.verticalRate ? `<strong>Vertical Rate:</strong> ${flight.verticalRate > 0 ? '↗' : '↘'} ${Math.abs(flight.verticalRate)} ft/min<br>` : ''}
                <strong>Country:</strong> ${flight.country || 'Unknown'}<br>
                <div style="margin-top: 8px; font-size: 0.8rem; color: #8892b0;">
                    ${lastUpdate}<br>
                    Source: ${flight.apiSource || 'Unknown'}
                </div>
            </div>
        `);

        // Add hover tooltip
        marker.bindTooltip(`
            <div style="
                background: rgba(26, 26, 46, 0.9);
                color: #ffffff;
                padding: 8px 12px;
                border-radius: 8px;
                font-size: 0.85rem;
                line-height: 1.4;
                border: 1px solid rgba(0, 188, 212, 0.7);
                backdrop-filter: blur(10px);
            ">
                <strong style="color: #00bcd4;">${flight.callsign}</strong><br>
                <span style="color: #8892b0;">From:</span> ${flight.origin}<br>
                <span style="color: #8892b0;">To:</span> ${flight.destination}
            </div>
        `, {
            permanent: false,
            direction: 'top',
            offset: [0, -10],
            className: 'flight-tooltip'
        });

        marker.on('click', () => {
            showFlightDetails(flight);
        });

        return { marker, path: flightPath };
    };

    // Show detailed flight information
    const showFlightDetails = (flight) => {
        const detailsPanel = d3.select('#flight-details');
        
        detailsPanel.style('display', 'block')
            .html(`
                <h3 style="margin-top: 0; color: #00bcd4; font-weight: 300;">Flight Details: ${flight.callsign}</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div style="padding: 15px; background: rgba(0, 188, 212, 0.1); border-radius: 10px;">
                        <h4 style="color: #00bcd4; margin-top: 0;">Flight Information</h4>
                        <p><strong>Airline:</strong> ${flight.airlineName} (${flight.airline})</p>
                        <p><strong>Aircraft Type:</strong> ${flight.aircraftType}</p>
                        <p><strong>Flight Type:</strong> ${flight.type}</p>
                        <p><strong>Status:</strong> <span style="color: ${flight.status === 'On Time' ? '#4CAF50' : '#FF9800'}">${flight.status}</span></p>
                    </div>
                    <div style="padding: 15px; background: rgba(0, 188, 212, 0.1); border-radius: 10px;">
                        <h4 style="color: #00bcd4; margin-top: 0;">Route Information</h4>
                        <p><strong>Origin:</strong> ${flight.origin}</p>
                        <p><strong>Destination:</strong> ${flight.destination}</p>
                        <p><strong>Progress:</strong> ${(flight.progress * 100).toFixed(1)}%</p>
                        <p><strong>ETA:</strong> ${(flight.estimatedTime || new Date()).toLocaleString()}</p>
                    </div>
                </div>
                <div style="margin-top: 20px; padding: 15px; background: rgba(0, 188, 212, 0.1); border-radius: 10px;">
                    <h4 style="color: #00bcd4; margin-top: 0;">Current Status</h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                        <p><strong>Altitude:</strong> ${(flight.altitude || 0).toLocaleString()} ft</p>
                        <p><strong>Speed:</strong> ${flight.speed} knots</p>
                        <p><strong>Heading:</strong> ${flight.heading}°</p>
                        <p><strong>Position:</strong> ${flight.currentPosition[0].toFixed(4)}°N, ${flight.currentPosition[1].toFixed(4)}°E</p>
                    </div>
                </div>
                <div style="text-align: center; margin-top: 20px;">
                    <button onclick="d3.select('#flight-details').style('display', 'none')" style="
                        padding: 10px 20px;
                        background: rgba(0, 188, 212, 0.2);
                        color: #00bcd4;
                        border: 1px solid #00bcd4;
                        border-radius: 20px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    ">Close Details</button>
                </div>
            `);
    };

    // Update flight positions (simulate movement)
    const updateFlightPositions = () => {
        // Remove artificial movement simulation - positions come from real API data
        // Flight positions are updated when we fetch new data from APIs
        console.log('Flight positions updated from real-time API data');
    };

    // Render flights on map
    const renderFlights = () => {
        // Clear existing markers
        flightMarkers.forEach(item => {
            map.removeLayer(item.marker);
            if (item.path) map.removeLayer(item.path);
        });
        flightMarkers = [];

        // Filter flights based on current filters
        const filteredFlights = flightData.filter(flight => {
            if (currentFilters.type !== 'all' && flight.type !== currentFilters.type) return false;
            if (currentFilters.airline !== 'all' && flight.airline !== currentFilters.airline) return false;
            return true;
        });

        // Add filtered flights to map
        filteredFlights.forEach(flight => {
            const flightMarkerData = createFlightMarker(flight);
            flightMarkerData.marker.addTo(map);
            flightMarkerData.path.addTo(map);
            flightMarkers.push(flightMarkerData);
        });

        updateStatistics(filteredFlights);
    };

    // Update statistics with API source information
    const updateStatistics = (flights) => {
        const arrivals = flights.filter(f => f.type === 'arrival').length;
        const departures = flights.filter(f => f.type === 'departure').length;
        const total = flights.length;
        
        const airlines = new Set(flights.map(f => f.airline)).size;
        const onTime = flights.filter(f => f.status === 'On Time').length;
        const delayed = flights.filter(f => f.status === 'Delayed').length;
        
        // Count flights by API source
        const apiSources = {};
        flights.forEach(f => {
            const source = f.apiSource || 'Unknown';
            apiSources[source] = (apiSources[source] || 0) + 1;
        });
        
        const sourceInfo = Object.entries(apiSources)
            .map(([source, count]) => `${source}: ${count}`)
            .join(' • ');

        d3.select('#flight-stats').html(`
            <h3 style="margin-top: 0; color: #00bcd4; font-weight: 300;">Live Flight Statistics</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-top: 20px;">
                <div style="text-align: center; padding: 15px; background: rgba(0, 188, 212, 0.1); border-radius: 10px;">
                    <div style="font-size: 2rem; color: #4CAF50;">🛬</div>
                    <div style="font-size: 1.5rem; color: #00bcd4; font-weight: 500;">${arrivals}</div>
                    <div style="color: #8892b0;">Arrivals</div>
                </div>
                <div style="text-align: center; padding: 15px; background: rgba(0, 188, 212, 0.1); border-radius: 10px;">
                    <div style="font-size: 2rem; color: #FF9800;">🛫</div>
                    <div style="font-size: 1.5rem; color: #00bcd4; font-weight: 500;">${departures}</div>
                    <div style="color: #8892b0;">Departures</div>
                </div>
                <div style="text-align: center; padding: 15px; background: rgba(0, 188, 212, 0.1); border-radius: 10px;">
                    <div style="font-size: 2rem; color: #00bcd4;">✈️</div>
                    <div style="font-size: 1.5rem; color: #00bcd4; font-weight: 500;">${total}</div>
                    <div style="color: #8892b0;">Total Flights</div>
                </div>
                <div style="text-align: center; padding: 15px; background: rgba(0, 188, 212, 0.1); border-radius: 10px;">
                    <div style="font-size: 2rem; color: #9C27B0;">🏢</div>
                    <div style="font-size: 1.5rem; color: #00bcd4; font-weight: 500;">${airlines}</div>
                    <div style="color: #8892b0;">Airlines</div>
                </div>
            </div>
            <div style="margin-top: 20px; padding: 15px; background: rgba(0, 188, 212, 0.1); border-radius: 10px;">
                <h4 style="color: #00bcd4; margin-top: 0; text-align: center;">Flight Status Distribution</h4>
                <div style="display: flex; justify-content: space-around; text-align: center;">
                    <div>
                        <div style="color: #4CAF50; font-size: 1.2rem; font-weight: 500;">${onTime}</div>
                        <div style="color: #8892b0; font-size: 0.9rem;">On Time</div>
                    </div>
                    <div>
                        <div style="color: #FF9800; font-size: 1.2rem; font-weight: 500;">${delayed}</div>
                        <div style="color: #8892b0; font-size: 0.9rem;">Delayed</div>
                    </div>
                    <div>
                        <div style="color: #2196F3; font-size: 1.2rem; font-weight: 500;">${total - onTime - delayed}</div>
                        <div style="color: #8892b0; font-size: 0.9rem;">Other</div>
                    </div>
                </div>
            </div>
            <div style="margin-top: 15px; padding: 10px; background: rgba(0, 188, 212, 0.05); border-radius: 10px;">
                <div style="color: #00bcd4; font-size: 0.85rem; font-weight: 500; margin-bottom: 5px;">Data Sources:</div>
                <div style="color: #8892b0; font-size: 0.8rem;">${sourceInfo}</div>
            </div>
            <div style="margin-top: 15px; text-align: center; color: #8892b0; font-size: 0.9rem;">
                Last updated: ${new Date().toLocaleTimeString()}
                ${isLiveUpdateEnabled ? ' • Live' : ' • Offline'}
            </div>
        `);
    };

    // Initialize filters
    const initializeFilters = () => {
        // Flight type options
        const typeOptions = ['all', 'arrival', 'departure'];
        flightTypeSelect.selectAll('option')
            .data(typeOptions)
            .enter()
            .append('option')
            .attr('value', d => d)
            .text(d => d === 'all' ? 'All Flights' : d.charAt(0).toUpperCase() + d.slice(1) + 's');

        // Airline options
        const airlineOptions = ['all', ...Array.from(airlineData).sort()];
        airlineSelect.selectAll('option')
            .data(airlineOptions)
            .enter()
            .append('option')
            .attr('value', d => d)
            .text(d => {
                if (d === 'all') return 'All Airlines';
                const airlineName = getAirlineName(d);
                return airlineName ? `${d} - ${airlineName}` : d;
            });

        // Event listeners
        flightTypeSelect.on('change', function() {
            currentFilters.type = this.value;
            renderFlights();
            
            // Show filter status update
            const typeText = this.value === 'all' ? 'all types' : this.value;
            const airlineText = currentFilters.airline === 'all' ? 'all airlines' : currentFilters.airline;
            const filteredCount = flightData.filter(flight => {
                if (currentFilters.type !== 'all' && flight.type !== currentFilters.type) return false;
                if (currentFilters.airline !== 'all' && flight.airline !== currentFilters.airline) return false;
                return true;
            }).length;
            showStatusUpdate(`🔍 Filtered: ${filteredCount} ${typeText} flights from ${airlineText}`);
        });

        airlineSelect.on('change', function() {
            currentFilters.airline = this.value;
            renderFlights();
            
            // Show filter status update
            const typeText = currentFilters.type === 'all' ? 'all types' : currentFilters.type;
            const airlineText = this.value === 'all' ? 'all airlines' : this.value;
            const filteredCount = flightData.filter(flight => {
                if (currentFilters.type !== 'all' && flight.type !== currentFilters.type) return false;
                if (currentFilters.airline !== 'all' && flight.airline !== currentFilters.airline) return false;
                return true;
            }).length;
            showStatusUpdate(`🔍 Filtered: ${filteredCount} ${typeText} flights from ${airlineText}`);
        });
    };

    // Start live updates
    const startLiveUpdates = () => {
        if (updateInterval) clearInterval(updateInterval);
        
        let updateCounter = 0;
        
        updateInterval = setInterval(async () => {
            updateCounter++;
            
            // Refresh real-time data every 15 seconds (7.5 cycles at 2-second intervals)
            if (updateCounter % 8 === 0) {
                console.log('Refreshing real-time flight data...');
                try {
                    const realTimeFlights = await fetchRealTimeFlights();
                    if (realTimeFlights && realTimeFlights.length > 0) {
                        // Update flight positions with fresh API data
                        const existingFlightMap = new Map(flightData.map(f => [f.id, f]));
                        
                        // Update existing flights with new positions or add new flights
                        realTimeFlights.forEach(newFlight => {
                            const existingFlight = existingFlightMap.get(newFlight.id);
                            if (existingFlight) {
                                // Update position and flight data from API
                                existingFlight.currentPosition = newFlight.currentPosition;
                                existingFlight.altitude = newFlight.altitude;
                                existingFlight.speed = newFlight.speed;
                                existingFlight.heading = newFlight.heading;
                                existingFlight.status = newFlight.status;
                                existingFlight.lastContact = newFlight.lastContact;
                                existingFlight.verticalRate = newFlight.verticalRate;
                            }
                        });
                        
                        // Replace with all current flights (removes disappeared flights, adds new ones)
                        flightData = [...realTimeFlights];
                        
                        console.log(`Updated ${realTimeFlights.length} flight positions from real-time APIs`);
                        
                        // Show status update for real-time refresh
                        const newFlights = realTimeFlights.filter(f => !existingFlightMap.has(f.id));
                        if (newFlights.length > 0) {
                            showStatusUpdate(`✈️ ${newFlights.length} New Flights Detected`);
                        } else {
                            showStatusUpdate(`✈️ Flight positions updated (${realTimeFlights.length} flights)`);
                        }
                        
                        // Update airline data
                        realTimeFlights.forEach(flight => {
                            if (flight.airline) {
                                airlineData.add(flight.airline);
                            }
                        });
                        
                        // Re-initialize filters if new airlines appeared
                        if (newFlights.length > 0) {
                            initializeFilters();
                        }
                    }
                } catch (error) {
                    console.warn('Failed to refresh real-time data:', error.message);
                }
            }
            
            // Always re-render to show any updates
            renderFlights();
        }, 2000); // Update every 2 seconds
    };

    // Stop live updates
    const stopLiveUpdates = () => {
        if (updateInterval) {
            clearInterval(updateInterval);
            updateInterval = null;
        }
    };

    // Load flight data
    const loadFlightData = async () => {
        console.log('Loading flight data...');
        
        updateApiStatus('loading', 'Loading...');
        
        // Show loading indicator
        d3.select('#flight-stats').html(`
            <div style="text-align: center; padding: 50px;">
                <div class="loading-spinner"></div>
                <div style="margin-top: 15px; color: #00bcd4;">Loading real-time flight data...</div>
                <div style="margin-top: 5px; color: #8892b0; font-size: 0.8rem;">Fetching from OpenSky Network API</div>
            </div>
        `);

        try {
            // First, try to get real-time flight data
            console.log('Attempting to fetch real-time flight data...');
            const realTimeFlights = await fetchRealTimeFlights();
            
            if (realTimeFlights && realTimeFlights.length > 0) {
                console.log(`Successfully loaded ${realTimeFlights.length} real-time flights`);
                flightData = realTimeFlights;
                updateApiStatus('live', `Live • ${realTimeFlights.length} flights`);
                
                // Show status update
                showStatusUpdate(`✈️ Flight Tracker Updated with ${realTimeFlights.length} Live Flights`);
                
                // Add airlines from real-time data
                realTimeFlights.forEach(flight => {
                    if (flight.airline) {
                        airlineData.add(flight.airline);
                    }
                });
                
            } else {
                throw new Error('No real-time flights available');
            }
            
        } catch (realTimeError) {
            console.warn('Real-time API failed:', realTimeError.message);
            
            updateApiStatus('error', 'API Failed');
            
            // Show API error message
            d3.select('#flight-stats').html(`
                <div style="text-align: center; padding: 50px;">
                    <div style="color: #FF9800; margin-bottom: 15px;">⚠️ Real-time API Unavailable</div>
                    <div style="color: #8892b0; font-size: 0.9rem; margin-bottom: 15px;">
                        ${realTimeError.message}<br>
                        Unable to load live flight data. Please try again later.
                    </div>
                    <button onclick="loadFlightData()" style="
                        padding: 10px 20px;
                        background: rgba(0, 188, 212, 0.2);
                        color: #00bcd4;
                        border: 1px solid #00bcd4;
                        border-radius: 20px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    ">Retry</button>
                </div>
            `);
            
            // Don't load any fallback data - only show live data
            flightData = [];
            return;
        }

        // Initialize filters and render
        initializeFilters();
        renderFlights();
        
        if (isLiveUpdateEnabled) {
            startLiveUpdates();
        }
        
        console.log(`Total flights loaded: ${flightData.length}`);
    };

    // Initialize the application
    const initialize = () => {
        console.log('Initializing Singapore Flight Tracker...');
        
        try {
            initializeMap();
            loadFlightData();
            
            console.log('Singapore Flight Tracker initialized successfully');
        } catch (error) {
            console.error('Error initializing flight tracker:', error);
            d3.select('#flight-stats').html(`
                <div style="text-align: center; padding: 50px; color: #ff4757;">
                    <h3>Error Loading Flight Tracker</h3>
                    <p>Unable to initialize the flight tracking system.</p>
                    <button onclick="location.reload()" style="
                        padding: 10px 20px;
                        background: #ff4757;
                        color: white;
                        border: none;
                        border-radius: 20px;
                        cursor: pointer;
                    ">Retry</button>
                </div>
            `);
        }
    };

    // Clean up when leaving page
    window.addEventListener('beforeunload', () => {
        stopLiveUpdates();
    });

    // Make loadFlightData globally accessible for retry buttons
    window.loadFlightData = loadFlightData;

    // Start the application
    setTimeout(initialize, 500);

})();
