# Singapore Flight Tracker (App5)

## Overview
The Singapore Flight Tracker is a real-time visualization application that displays flights entering and leaving Singapore airspace with detailed airspace demarcation. This application provides an interactive map showing live flight positions, routes, and comprehensive airspace information.

## Features

### 🗺️ Interactive Airspace Map
- **Singapore Flight Information Region (FIR)**: Complete coverage of Singapore's managed airspace (~65,000 sq km)
- **Terminal Control Area (TCA)**: High-density airspace around major airports (Surface to FL195)
- **Control Traffic Region (CTR)**: Immediate airport control zone around Changi (Surface to 3,000 ft)
- **Traffic Corridors**: Standard arrival and departure routes for different directions

### ✈️ Real-time Flight Tracking
- Live flight positions with movement simulation
- Arrival and departure flights visualization
- Flight paths showing origin to destination routes
- Animated aircraft markers with directional indicators

### 🏢 Airport Information
- **Changi International Airport (WSSS)**: Major international hub with 4 terminals and 3 runways
- **Seletar Airport (WSSL)**: General aviation and charter flights facility

### 📊 Flight Data & Analytics
- Real-time flight statistics (arrivals, departures, total flights)
- Flight status distribution (On Time, Delayed, etc.)
- Airline distribution analysis
- Live updates with configurable refresh intervals

### 🎛️ Interactive Controls
- **Flight Type Filter**: View all flights, arrivals only, or departures only
- **Airline Filter**: Filter by specific airlines
- **Live Updates Toggle**: Enable/disable real-time position updates
- **Manual Refresh**: Force refresh flight data

### 📱 Flight Details Panel
- Comprehensive flight information on click
- Aircraft type, altitude, speed, and heading
- Route information with progress tracking
- Estimated arrival/departure times
- Flight status and airline details

## Technical Implementation

### Data Sources
- **Sample Flight Data**: Real-time flight information with actual routes and aircraft
- **Simulated Flights**: Generated data for demonstration with realistic flight patterns
- **Airspace Data**: Accurate Singapore airspace boundaries and control zones

### Technologies Used
- **Leaflet.js**: Interactive mapping with custom styling
- **D3.js**: Data visualization and UI components
- **Real-time Updates**: Live position tracking with smooth animations
- **Responsive Design**: Optimized for desktop and mobile viewing

### Airspace Zones Implemented
1. **Flight Information Region (FIR)** - Orange dashed boundary
2. **Terminal Control Area (TCA)** - Cyan dashed boundary  
3. **Control Traffic Region (CTR)** - Red dashed boundary
4. **Traffic Corridors** - Purple dashed lines

### Flight Data Structure
```javascript
{
  "callsign": "SQ001",
  "airline": "SQ",
  "airlineName": "Singapore Airlines", 
  "aircraftType": "A380",
  "origin": "London Heathrow",
  "destination": "Singapore Changi",
  "currentPosition": [1.2, 103.8],
  "altitude": 8500,
  "speed": 280,
  "heading": 45,
  "status": "On Approach",
  "type": "arrival"
}
```

## Usage

### Viewing Flights
1. Open the application to see the interactive map
2. Flight markers show current positions with aircraft icons
3. Green markers (🛬) indicate arriving flights
4. Orange markers (🛫) indicate departing flights

### Filtering Data
- Use the **Flight Type** dropdown to filter arrivals or departures
- Select specific **Airlines** from the dropdown
- **Search** for specific flight numbers or routes

### Flight Information
- Click any flight marker to view detailed information
- Flight paths show complete routes from origin to destination
- Hover over airspace zones to see boundary information

### Live Updates
- Toggle **Live Updates** to enable/disable real-time tracking
- Use **Refresh Data** button to manually update flight information
- Position updates occur every 2 seconds when live updates are enabled

## Future Enhancements

### Real API Integration
- Integration with ADS-B Exchange API for live flight data
- OpenSky Network API for additional flight information
- FlightAware API for enhanced flight details

### Advanced Features
- Weather overlay with current conditions
- Flight delay predictions and analysis
- Historical flight pattern analysis
- Custom alert system for specific flights or routes

### Enhanced Visualization
- 3D flight paths with altitude visualization
- Flight density heat maps
- Seasonal traffic pattern analysis
- Airport capacity and utilization metrics

## Performance Optimization
- Efficient marker clustering for high-density areas
- Optimized rendering with requestAnimationFrame
- Configurable update intervals to balance performance
- Smart filtering to reduce processing overhead

The Singapore Flight Tracker provides comprehensive real-time aviation monitoring capabilities with detailed airspace awareness, making it an excellent tool for understanding Singapore's role as a major aviation hub in Southeast Asia.
