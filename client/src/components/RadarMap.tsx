import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import './RadarMap.css';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

interface RadarPoint {
  lat: number;
  lon: number;
  reflectivity: number;
  precipitation: string;
  color: string;
}

interface RadarData {
  type: string;
  features: Array<{
    type: string;
    geometry: {
      type: string;
      coordinates: [number, number];
    };
    properties: RadarPoint;
  }>;
  metadata: {
    timestamp: string;
    totalPoints: number;
  };
}

const RadarMap: React.FC = () => {
  const [radarData, setRadarData] = useState<RadarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  const fetchRadarData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/radar/latest');
      setRadarData(response.data);
      setLastUpdate(new Date().toLocaleTimeString());
      setError(null);
    } catch (err) {
      setError('Failed to fetch radar data');
      console.error('Error fetching radar data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRadarData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchRadarData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getRadius = (reflectivity: number): number => {
    // Scale radius based on reflectivity (dBZ)
    if (reflectivity < 20) return 3;
    if (reflectivity < 30) return 5;
    if (reflectivity < 40) return 7;
    return 9;
  };

  const getOpacity = (reflectivity: number): number => {
    // Scale opacity based on reflectivity
    if (reflectivity < 20) return 0.6;
    if (reflectivity < 30) return 0.7;
    if (reflectivity < 40) return 0.8;
    return 0.9;
  };

  return (
    <div className="radar-container">
      <div className="radar-header">
        <h1>Weather Radar Display</h1>
        <div className="radar-info">
          <div className="status-indicator">
            <span className={`status-dot ${loading ? 'loading' : error ? 'error' : 'success'}`}></span>
            {loading ? 'Loading...' : error ? 'Error' : 'Connected'}
          </div>
          {lastUpdate && (
            <div className="last-update">
              Last Update: {lastUpdate}
            </div>
          )}
          {radarData && (
            <div className="data-info">
              Points: {radarData.metadata.totalPoints}
            </div>
          )}
        </div>
      </div>

      <div className="map-container">
        <MapContainer
          center={[40.0, -100.0]} // Center of continental US
          zoom={4}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          {radarData && radarData.features.map((feature, index) => {
            const point = feature.properties;
            const [lon, lat] = feature.geometry.coordinates;
            
            return (
              <CircleMarker
                key={index}
                center={[lat, lon]}
                radius={getRadius(point.reflectivity)}
                pathOptions={{
                  color: point.color,
                  fillColor: point.color,
                  fillOpacity: getOpacity(point.reflectivity),
                  weight: 1,
                  opacity: 0.8
                }}
              >
                <Popup>
                  <div className="radar-popup">
                    <h3>Radar Data</h3>
                    <p><strong>Location:</strong> {lat.toFixed(3)}, {lon.toFixed(3)}</p>
                    <p><strong>Reflectivity:</strong> {point.reflectivity.toFixed(1)} dBZ</p>
                    <p><strong>Precipitation:</strong> {point.precipitation}</p>
                    <div 
                      className="color-indicator" 
                      style={{ backgroundColor: point.color }}
                    ></div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      <div className="radar-legend">
        <h3>Precipitation Intensity</h3>
        <div className="legend-items">
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#00ff00' }}></div>
            <span>Light (10-20 dBZ)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#ffff00' }}></div>
            <span>Moderate (20-30 dBZ)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#ff8000' }}></div>
            <span>Heavy (30-40 dBZ)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#ff0000' }}></div>
            <span>Extreme (40+ dBZ)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RadarMap;
