// Flight Data Visualization for Singapore Airspace
// Real-time visualization of flights entering and leaving Singapore with airspace demarcation

(function() {
    console.log('=== SINGAPORE FLIGHT TRACKER INITIALIZATION ===');
    
    // Performance hints only — visual styling lives in global.css
    const universalStyles = document.createElement('style');
    universalStyles.textContent = `
        /* will-change/translateZ removed — it forced an unnecessary
           compositor layer the size of the map that hurt scroll perf */
        #flight-map5 .leaflet-popup-content-wrapper {
            background: #0F1226 !important;
            color: #E6ECF5;
            border: 0 !important;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5) !important;
        }
        #flight-map5 .leaflet-popup-tip {
            background: #0F1226 !important;
            box-shadow: none !important;
        }
        #flight-map5 .leaflet-popup-close-button { color: #B7C0D2 !important; }
        #flight-map5 .leaflet-control-zoom a {
            background: rgba(255,255,255,0.92) !important;
            color: #000 !important;
            border-radius: 0 !important;
            font-family: 'Roboto Condensed', Roboto, sans-serif !important;
            font-weight: 700 !important;
        }
        #flight-map5 .leaflet-control-zoom a:hover {
            background: #fff !important;
            color: var(--st-blue) !important;
        }
    `;
    document.head.appendChild(universalStyles);

    // Initialize app container — chrome lives in ST figure wrapper
    const app5 = d3.select("#container5")
        .html("")
        .classed("st-viz-card", true);

    // Controls container
    const controlsContainer5 = app5.append("div")
        .attr("class", "st-controls flight-controls");

    // Flight type filter
    const flightTypeGroup = controlsContainer5.append("div").attr("class", "st-filter-group");
    flightTypeGroup.append("label").attr("class", "st-filter-label").text("Flight type");
    const flightTypeSelect = flightTypeGroup.append("select")
        .attr("id", "flight-type-filter")
        .attr("class", "st-select");

    // Airline filter
    const airlineGroup = controlsContainer5.append("div").attr("class", "st-filter-group");
    airlineGroup.append("label").attr("class", "st-filter-label").text("Airline");
    const airlineSelect = airlineGroup.append("select")
        .attr("id", "airline-filter")
        .attr("class", "st-select");

    // API status indicator
    const apiStatusIndicator = controlsContainer5.append("div")
        .attr("id", "api-status")
        .attr("class", "st-api-status");

    apiStatusIndicator.append("span")
        .attr("id", "status-indicator")
        .attr("class", "st-api-dot");

    apiStatusIndicator.append("span")
        .attr("id", "status-text")
        .attr("class", "st-api-text")
        .text("Initialising…");

    // Update API status — toggles status class for styling
    const updateApiStatus = (status, message) => {
        const node = document.getElementById('api-status');
        if (node) node.dataset.status = status;
        d3.select('#status-text').text(message);
    };

    // Map container
    const mapContainer = app5.append("div")
        .attr("id", "flight-map5")
        .attr("class", "st-viz-map");

    // Flight statistics panel
    const statsContainer = app5.append("div")
        .attr("id", "flight-stats")
        .attr("class", "st-panel");

    // Flight details panel
    const detailsPanel = app5.append("div")
        .attr("id", "flight-details")
        .attr("class", "st-panel st-panel-light")
        .style("display", "none");

    // Global variables
    let map, flightData = [], airlineData = new Set();
    let currentFilters = { type: 'all', airline: 'all' };
    let flightMarkers = [];
    let updateInterval;
    let isLiveUpdateEnabled = true;
    
    // Toast notification (top-right). Styled by global.css (.st-toast).
    const showStatusUpdate = (message) => {
        let statusElement = document.getElementById('st-toast');
        if (!statusElement) {
            statusElement = document.createElement('div');
            statusElement.id = 'st-toast';
            statusElement.className = 'st-toast';
            document.body.appendChild(statusElement);
        }
        statusElement.textContent = message;
        statusElement.classList.add('is-visible');
        clearTimeout(statusElement._timer);
        statusElement._timer = setTimeout(() => {
            statusElement.classList.remove('is-visible');
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

        // Dark CARTO basemap — newspaper data-viz aesthetic
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a> &middot; &copy; OpenStreetMap contributors',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(map);

        // ST data palette for airspace zones
        const ZONE_COLORS = {
            fir:      '#E8B23A', // ochre — outermost FIR
            tca:      '#3FB6C9', // teal — Terminal Control Area
            ctr:      '#E2503B', // editorial red — immediate airport control
            corridor: '#B488D6'  // lavender — traffic corridors
        };

        // Singapore FIR (outermost)
        const firPolygon = L.polygon(SINGAPORE_FIR, {
            color: ZONE_COLORS.fir,
            weight: 1.5,
            opacity: 0.85,
            fillColor: ZONE_COLORS.fir,
            fillOpacity: 0.04,
            dashArray: '10,8'
        }).addTo(map);

        firPolygon.bindPopup(`
            <div class="st-popup st-popup-dark flight-info-popup">
                <div class="st-popup-eyebrow">Airspace · FIR</div>
                <div class="st-popup-title">Singapore Flight Information Region</div>
                <table class="st-popup-table">
                    <tr><td>Area</td><td>~65,000 sq km</td></tr>
                    <tr><td>Altitude</td><td>Surface to FL999</td></tr>
                    <tr><td>Authority</td><td>Civil Aviation Authority of Singapore</td></tr>
                </table>
                <p class="st-popup-source">Manages all air traffic in Singapore airspace</p>
            </div>
        `);

        // Terminal Control Area
        const tcaPolygon = L.polygon(SINGAPORE_TCA, {
            color: ZONE_COLORS.tca,
            weight: 1.5,
            opacity: 0.9,
            fillColor: ZONE_COLORS.tca,
            fillOpacity: 0.08,
            dashArray: '6,4'
        }).addTo(map);

        tcaPolygon.bindPopup(`
            <div class="st-popup st-popup-dark flight-info-popup">
                <div class="st-popup-eyebrow">Airspace · TCA</div>
                <div class="st-popup-title">Terminal Control Area</div>
                <table class="st-popup-table">
                    <tr><td>Altitude</td><td>Surface to FL195</td></tr>
                    <tr><td>Coverage</td><td>High-density around major airports</td></tr>
                </table>
                <p class="st-popup-source">Strict air-traffic control</p>
            </div>
        `);

        // Changi CTR
        const ctrPolygon = L.polygon(CHANGI_CTR, {
            color: ZONE_COLORS.ctr,
            weight: 1.5,
            opacity: 0.95,
            fillColor: ZONE_COLORS.ctr,
            fillOpacity: 0.08,
            dashArray: '3,3'
        }).addTo(map);

        ctrPolygon.bindPopup(`
            <div class="st-popup st-popup-dark flight-info-popup">
                <div class="st-popup-eyebrow">Airspace · CTR</div>
                <div class="st-popup-title">Changi Control Traffic Region</div>
                <table class="st-popup-table">
                    <tr><td>Altitude</td><td>Surface to 3,000 ft</td></tr>
                    <tr><td>Coverage</td><td>Immediate airport control zone</td></tr>
                </table>
                <p class="st-popup-source">All aircraft require clearance</p>
            </div>
        `);

        // Traffic corridors
        TRAFFIC_CORRIDORS.forEach(corridor => {
            const corridorLine = L.polyline(corridor.path, {
                color: ZONE_COLORS.corridor,
                weight: 2.5,
                opacity: 0.7,
                dashArray: '12,8'
            }).addTo(map);

            corridorLine.bindPopup(`
                <div class="st-popup st-popup-dark flight-info-popup">
                    <div class="st-popup-eyebrow">Traffic corridor</div>
                    <div class="st-popup-title">${corridor.name}</div>
                    <p class="st-popup-meta">${corridor.direction}</p>
                    <p class="st-popup-source">Standard arrival / departure route</p>
                </div>
            `);
        });

        // Add airspace legend
        const legend = L.control({position: 'bottomleft'});
        legend.onAdd = function (map) {
            const div = L.DomUtil.create('div', 'airspace-legend st-legend');
            div.innerHTML = `
                <div class="st-legend-title">Airspace zones</div>
                <div class="st-legend-row"><span class="st-legend-swatch" style="background:${ZONE_COLORS.fir};"></span>Flight information region (FIR)</div>
                <div class="st-legend-row"><span class="st-legend-swatch" style="background:${ZONE_COLORS.tca};"></span>Terminal control area (TCA)</div>
                <div class="st-legend-row"><span class="st-legend-swatch" style="background:${ZONE_COLORS.ctr};"></span>Control traffic region (CTR)</div>
                <div class="st-legend-row"><span class="st-legend-swatch" style="background:${ZONE_COLORS.corridor};"></span>Traffic corridors</div>
                <div class="st-legend-title">Airports</div>
                <div class="st-legend-row"><span class="st-legend-pin"></span>Changi International (SIN)</div>
                <div class="st-legend-row"><span class="st-legend-pin"></span>Seletar (XSP)</div>
            `;
            return div;
        };
        legend.addTo(map);

        // Airport markers — ST text pins
        const makeAirportIcon = (code) => L.divIcon({
            className: 'st-airport-marker',
            html: `<span class="st-airport-pin"></span><span class="st-airport-label">${code}</span>`,
            iconSize: [60, 22],
            iconAnchor: [8, 11]
        });

        const changiMarker = L.marker(CHANGI_AIRPORT, { icon: makeAirportIcon('SIN') }).addTo(map);

        changiMarker.bindPopup(`
            <div class="st-popup st-popup-dark flight-info-popup">
                <div class="st-popup-eyebrow">Airport</div>
                <div class="st-popup-title">Singapore Changi (SIN)</div>
                <table class="st-popup-table">
                    <tr><td>ICAO</td><td>WSSS</td></tr>
                    <tr><td>Type</td><td>Major international hub</td></tr>
                    <tr><td>Facilities</td><td>4 terminals, 3 runways</td></tr>
                </table>
            </div>
        `);

        const seletarMarker = L.marker(SELETAR_AIRPORT, {
            icon: L.divIcon({
                className: 'st-airport-marker',
                html: '<span class="st-airport-pin"></span><span class="st-airport-label">XSP</span>',
                iconSize: [25, 25],
                iconAnchor: [12, 12]
            })
        }).addTo(map);

        seletarMarker.bindPopup(`
            <div class="st-popup st-popup-dark flight-info-popup">
                <div class="st-popup-eyebrow">Airport</div>
                <div class="st-popup-title">Seletar (XSP)</div>
                <table class="st-popup-table">
                    <tr><td>ICAO</td><td>WSSL</td></tr>
                    <tr><td>Type</td><td>General aviation, charter</td></tr>
                    <tr><td>Facilities</td><td>Single runway</td></tr>
                </table>
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

    // Create flight marker — triangle pointing along heading, ST palette
    const createFlightMarker = (flight) => {
        const isArrival = flight.type === 'arrival';
        const isRealTime = !!flight.lastContact;
        // Newspaper data colours: arrival = teal, departure = ochre
        const color = isArrival ? '#3FB6C9' : '#E8B23A';
        const heading = (typeof flight.heading === 'number' ? flight.heading : 0);

        const marker = L.marker(flight.currentPosition, {
            icon: L.divIcon({
                className: `st-flight-marker ${isArrival ? 'is-arrival' : 'is-departure'} ${isRealTime ? 'is-live' : 'is-sim'}`,
                html: `<svg viewBox="0 0 16 16" style="transform:rotate(${heading}deg);"><path d="M8 1 L13 14 L8 11 L3 14 Z" fill="${color}" stroke="rgba(255,255,255,0.9)" stroke-width="0.8" stroke-linejoin="round"/></svg>`,
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            }),
            title: flight.callsign
        });

        // Flight path
        const pathCoords = [flight.originCoords, flight.destinationCoords];
        const flightPath = L.polyline(pathCoords, {
            color: color,
            weight: 1.2,
            opacity: isRealTime ? 0.6 : 0.4,
            dashArray: isRealTime ? '3,4' : '6,8'
        });

        const dataSource = isRealTime ? `LIVE - ${flight.apiSource || 'API'}` : 'SIMULATED';
        const lastUpdate = isRealTime ? 
            `Last Contact: ${flight.lastContact.toLocaleTimeString()}` : 
            'Generated Data';

        marker.bindPopup(`
            <div class="st-popup flight-info-popup">
                <div class="st-popup-eyebrow">${isArrival ? 'Arrival' : 'Departure'} · <span class="${isRealTime ? 'is-ok' : 'is-warn'}">${dataSource}</span></div>
                <div class="st-popup-title">${flight.callsign}</div>
                <table class="st-popup-table">
                    <tr><td>Airline</td><td>${flight.airlineName}</td></tr>
                    <tr><td>Route</td><td>${flight.origin} → ${flight.destination}</td></tr>
                    <tr><td>Aircraft</td><td>${flight.aircraftType}</td></tr>
                    <tr><td>Altitude</td><td>${(flight.altitude || 0).toLocaleString()} ft</td></tr>
                    <tr><td>Speed</td><td>${flight.speed} kts</td></tr>
                    <tr><td>Heading</td><td>${flight.heading}°</td></tr>
                    <tr><td>Status</td><td>${flight.status}${flight.onGround ? ' · <span class="is-warn">On ground</span>' : ''}</td></tr>
                    ${flight.verticalRate ? `<tr><td>Vertical rate</td><td>${flight.verticalRate > 0 ? '↗' : '↘'} ${Math.abs(flight.verticalRate)} ft/min</td></tr>` : ''}
                    <tr><td>Country</td><td>${flight.country || 'Unknown'}</td></tr>
                </table>
                <p class="st-popup-source">${lastUpdate} · Source: ${flight.apiSource || 'Unknown'}</p>
            </div>
        `);

        // Add hover tooltip
        marker.bindTooltip(`
            <div class="st-flight-tooltip">
                <strong>${flight.callsign}</strong>
                <span>From ${flight.origin}</span>
                <span>To ${flight.destination}</span>
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
        
        const statusOk = flight.status === 'On Time';
        detailsPanel.style('display', 'block')
            .html(`
                <div class="st-panel-eyebrow">Flight</div>
                <h3 class="st-panel-title">${flight.callsign}</h3>
                <div class="st-panel-grid">
                    <section class="st-panel-section">
                        <div class="st-panel-section-title">Flight information</div>
                        <table class="st-panel-table">
                            <tr><td>Airline</td><td>${flight.airlineName} (${flight.airline})</td></tr>
                            <tr><td>Aircraft</td><td>${flight.aircraftType}</td></tr>
                            <tr><td>Type</td><td>${flight.type}</td></tr>
                            <tr><td>Status</td><td><span class="${statusOk ? 'is-ok' : 'is-warn'}">${flight.status}</span></td></tr>
                        </table>
                    </section>
                    <section class="st-panel-section">
                        <div class="st-panel-section-title">Route</div>
                        <table class="st-panel-table">
                            <tr><td>Origin</td><td>${flight.origin}</td></tr>
                            <tr><td>Destination</td><td>${flight.destination}</td></tr>
                            <tr><td>Progress</td><td>${(flight.progress * 100).toFixed(1)}%</td></tr>
                            <tr><td>ETA</td><td>${(flight.estimatedTime || new Date()).toLocaleString()}</td></tr>
                        </table>
                    </section>
                </div>
                <section class="st-panel-section st-panel-section-wide">
                    <div class="st-panel-section-title">Current position</div>
                    <table class="st-panel-table st-panel-table-grid">
                        <tr><td>Altitude</td><td>${(flight.altitude || 0).toLocaleString()} ft</td></tr>
                        <tr><td>Speed</td><td>${flight.speed} knots</td></tr>
                        <tr><td>Heading</td><td>${flight.heading}°</td></tr>
                        <tr><td>Position</td><td>${flight.currentPosition[0].toFixed(4)}°N, ${flight.currentPosition[1].toFixed(4)}°E</td></tr>
                    </table>
                </section>
                <div class="st-panel-actions">
                    <button class="st-btn st-btn-ghost" onclick="d3.select('#flight-details').style('display', 'none')">Close</button>
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
            <div class="st-panel-eyebrow">Live flight statistics</div>
            <h3 class="st-panel-title">${total} flights in the Singapore region</h3>
            <div class="st-stat-grid">
                <div class="st-stat"><div class="st-stat-value">${arrivals}</div><div class="st-stat-label">Arrivals</div></div>
                <div class="st-stat"><div class="st-stat-value">${departures}</div><div class="st-stat-label">Departures</div></div>
                <div class="st-stat"><div class="st-stat-value">${total}</div><div class="st-stat-label">Total flights</div></div>
                <div class="st-stat"><div class="st-stat-value">${airlines}</div><div class="st-stat-label">Airlines</div></div>
            </div>
            <section class="st-panel-section">
                <div class="st-panel-section-title">Status distribution</div>
                <table class="st-panel-table st-panel-table-grid">
                    <tr><td><span class="is-ok">On time</span></td><td>${onTime}</td></tr>
                    <tr><td><span class="is-warn">Delayed</span></td><td>${delayed}</td></tr>
                    <tr><td>Other</td><td>${total - onTime - delayed}</td></tr>
                </table>
            </section>
            <p class="st-panel-foot">Sources: ${sourceInfo}. Last updated ${new Date().toLocaleTimeString()}${isLiveUpdateEnabled ? ' · Live' : ' · Offline'}.</p>
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
            showStatusUpdate(`Filtered to ${filteredCount} ${typeText} flights · ${airlineText}`);
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
            showStatusUpdate(`Filtered to ${filteredCount} ${typeText} flights · ${airlineText}`);
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
                            showStatusUpdate(`${newFlights.length} new flights detected`);
                        } else {
                            showStatusUpdate(`Flight positions updated · ${realTimeFlights.length} flights`);
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
        
        updateApiStatus('loading', 'Loading…');
        
        // Show loading indicator
        d3.select('#flight-stats').html(`
            <div class="st-panel-loading">
                <span class="st-spinner"></span>
                <div>Loading real-time flight data…</div>
                <small>Fetching from OpenSky Network API</small>
            </div>
        `);

        try {
            // First, try to get real-time flight data
            console.log('Attempting to fetch real-time flight data...');
            const realTimeFlights = await fetchRealTimeFlights();
            
            if (realTimeFlights && realTimeFlights.length > 0) {
                console.log(`Successfully loaded ${realTimeFlights.length} real-time flights`);
                flightData = realTimeFlights;
                updateApiStatus('live', `Live · ${realTimeFlights.length} flights`);

                // Show status update
                showStatusUpdate(`Flight tracker updated · ${realTimeFlights.length} live flights`);

                // Update figure-source "Last updated" stamp
                const stamp = document.getElementById('flights-last-updated');
                if (stamp) stamp.textContent = `${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })} SGT · ${realTimeFlights.length} flights`;

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

            updateApiStatus('error', 'API failed');
            const stamp = document.getElementById('flights-last-updated');
            if (stamp) stamp.textContent = 'API unavailable';
            
            // Show API error message
            d3.select('#flight-stats').html(`
                <div class="st-panel-eyebrow">Live flight statistics</div>
                <h3 class="st-panel-title">Real-time API unavailable</h3>
                <p class="st-panel-meta">${realTimeError.message}. Unable to load live flight data. Please try again later.</p>
                <div class="st-panel-actions"><button class="st-btn" onclick="loadFlightData()">Retry</button></div>
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
                <div class="st-panel-eyebrow">Flight tracker</div>
                <h3 class="st-panel-title">Could not load the flight tracker</h3>
                <p class="st-panel-meta">Unable to initialise the flight tracking system.</p>
                <div class="st-panel-actions"><button class="st-btn st-btn-accent" onclick="location.reload()">Reload</button></div>
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
