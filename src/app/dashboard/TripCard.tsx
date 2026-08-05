"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download } from "lucide-react";
import Timeline from "@/components/Timeline";
import styles from "./dashboard.module.css";
import { IDay } from "@/lib/agent/types";
import { exportToPDF, downloadPDF } from "@/lib/pdfGenerator";

interface Trip {
  id: string;
  destination: string;
  startDate: Date;
  endDate: Date;
  totalEstimatedCost: number | null;
  currency: string;
  status: string;
  itinerary: string | null;
}

interface Props {
  trip: Trip;
}

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

function formatCost(cost: number, currency: string): string {
  const symbols: Record<string, string> = { INR: "₹", USD: "$", EUR: "€", GBP: "£" };
  const symbol = symbols[currency] || currency;
  return `${symbol}${cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

// Pick an emoji based on destination
function getDestinationEmoji(dest: string): string {
  const d = dest.toLowerCase();
  if (d.includes("paris") || d.includes("france")) return "🗼";
  if (d.includes("japan") || d.includes("tokyo")) return "🗾";
  if (d.includes("bali") || d.includes("indonesia")) return "🌴";
  if (d.includes("new york") || d.includes("usa")) return "🗽";
  if (d.includes("london") || d.includes("uk")) return "🇬🇧";
  if (d.includes("dubai")) return "🌆";
  if (d.includes("mountain") || d.includes("himalayas")) return "⛰️";
  if (d.includes("beach") || d.includes("maldives")) return "🏖️";
  if (d.includes("rome") || d.includes("italy")) return "🏛️";
  return "✈️";
}

export default function TripCard({ trip }: Props) {
  const [showModal, setShowModal] = useState(false);

  let itinerary: IDay[] | null = null;
  if (trip.itinerary) {
    try {
      itinerary = JSON.parse(trip.itinerary);
    } catch {
      itinerary = null;
    }
  }

  const handleExportPDF = () => {
    if (!itinerary) return;
    exportToPDF(
      trip.destination,
      trip.startDate,
      trip.endDate,
      trip.totalEstimatedCost,
      trip.currency,
      itinerary
    );
  };

  const handleDownloadPDF = () => {
    if (!itinerary) return;
    downloadPDF(
      trip.destination,
      trip.startDate,
      trip.endDate,
      trip.totalEstimatedCost,
      trip.currency,
      itinerary
    );
  };

  return (
    <>
      <div className={styles.tripCard} onClick={() => setShowModal(true)}>
        <div className={styles.tripCardBanner}>
          {getDestinationEmoji(trip.destination)}
        </div>
        <div className={styles.tripCardBody}>
          <div className={styles.tripDestination}>{trip.destination}</div>
          <div className={styles.tripDates}>
            📅 {formatDate(trip.startDate)} → {formatDate(trip.endDate)}
          </div>
          <div className={styles.tripMeta}>
            <span className={styles.tripCost}>
              {trip.totalEstimatedCost != null
                ? formatCost(trip.totalEstimatedCost, trip.currency)
                : "—"}
            </span>
            <span className={styles.tripStatus}>{trip.status}</span>
          </div>
          <button className={styles.viewBtn} onClick={(e) => { e.stopPropagation(); setShowModal(true); }}>
            View Itinerary →
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowModal(false)}
          >
            <motion.div
              className={styles.modal}
              initial={{ opacity: 0, y: 30, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <div>
                  <h2 className={styles.modalTitle}>{trip.destination}</h2>
                  <div className={styles.modalSubtitle}>
                    {formatDate(trip.startDate)} → {formatDate(trip.endDate)}
                    {trip.totalEstimatedCost != null && (
                      <> · Total: {formatCost(trip.totalEstimatedCost, trip.currency)}</>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                  {itinerary && itinerary.length > 0 && (
                    <>
                      <button 
                        onClick={handleDownloadPDF}
                        style={{
                          background: "var(--accent-primary)",
                          color: "var(--text-primary)",
                          border: "none",
                          borderRadius: "var(--radius-sm)",
                          padding: "0.5rem 1rem",
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          transition: "all 0.2s"
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = "var(--accent-secondary)"; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = "var(--accent-primary)"; }}
                      >
                        <Download size={15} /> Download PDF
                      </button>
                      <button 
                        onClick={handleExportPDF}
                        style={{
                          background: "transparent",
                          color: "var(--text-secondary)",
                          border: "1px solid var(--border)",
                          borderRadius: "var(--radius-sm)",
                          padding: "0.5rem 1rem",
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          transition: "all 0.2s"
                        }}
                        onMouseOver={(e) => { 
                          e.currentTarget.style.borderColor = "var(--text-secondary)"; 
                          e.currentTarget.style.color = "var(--text-primary)"; 
                        }}
                        onMouseOut={(e) => { 
                          e.currentTarget.style.borderColor = "var(--border)"; 
                          e.currentTarget.style.color = "var(--text-secondary)"; 
                        }}
                      >
                        Export/Print
                      </button>
                    </>
                  )}
                  <button className={styles.modalClose} onClick={() => setShowModal(false)}>
                    <X size={18} />
                  </button>
                </div>
              </div>

              {itinerary && itinerary.length > 0 ? (
                <Timeline itinerary={itinerary} destination={trip.destination} currency={trip.currency} />
              ) : (
                <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "2rem" }}>
                  No itinerary details found.
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
