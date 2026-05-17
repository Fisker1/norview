import React, { useState, useCallback, useEffect } from 'react';
import GlobeViewer from './components/GlobeViewer';
import Sidebar from './components/Sidebar';
import StatusBar from './components/StatusBar';
import Header from './components/Header';
import EntityPanel from './components/EntityPanel';
import AlertFeed from './components/AlertFeed';
import Timeline from './components/Timeline';
import Onboarding from './components/Onboarding';
import ThreatPanel from './components/ThreatPanel';
import CorrelationPanel from './components/CorrelationPanel';
import TimelineScrubber from './components/TimelineScrubber';
import FlightLayer from './layers/FlightLayer';
import VesselLayer from './layers/VesselLayer';
import SatelliteLayer from './layers/SatelliteLayer';
import GpsJammingLayer from './layers/GpsJammingLayer';
import AirspaceLayer from './layers/AirspaceLayer';
import useStore from './store';

export default function App() {
  const [viewer, setViewer] = useState(null);
  const layers = useStore((s) => s.layers);
  const selectedEntity = useStore((s) => s.selectedEntity);
  const alerts = useStore((s) => s.alerts);

  // Show onboarding on first visit (or when help button clicked)
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try {
      return !window.sessionStorage.getItem('norview-onboarded');
    } catch {
      return true;
    }
  });

  const handleCloseOnboarding = useCallback(() => {
    setShowOnboarding(false);
    try { window.sessionStorage.setItem('norview-onboarded', '1'); } catch {}
  }, []);

  const handleOpenHelp = useCallback(() => {
    setShowOnboarding(true);
  }, []);

  // ESC key closes onboarding
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape' && showOnboarding) handleCloseOnboarding();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showOnboarding, handleCloseOnboarding]);

  const handleViewerReady = useCallback((v) => {
    setViewer(v);
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#0a0a0f' }}>
      <GlobeViewer onViewerReady={handleViewerReady} />

      {/* Data layers */}
      {viewer && (
        <>
          {layers.flights && <FlightLayer viewer={viewer} />}
          {layers.vessels && <VesselLayer viewer={viewer} />}
          {layers.satellites && <SatelliteLayer viewer={viewer} />}
          {layers.gpsJamming && <GpsJammingLayer viewer={viewer} />}
          {layers.airspaces && <AirspaceLayer viewer={viewer} />}
        </>
      )}

      {/* UI Overlay */}
      <Header onHelpClick={handleOpenHelp} />
      <Sidebar />
      <StatusBar />
      <Timeline />
      <ThreatPanel />
      <CorrelationPanel />
      <TimelineScrubber />
      {alerts.length > 0 && !selectedEntity && <AlertFeed />}
      {selectedEntity && <EntityPanel />}

      {/* Onboarding modal */}
      {showOnboarding && <Onboarding onClose={handleCloseOnboarding} />}
    </div>
  );
      }
