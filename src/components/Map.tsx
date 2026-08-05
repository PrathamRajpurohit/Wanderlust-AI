"use client";

import React, { useEffect, useRef, useState } from "react";
import { IMapLocation } from "@/lib/agent/types";

interface MapProps {
  dayNum: number;
  locations: IMapLocation[];
  centerLat: number;
  centerLng: number;
  zoom: number;
}

// Track script loading globally
let googleMapsLoading = false;
let googleMapsLoaded = false;

function loadGoogleMapsScript(apiKey: string, onLoad: () => void) {
  if (googleMapsLoaded) {
    onLoad();
    return;
  }

  if (googleMapsLoading) {
    const checkInterval = setInterval(() => {
      if (googleMapsLoaded) {
        clearInterval(checkInterval);
        onLoad();
      }
    }, 100);
    return;
  }

  googleMapsLoading = true;
  const script = document.createElement("script");
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
  script.async = true;
  script.defer = true;
  script.onload = () => {
    googleMapsLoaded = true;
    googleMapsLoading = false;
    onLoad();
  };
  document.head.appendChild(script);
}

export default function Map({ dayNum, locations, centerLat, centerLng, zoom }: MapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [useJsApi, setUseJsApi] = useState(false);
  const [isJsApiReady, setIsJsApiReady] = useState(false);

  // Check if API key exists in the environment
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (apiKey) {
      setUseJsApi(true);
      loadGoogleMapsScript(apiKey, () => {
        setIsJsApiReady(true);
      });
    }
  }, [apiKey]);

  // JS API Map initialization
  useEffect(() => {
    if (!useJsApi || !isJsApiReady || !mapContainerRef.current || !locations.length) return;

    const google = (window as any).google;
    if (!google) return;

    const mapOptions = {
      center: { lat: centerLat, lng: centerLng },
      zoom: zoom,
      styles: [
        {
          featureType: "administrative",
          elementType: "geometry",
          stylers: [{ visibility: "off" }],
        },
      ],
    };

    const map = new google.maps.Map(mapContainerRef.current, mapOptions);

    // Initialize directions service & renderer
    const directionsService = new google.maps.DirectionsService();
    const directionsRenderer = new google.maps.DirectionsRenderer({
      map: map,
      suppressMarkers: true, // We will render our own markers
      polylineOptions: {
        strokeColor: "#3b82f6",
        strokeOpacity: 0.8,
        strokeWeight: 4,
      },
    });

    const hotel = locations.find((l) => l.type === "hotel") || locations[0];
    const others = locations.filter((l) => l !== hotel);

    if (hotel && others.length > 0) {
      const waypoints = others.slice(0, -1).map((loc) => ({
        location: new google.maps.LatLng(loc.lat, loc.lng),
        stopover: true,
      }));

      const dest = others[others.length - 1];

      directionsService.route(
        {
          origin: new google.maps.LatLng(hotel.lat, hotel.lng),
          destination: new google.maps.LatLng(dest.lat, dest.lng),
          waypoints: waypoints,
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (response: any, status: string) => {
          if (status === "OK") {
            directionsRenderer.setDirections(response);
          } else {
            console.warn("Google Maps directions failed:", status);
          }
        }
      );
    }

    // Place markers
    const infoWindow = new google.maps.InfoWindow();
    locations.forEach((loc) => {
      let emoji = "📍";
      let color = "#3b82f6";
      if (loc.type === "hotel") {
        emoji = "🏨";
        color = "#ec4899";
      } else if (loc.type === "restaurant") {
        emoji = "🍽️";
        color = "#10b981";
      } else if (loc.type === "attraction") {
        emoji = "🎪";
        color = "#8b5cf6";
      }

      // Render markers with labeled emojis (using OverlayView or simple customized marker label)
      const marker = new google.maps.Marker({
        position: { lat: loc.lat, lng: loc.lng },
        map: map,
        title: loc.name,
        // Since custom markers normally require files, we use a simple styled marker
      });

      marker.addListener("click", () => {
        infoWindow.setContent(`
          <div style="font-family: sans-serif; padding: 4px; color: #1e293b;">
            <div style="font-weight: 700; font-size: 14px;">${emoji} ${loc.name}</div>
            <div style="font-size: 11px; text-transform: uppercase; font-weight: bold; color: ${color}; margin-top: 2px;">${loc.type}</div>
            ${loc.address ? `<div style="font-size: 12px; color: #64748b; margin-top: 4px;">${loc.address}</div>` : ""}
          </div>
        `);
        infoWindow.open(map, marker);
      });
    });
  }, [useJsApi, isJsApiReady, locations, centerLat, centerLng, zoom]);

  if (useJsApi) {
    return (
      <div
        style={{
          width: "100%",
          height: "320px",
          borderRadius: "12px",
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)",
        }}
      >
        {!isJsApiReady && (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-secondary)",
              background: "#f1f5f9",
            }}
          >
            Loading Google Maps API...
          </div>
        )}
        <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />
      </div>
    );
  }

  // Fallback: Embed directions iframe (free, keyless)
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
          background: "#f1f5f9",
        }}
      >
        No map locations available for this day.
      </div>
    );
  }

  const hotel = locations.find((l) => l.type === "hotel") || locations[0];
  const others = locations.filter((l) => l !== hotel);

  const startCoord = `${hotel.lat},${hotel.lng}`;
  let daddr = "";
  if (others.length > 0) {
    const last = others[others.length - 1];
    const waypoints = others.slice(0, -1);
    if (waypoints.length > 0) {
      const waypointsStr = waypoints.map((w) => `${w.lat},${w.lng}`).join("+to:");
      daddr = `${waypointsStr}+to:${last.lat},${last.lng}`;
    } else {
      daddr = `${last.lat},${last.lng}`;
    }
  } else {
    daddr = startCoord;
  }

  const embedUrl = `https://maps.google.com/maps?saddr=${startCoord}&daddr=${daddr}&t=&z=${zoom}&ie=UTF8&iwloc=&output=embed`;

  return (
    <div
      style={{
        width: "100%",
        height: "320px",
        borderRadius: "12px",
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)",
        position: "relative",
        background: "#e5e7eb",
      }}
    >
      <iframe
        src={embedUrl}
        width="100%"
        height="100%"
        style={{ border: 0 }}
        allowFullScreen={false}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title={`Google Maps Route Day ${dayNum}`}
      />
    </div>
  );
}
