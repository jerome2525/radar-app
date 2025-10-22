# Weather Radar App

A real-time weather radar application that displays MRMS (Multi-Radar/Multi-Sensor System) data from NOAA.

## Features

- 🌦️ **Real-time radar data** from NOAA MRMS
- 🗺️ **Interactive map** with radar overlays
- 📊 **Multiple data sources** (MRMS NCEP, NWS API)
- 🔄 **Auto-updating** every 5 minutes
- 📱 **Responsive design** for all devices
- 🚀 **Deployed on Railway**

## Tech Stack

### Backend
- **Node.js** with Express
- **SQLite** (local) / **PostgreSQL** (Railway)
- **MRMS data scraping** from NOAA
- **GRIB2 file processing**
- **RESTful API** with Swagger documentation

### Frontend
- **React** with TypeScript
- **Leaflet** maps
- **Real-time updates**

## API Endpoints

- `GET /api/radar/latest` - Latest radar data
- `GET /api/radar/status` - Server status
- `GET /api/radar/bounds` - Data within geographic bounds
- `GET /api-docs` - Swagger documentation

## Local Development

### Prerequisites
- Node.js 16+
- npm or yarn

### Setup
```bash
# Install dependencies
cd server
npm install

cd ../client
npm install

# Start backend
cd ../server
npm start

# Start frontend (in another terminal)
cd ../client
npm start
```

### Environment Variables
```bash
# Server
PORT=5000
NODE_ENV=development

# Database (Railway will provide this)
DATABASE_URL=postgresql://...
```

## Deployment

### Railway
1. Connect your GitHub repository to Railway
2. Add PostgreSQL database service
3. Set environment variables
4. Deploy!

### Environment Variables for Railway
- `DATABASE_URL` - PostgreSQL connection string (auto-provided)
- `NODE_ENV=production`

## Data Sources

- **MRMS NCEP**: `https://mrms.ncep.noaa.gov/2D/BREF_1HR_MAX/`
- **NWS API**: `https://api.weather.gov`
- **Fallback**: Enhanced mock data with realistic weather patterns

## License

MIT License
