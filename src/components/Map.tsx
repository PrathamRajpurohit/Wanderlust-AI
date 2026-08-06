"use client";

import React, { useEffect, useRef } from "react";
import { IMapLocation } from "@/lib/agent/types";

interface MapProps {
  dayNum: number;
  locations: IMapLocation[];
  centerLat: number;
  centerLng: number;
  zoom: number;
}

// Leaflet is loaded dynamically so it only runs client-side
let leafletLoaded = false;
let leafletLoading = false;

function loadLeaflet(onLoad: () => void) {
  if (typeof window === "undefined") return;

  if (leafletLoaded) {
    onLoad();
    return;
  }

  if (leafletLoading) {
    const check = setInterval(() => {
      if (leafletLoaded) {
        clearInterval(check);
        onLoad();
      }
    }, 100);
    return;
  }

  leafletLoading = true;

  // Inject Leaflet CSS
  if (!document.getElementById("leaflet-css")) {
    const link = document.createElement("link");
    link.id = "leaflet-css";
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
  }

  // Inject Leaflet JS
  const script = document.createElement("script");
  script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
  script.async = true;
  script.onload = () => {
    leafletLoaded = true;
    leafletLoading = false;
    onLoad();
  };
  script.onerror = () => {
    leafletLoading = false;
  };
  document.head.appendChild(script);
}

const TYPE_CONFIG: Record<string, { emoji: string; color: string }> = {
  hotel:      { emoji: "🏨", color: "#ec4899" },
  restaurant: { emoji: "🍽️", color: "#10b981" },
  attraction: { emoji: "🎪", color: "#8b5cf6" },
};

export default function Map({ dayNum, locations, centerLat, centerLng, zoom }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!locations || locations.length === 0) return;

    loadLeaflet(() => {
      const L = (window as any).L;
      if (!L || !containerRef.current) return;

      // Destroy previous map instance if it exists (React strict-mode / remount)
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const map = L.map(containerRef.current, {
        center: [centerLat, centerLng],
        zoom: zoom ?? 13,
        zoomControl: true,
        scrollWheelZoom: false,
      });

      mapRef.current = map;

      // OpenStreetMap tile layer (completely free, no key needed)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Draw a polyline connecting all stops in order
      if (locations.length > 1) {
        const latlngs = locations.map((loc) => [loc.lat, loc.lng]);
        L.polyline(latlngs, {
          color: "#3b82f6",
          weight: 3,
          opacity: 0.8,
          dashArray: "6, 6",
        }).addTo(map);
      }

      // Add markers
      locations.forEach((loc, idx) => {
        const config = TYPE_CONFIG[loc.type] ?? { emoji: "📍", color: "#3b82f6" };

        const icon = L.divIcon({
          className: "",
          html: `
            <div style="
              background: ${config.color};
              border: 2px solid white;
              border-radius: 50%;
              width: 32px;
              height: 32px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 16px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.4);
              cursor: pointer;
            ">${config.emoji}</div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -20],
        });

        const popup = L.popup({ maxWidth: 220 }).setContent(`
          <div style="font-family: sans-serif; padding: 2px;">
            <div style="font-weight: 700; font-size: 14px; color: #1e293b;">${config.emoji} ${loc.name}</div>
            <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: ${config.color}; margin-top: 3px;">${loc.type}</div>
            ${loc.address ? `<div style="font-size: 11px; color: #64748b; margin-top: 4px;">${loc.address}</div>` : ""}
            <a
              href="https://www.openstreetmap.org/?mlat=${loc.lat}&mlon=${loc.lng}&zoom=16"
              target="_blank"
              rel="noopener noreferrer"
              style="display:inline-block;margin-top:6px;font-size:11px;color:#3b82f6;text-decoration:underline;"
            >Open in Maps ↗</a>
          </div>
        `);

        L.marker([loc.lat, loc.lng], { icon })
          .bindPopup(popup)
          .addTo(map);
      });

      // Fit map to show all markers
      if (locations.length > 1) {
        const bounds = L.latLngBounds(locations.map((l) => [l.lat, l.lng]));
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      }
    });

    // Cleanup on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locations, centerLat, centerLng, zoom]);

  if (!locations || locations.length === 0) {
    return (
      <div
        style={{
          width: "100%",
          height: "320px",
          borderRadius: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-secondary)",
          background: "var(--bg-elevated)",
          fontSize: "0.875rem",
        }}
      >
        No map locations available for this day.
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: "320px",
        borderRadius: "12px",
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
        position: "relative",
      }}
    >
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
