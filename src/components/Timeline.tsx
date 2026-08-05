"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  Building2, 
  Plane, 
  UtensilsCrossed, 
  MapPin, 
  Map as MapIcon, 
  Navigation,
  Sun,
  CloudRain,
  Cloud,
  Snowflake,
  Wind,
  CloudLightning
} from "lucide-react";
import styles from "./Timeline.module.css";
import { IDay } from "@/lib/agent/types";
import Map from "./Map";

interface Props {
  itinerary: IDay[];
  destination: string;
  currency?: string;
}

function formatCost(cost: number, currency = "INR"): string {
  const symbols: Record<string, string> = { INR: "₹", USD: "$", EUR: "€", GBP: "£" };
  const symbol = symbols[currency] || currency;
  return `${symbol}${cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function getWeatherIcon(condition: string) {
  const cond = condition.toLowerCase();
  if (cond.includes("sun") || cond.includes("clear") || cond.includes("fair")) {
    return <Sun size={14} style={{ color: "#f59e0b" }} />;
  }
  if (cond.includes("rain") || cond.includes("drizzle") || cond.includes("shower") || cond.includes("wet")) {
    return <CloudRain size={14} style={{ color: "#3b82f6" }} />;
  }
  if (cond.includes("snow") || cond.includes("freeze") || cond.includes("hail")) {
    return <Snowflake size={14} style={{ color: "#60a5fa" }} />;
  }
  if (cond.includes("wind") || cond.includes("breeze") || cond.includes("gale")) {
    return <Wind size={14} style={{ color: "#94a3b8" }} />;
  }
  if (cond.includes("storm") || cond.includes("thunder") || cond.includes("lightning")) {
    return <CloudLightning size={14} style={{ color: "#7c3aed" }} />;
  }
  return <Cloud size={14} style={{ color: "#94a3b8" }} />;
}

export default function Timeline({ itinerary, destination, currency = "INR" }: Props) {
  const totalEstimate = itinerary.reduce((sum, d) => sum + (d.dailyEstimate || 0), 0);
  const [activeMapDay, setActiveMapDay] = useState<number | null>(null);

  const toggleMap = (dayNum: number) => {
    setActiveMapDay((prev) => (prev === dayNum ? null : dayNum));
  };

  return (
    <div>
      <div className={styles.timelineWrapper}>
        {itinerary.map((day, index) => (
          <motion.div
            key={day.day}
            className={styles.timelineEntry}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: index * 0.06, ease: "easeOut" }}
          >
            {/* Left: Day Badge */}
            <div className={styles.dayBadge}>
              <span className={styles.dayNum}>{day.day}</span>
              <span className={styles.dayLabel}>DAY</span>
            </div>

            {/* Right: Day Card */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <div className={styles.cardTheme}>{day.theme}</div>
                  <div className={styles.cardDate}>{day.date}</div>
                  
                  {/* Weather Prediction Info */}
                  {day.weather && (
                    <div className={styles.weatherContainer}>
                      <span className={styles.weatherBadge}>
                        {getWeatherIcon(day.weather.condition)}
                        <span className={styles.weatherCondition}>{day.weather.condition}</span>
                      </span>
                      <span className={styles.weatherTemp}>{day.weather.temperature}</span>
                      <span className={styles.weatherDesc}>{day.weather.description}</span>
                    </div>
                  )}
                </div>
                <div className={styles.cardDailyCost}>
                  <span className={styles.costLabel}>Daily Est.</span>
                  <span className={styles.costValue}>{formatCost(day.dailyEstimate, currency)}</span>
                </div>
              </div>

              <div className={styles.cardBody}>
                {/* Hotel */}
                {day.hotel && (
                  <div className={styles.section}>
                    <div className={styles.sectionTitle}>
                      <Building2 size={14} /> Hotel
                    </div>
                    <div className={styles.sectionItems}>
                      <div className={styles.item}>
                        <div className={styles.itemLeft}>
                          <span className={styles.itemName}>{day.hotel.name}</span>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(day.hotel.name + ", " + destination)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.placeMapLink}
                          >
                            🗺️ Map
                          </a>
                        </div>
                        <span className={styles.itemSub}>
                          {formatCost(day.hotel.pricePerNight, currency)}/night · ⭐ {day.hotel.rating}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Flights */}
                {day.flights?.length > 0 && (
                  <div className={styles.section}>
                    <div className={styles.sectionTitle}>
                      <Plane size={14} /> Flights
                    </div>
                    <div className={styles.sectionItems}>
                      {day.flights.map((f, i) => (
                        <div key={i} className={styles.item}>
                          <span>{f.from} → {f.to}</span>
                          <span className={styles.itemSub}>
                            {f.airline} · {formatCost(f.estimatedCost, currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Restaurants */}
                {day.restaurants?.length > 0 && (
                  <div className={styles.section}>
                    <div className={styles.sectionTitle}>
                      <UtensilsCrossed size={14} /> Restaurants
                    </div>
                    <div className={styles.sectionItems}>
                      {day.restaurants.map((r, i) => (
                        <div key={i} className={styles.item}>
                          <div className={styles.itemLeft}>
                            <span className={styles.itemName}>{r.name}</span>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.name + ", " + destination)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={styles.placeMapLink}
                            >
                              🗺️ Map
                            </a>
                          </div>
                          <span className={styles.itemSub}>
                            {r.cuisine} · {formatCost(r.avgCost, currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Attractions */}
                {day.attractions?.length > 0 && (
                  <div className={styles.section}>
                    <div className={styles.sectionTitle}>
                      <MapPin size={14} /> Attractions
                    </div>
                    <div className={styles.sectionItems}>
                      {day.attractions.map((a, i) => (
                        <div key={i} className={styles.item}>
                          <div className={styles.itemLeft}>
                            <span className={styles.itemName}>{a.name}</span>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.name + ", " + destination)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={styles.placeMapLink}
                            >
                              🗺️ Map
                            </a>
                          </div>
                          <span className={styles.itemSub}>
                            Entry: {formatCost(a.entryFee, currency)} · {a.duration}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Map Recommendation Section */}
                {day.mapRecommendation && (
                  <div className={styles.mapSection}>
                    <div className={styles.mapActions}>
                      <button
                        type="button"
                        onClick={() => toggleMap(day.day)}
                        className={styles.mapToggleBtn}
                      >
                        <MapIcon size={13} />
                        {activeMapDay === day.day ? "Hide Map" : "Show Map"}
                      </button>
                      
                      <a
                        href={day.mapRecommendation.routeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.mapRouteLink}
                      >
                        <Navigation size={13} />
                        Open Route
                      </a>
                    </div>
                    
                    {activeMapDay === day.day && (
                      <div className={styles.mapWrapper}>
                        <Map
                          dayNum={day.day}
                          locations={day.mapRecommendation.locations}
                          centerLat={day.mapRecommendation.centerLat}
                          centerLng={day.mapRecommendation.centerLng}
                          zoom={day.mapRecommendation.zoom}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Total Estimated Cost */}
      <div className={styles.totalBadge}>
        <div className={styles.totalPill}>
          <span className={styles.totalLabel}>Total Estimated Cost</span>
          <span className={styles.totalValue}>{formatCost(totalEstimate, currency)}</span>
        </div>
      </div>
    </div>
  );
}
