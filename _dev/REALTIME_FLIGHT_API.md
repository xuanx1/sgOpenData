# Real-Time Flight API Integration Guide

## Overview
The Singapore Flight Tracker now integrates with real-time flight data APIs to provide live flight information. This document explains the implementation, features, and fallback mechanisms.

## API Integration

### Primary API: OpenSky Network
- **URL**: `https://opensky-network.org/api/states/all`
- **Type**: Free, open-source flight tracking API
- **Coverage**: Global ADS-B and Mode S data
- **Update Frequency**: Real-time (typically 5-10 second intervals)
- **Rate Limits**: 400 requests per day for anonymous users

### Geographic Filtering
The application filters flights within Singapore's vicinity:
```javascript
SINGAPORE_BOUNDS: {
    lat_min: 1.0,    // Southern boundary
    lat_max: 1.8,    // Northern boundary  
    lon_min: 103.0,  // Western boundary
    lon_max: 104.5   // Eastern boundary
}
```

### CORS Handling
Due to browser CORS restrictions, the app implements a fallback system:
1. **Direct API Call**: Attempts direct connection to OpenSky API
2. **CORS Proxy**: Falls back to `api.allorigins.win` proxy service
3. **Local Fallback**: Uses sample data if APIs are unavailable

## Real-Time Data Features

### Live Flight Tracking
- **Position Updates**: Real-time aircraft positions with smooth interpolation
- **Flight Status**: Live status including altitude, speed, heading
- **Ground Detection**: Identifies aircraft on ground vs. in flight
- **Vertical Rate**: Shows climb/descent rate for active flights

### Visual Indicators
- **Live Data Markers**: Green pulsing border for real-time flights
- **Data Source Tags**: Clear labeling of live vs. simulated data
- **API Status**: Real-time connection status indicator
- **Last Contact**: Timestamp of most recent data update

### Enhanced Flight Information
```javascript
// Real-time flight data structure
{
    id: "a1b2c3",           // ICAO 24-bit address
    callsign: "SQ001",      // Flight callsign
    airline: "SQ",          // Extracted airline code
    currentPosition: [1.35, 103.99],
    altitude: 35000,        // Barometric altitude (feet)
    speed: 485,             // Ground speed (knots)
    heading: 45,            // True track (degrees)
    verticalRate: -512,     // Climb/descent rate (ft/min)
    onGround: false,        // Ground status
    lastContact: Date,      // Last ADS-B contact
    country: "Singapore"    // Aircraft registration country
}
```

## Intelligent Fallback System

### Fallback Hierarchy
1. **Real-Time API Data**: Primary source from OpenSky Network
2. **Sample Data Supplement**: If few real-time flights detected
3. **Static Sample Data**: Pre-recorded realistic flight data
4. **Generated Data**: Algorithmic flight simulation

### Data Quality Indicators
- **🔴 LIVE**: Real-time data from OpenSky Network
- **🟡 SAMPLE**: Mix of live and sample data
- **🔵 GENERATED**: Simulated flight data

## API Rate Limiting & Caching

### Smart Caching
- **Cache Duration**: 30 seconds to respect API limits
- **Background Refresh**: Automatic updates every 30 seconds
- **Error Handling**: Graceful degradation on API failures

### Rate Limit Management
```javascript
apiCache: {
    lastUpdate: 0,
    data: [],
    updateInterval: 30000  // 30 seconds
}
```

## Flight Classification Algorithm

### Arrival vs. Departure Detection
The app intelligently classifies flights based on:
- **Distance from Changi**: Proximity to Singapore's main airport
- **Altitude Profile**: High altitude + distance = likely departure
- **Low Altitude Near Airport**: Likely arrival or local traffic

### Destination Estimation
For real-time flights without explicit route data:
- **Heading Analysis**: Maps aircraft heading to compass directions
- **Geographic Routing**: Estimates destinations based on flight direction
- **Common Routes**: Uses database of typical Singapore routes

## Performance Optimizations

### Efficient Updates
- **Position Interpolation**: Smooth movement between data points
- **Selective Rendering**: Only updates changed flight positions
- **Marker Recycling**: Reuses map markers to reduce memory usage

### Background Processing
- **Non-blocking Updates**: Uses `requestAnimationFrame` for smooth animations
- **Progressive Loading**: Loads data incrementally to maintain responsiveness
- **Error Recovery**: Automatic retry mechanisms for failed API calls

## Real-Time Features

### Live Statistics
- **Dynamic Counts**: Real-time arrival/departure statistics
- **Airline Distribution**: Live breakdown by airline
- **Status Monitoring**: Real-time flight status updates
- **Data Freshness**: Automatic timestamp updates

### Interactive Elements
- **Live Filtering**: Real-time filter application
- **Status Tooltips**: Hover information with live data
- **Click Details**: Comprehensive flight information panels
- **Map Integration**: Seamless Leaflet.js integration

## Error Handling & Resilience

### API Failure Recovery
```javascript
try {
    // Attempt real-time API call
    const realTimeFlights = await fetchRealTimeFlights();
} catch (error) {
    // Graceful fallback to sample data
    console.warn('API failed, using fallback data');
    updateApiStatus('error', 'API Failed');
}
```

### Connection Status Monitoring
- **Real-time Status**: Visual indicator of API connection health
- **Error Messages**: User-friendly error descriptions
- **Automatic Retry**: Background reconnection attempts

## Development Notes

### API Credentials
- **OpenSky Network**: No authentication required for basic access
- **Enhanced Access**: Registration available for higher rate limits
- **Alternative APIs**: FlightAware, ADS-B Exchange (require API keys)

### Browser Compatibility
- **Modern Browsers**: Chrome, Firefox, Safari, Edge
- **ES6+ Features**: async/await, fetch API, arrow functions
- **CORS Support**: Requires proxy for cross-origin requests

### Future Enhancements
- **WebSocket Integration**: Real-time streaming updates
- **Aircraft Database**: Detailed aircraft type information
- **Route Database**: Historical route analysis
- **Weather Integration**: Meteorological data overlay

## Usage Examples

### API Status Monitoring
```javascript
// Check if real-time data is available
const hasLiveData = flightData.some(f => f.lastContact);

// Update UI based on data source
updateApiStatus(hasLiveData ? 'live' : 'sample', 
               `${hasLiveData ? 'Live' : 'Sample'} • ${flightData.length} flights`);
```

### Real-Time Filtering
```javascript
// Filter only live flights
const liveFlights = flightData.filter(f => !!f.lastContact);

// Show flights updated in last 60 seconds
const recentFlights = flightData.filter(f => 
    f.lastContact && (Date.now() - f.lastContact.getTime()) < 60000
);
```

This real-time integration transforms the Singapore Flight Tracker from a static visualization into a live aviation monitoring system, providing users with authentic, up-to-date flight information while maintaining robust fallback capabilities for consistent functionality.
