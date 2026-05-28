# NORVIEW — Arctic OSINT Command Center

A browser-based geospatial intelligence platform focused on Norway and the Arctic region. Inspired by Palantir Maven and Bilawal Sidhu's WorldView.

## Quick Start

```bash
# Install dependencies
npm install
cd server && npm install && cd ..

# Run everything
./start.sh

# Or run separately:
# Terminal 1: API proxy
cd server && node index.js

# Terminal 2: Frontend
npx vite
```

Open http://localhost:3000

## Data Layers

| Layer | Source | Data |
|-------|--------|------|
| Flights | OpenSky Network (live) | Real-time aircraft positions, altitude, speed, heading |
| Vessels | AIS simulation | Ship positions along Norwegian shipping lanes, dark vessel detection |
| Satellites | satellite.js + TLE | Orbit propagation, ISS, Sentinel, NOAA, military constellation tracking |
| Weather | Open-Meteo (live) | Real-time temperature, wind speed/direction, gusts, visibility, precipitation — Maven/GODS EYE environmental intelligence |

## Visual Modes

- **Standard** — Dark cartographic base
- **Night Vision** — Green phosphor NV aesthetic
- **FLIR/Thermal** — Infrared heat-map look
- **CRT** — Retro scanline intelligence terminal

## Architecture

- **Frontend:** React + CesiumJS 3D globe (via Resium/Vite)
- **Backend:** Express proxy for CORS + caching of OSINT APIs
- **State:** Zustand store for layers, filters, entity selection

## Coverage Area

- Norwegian mainland coast (57.5°N — 71°N)
- Svalbard archipelago (76°N — 81°N)
- North Sea shipping lanes
- Barents Sea
- Arctic shipping routes

## Roadmap

- Real AIS data integration (AISHub / MarineTraffic)
- GPS jamming/spoofing overlay
- NOTAM / restricted airspace zones
- 4D timeline scrubber (replay events)
- Military aircraft classification
- Live CCTV feed integration
- Dark vessel anomaly detection AI
- Satellite imagery layer (Sentinel Hub)
