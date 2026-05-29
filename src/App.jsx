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
import IntelFeed from './components/IntelFeed';
import PanopticOverlay from './components/PanopticOverlay';
import GeofencePanel from './components/GeofencePanel';
import FlightLayer from './layers/FlightLayer';
import VesselLayer from './layers/VesselLayer';
import SatelliteLayer from './layers/SatelliteLayer';
import GpsJammingLayer from './layers/GpsJammingLayer';
import AirspaceLayer from './layers/AirspaceLayer';
import GeofenceLayer from './layers/GeofenceLayer';
import WeatherLayer from './layers/WeatherLayer';
import SignalLayer from './layers/SignalLayer';
import useStore from './store';

export default function App() {
  const [viewer, setViewer] = useState(null);
  const alerts = useStore((s) => s.alerts);
  const selectedEntity = useStore((s) => s.selectedEntity);
  const visualFilter = useStore((s) => s.visualFilter);

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

      {viewer && (
        <>
          <FlightLayer viewer={viewer} />
          <VesselLayer viewer={viewer} />
          <SatelliteLayer viewer={viewer} />
          <GpsJammingLayer viewer={viewer} />
          <AirspaceLayer viewer={viewer} />
          <GeofenceLayer viewer={viewer} />
          <WeatherLayer viewer={viewer} />
          <SignalLayer viewer={viewer} />
        </>
      )}

      <Header onHelpClick={handleOpenHelp} />
      <Sidebar />
      <StatusBar />
      <Timeline />
      <ThreatPanel />
      <CorrelationPanel />
      <TimelineScrubber />
      <IntelFeed />
      <PanopticOverlay />
      <GeofencePanel />
      {alerts.length > 0 && !selectedEntity && <AlertFeed />}
      {selectedEntity && <EntityPanel />}

      {showOnboarding && <Onboarding onClose={handleCloseOnboarding} />}
    </div>
  );
}
