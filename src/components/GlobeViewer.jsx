import React, { useRef, useEffect } from 'react';
import * as Cesium from 'cesium';
import useStore, { REGIONS } from '../store';

export default function GlobeViewer({ onViewerReady }) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const visualFilter = useStore((s) => s.visualFilter);
  const region = useStore((s) => s.region);

  // Initialize viewer once
  useEffect(() => {
    if (viewerRef.current || !containerRef.current) return;

    Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI2OGFlNjUzNS1jMTc1LTQ3ZjYtYjc5NS03MzFkM2IxNjc0MzYiLCJpZCI6MjU5LCJpYXQiOjE3MzY4NzA0Nzh9.unBkgpKA3CkjVgPHEcPNtEMnolvMNSPjmmGnxajMZXc';

    const viewer = new Cesium.Viewer(containerRef.current, {
      animation: false,
      baseLayerPicker: false,
      fullscreenButton: false,
      vrButton: false,
      geocoder: false,
      homeButton: false,
      infoBox: false,
      sceneModePicker: false,
      selectionIndicator: false,
      timeline: false,
      navigationHelpButton: false,
      creditContainer: document.createElement('div'),
      imageryProvider: false,
      terrain: undefined,
      skyBox: false,
      skyAtmosphere: new Cesium.SkyAtmosphere(),
      contextOptions: { webgl: { alpha: false } },
    });

    viewer.imageryLayers.addImageryProvider(
      new Cesium.UrlTemplateImageryProvider({
        url: 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png',
        subdomains: ['a', 'b', 'c', 'd'],
        minimumLevel: 0,
        maximumLevel: 18,
        credit: 'CartoDB',
      })
    );

    viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#0a0a0f');
    viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#0a0a0f');
    viewer.scene.globe.showGroundAtmosphere = false;
    viewer.scene.fog.enabled = false;
    viewer.scene.globe.enableLighting = false;

    // Initial camera position
    const cam = REGIONS.norway.camera;
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(cam.lon, cam.lat, cam.height),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(cam.pitch), roll: 0 },
      duration: 0,
    });

    viewerRef.current = viewer;
    if (onViewerReady) onViewerReady(viewer);

    return () => {
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
      }
      viewerRef.current = null;
    };
  }, []);

  // Fly camera when region changes
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    const cam = REGIONS[region]?.camera;
    if (!cam) return;

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(cam.lon, cam.lat, cam.height),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(cam.pitch), roll: 0 },
      duration: 1.5,
    });
  }, [region]);

  // Visual filters
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.style.filter = '';
    el.className = 'globe-container';
    switch (visualFilter) {
      case 'nightvision':
        el.style.filter = 'brightness(1.3) contrast(1.4) saturate(0) sepia(1) hue-rotate(70deg) saturate(3)';
        break;
      case 'thermal':
        el.style.filter = 'brightness(1.1) contrast(1.5) saturate(0) sepia(1) hue-rotate(-30deg) saturate(2.5)';
        break;
      case 'crt':
        el.className = 'globe-container crt-effect';
        break;
      default: break;
    }
  }, [visualFilter]);

  return (
    <div
      ref={containerRef}
      className="globe-container"
      style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
    />
  );
}
