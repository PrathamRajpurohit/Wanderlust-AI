"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Plane, UtensilsCrossed, MapPin, RefreshCw, ThumbsUp, CloudSun, Download } from "lucide-react";
import styles from "./ThinkingAgentUI.module.css";
import { IDay } from "@/lib/agent/types";
import Timeline from "./Timeline";
import { exportToPDF, downloadPDF } from "@/lib/pdfGenerator";

interface TripParams {
  origin?: string;
  destination: string;
  currency: string;
  budget: number;
  startDate: string;
  endDate: string;
  preferences?: string;
}

interface Props {
  tripParams: TripParams;
  onComplete: (tripId: string) => void;
}

type Phase = "streaming" | "draft_ready" | "error" | "submitting";

interface BadgeState {
  label: string;
  icon: React.ReactNode;
  key: string;
  done: boolean;
}

function formatTime(): string {
  return new Date().toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatCost(cost: number, currency: string): string {
  const symbols: Record<string, string> = { INR: "₹", USD: "$", EUR: "€", GBP: "£" };
  const symbol = symbols[currency] || currency;
  return `${symbol}${cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function ThinkingAgentUI({ tripParams, onComplete }: Props) {
  const [logs, setLogs] = useState<{ time: string; msg: string }[]>([]);
  const [phase, setPhase] = useState<Phase>("streaming");
  const [draft, setDraft] = useState<IDay[] | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const terminalRef = useRef<HTMLDivElement>(null);

  const [badges, setBadges] = useState<BadgeState[]>([
    { label: "Hotels", icon: <Building2 size={20} />, key: "hotelAgent", done: false },
    { label: "Flights", icon: <Plane size={20} />, key: "flightAgent", done: false },
    { label: "Restaurants", icon: <UtensilsCrossed size={20} />, key: "restaurantAgent", done: false },
    { label: "Attractions", icon: <MapPin size={20} />, key: "attractionAgent", done: false },
    { label: "Weather", icon: <CloudSun size={20} />, key: "weatherAgent", done: false },
  ]);

  const addLog = useCallback((msg: string) => {
    setLogs((prev) => [...prev, { time: formatTime(), msg }]);
    setBadges((prev) =>
      prev.map((b) => {
        if (
          msg.toLowerCase().includes(b.key.toLowerCase()) &&
          (msg.toLowerCase().includes("done") || msg.toLowerCase().includes("complete"))
        ) {
          return { ...b, done: true };
        }
        return b;
      })
    );
  }, []);

  const resetForStream = useCallback(() => {
    setLogs([]);
    setDraft(null);
    setErrorMsg("");
    setBadges((prev) => prev.map((b) => ({ ...b, done: false })));
  }, []);

  const startStream = useCallback(async () => {
    resetForStream();
    setPhase("streaming");

    try {
      const res = await fetch("/api/plan-trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tripParams),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        const errMsg =
          res.status === 401
            ? "You must be signed in to plan a trip. Please log in and try again."
            : err.error || "Failed to start planning session.";
        setErrorMsg(errMsg);
        setPhase("error");
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) {
        setErrorMsg("Unable to read SSE stream.");
        setPhase("error");
        return;
      }

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          try {
            const payload = JSON.parse(trimmed.slice(6));
            if (payload.type === "agent_log") {
              addLog(payload.message);
              if (payload.threadId) setThreadId(payload.threadId);
            } else if (payload.type === "draft_ready") {
              if (payload.threadId) setThreadId(payload.threadId);
              setDraft(payload.draft);
              addLog("[system] Draft itinerary ready for review.");
              setBadges((prev) => prev.map((b) => ({ ...b, done: true })));
              setPhase("draft_ready");
            } else if (payload.type === "error") {
              setErrorMsg(payload.message || "An agent error occurred.");
              setPhase("error");
            }
          } catch {
            /* ignore parse errors */
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error while streaming.";
      setErrorMsg(msg);
      setPhase("error");
    }
  }, [tripParams, addLog, resetForStream]);

  // Start on mount
  useEffect(() => {
    startStream();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const handleApprove = async () => {
    if (!threadId || !draft) return;
    setPhase("submitting");
    try {
      const res = await fetch("/api/plan-trip/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, approved: true, draft }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to save trip.");
        setPhase("draft_ready");
        return;
      }
      onComplete(data.tripId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving trip.";
      setErrorMsg(msg);
      setPhase("draft_ready");
    }
  };

  const handleExportPDF = () => {
    if (!draft) return;
    const totalCost = draft.reduce((sum, d) => sum + (d.dailyEstimate || 0), 0);
    exportToPDF(
      tripParams.destination,
      tripParams.startDate,
      tripParams.endDate,
      totalCost,
      tripParams.currency,
      draft
    );
  };

  const handleDownloadPDF = () => {
    if (!draft) return;
    const totalCost = draft.reduce((sum, d) => sum + (d.dailyEstimate || 0), 0);
    downloadPDF(
      tripParams.destination,
      tripParams.startDate,
      tripParams.endDate,
      totalCost,
      tripParams.currency,
      draft
    );
  };

  const handleRevise = async () => {
    if (!threadId || !feedback.trim()) return;
    resetForStream();
    setPhase("streaming");

    try {
      const res = await fetch("/api/plan-trip/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, approved: false, feedback }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        setErrorMsg(err.error || "Failed to start revision.");
        setPhase("error");
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) {
        setErrorMsg("Unable to read revision stream.");
        setPhase("error");
        return;
      }

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          try {
            const payload = JSON.parse(trimmed.slice(6));
            if (payload.type === "agent_log") {
              addLog(payload.message);
            } else if (payload.type === "draft_ready") {
              setDraft(payload.draft);
              addLog("[system] Revised draft ready for review.");
              setBadges((prev) => prev.map((b) => ({ ...b, done: true })));
              setPhase("draft_ready");
              setFeedback("");
            } else if (payload.type === "error") {
              setErrorMsg(payload.message || "An error occurred during revision.");
              setPhase("error");
            }
          } catch {
            /* ignore */
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error during revision.";
      setErrorMsg(msg);
      setPhase("error");
    }
  };

  const isStreaming = phase === "streaming";
  const isDraft = phase === "draft_ready";
  const isSubmitting = phase === "submitting";

  return (
    <div className={styles.wrapper}>
      {/* ── Status Badges ── */}
      <div className={styles.badges}>
        {badges.map((b) => (
          <div key={b.key} className={`${styles.badge} ${b.done ? styles.done : ""}`}>
            <div className={styles.badgeIcon}>{b.icon}</div>
            <span className={styles.badgeLabel}>{b.label}</span>
            <span className={styles.badgeStatus}>{b.done ? "done ✓" : "searching…"}</span>
          </div>
        ))}
      </div>

      {/* ── Error Banner ── */}
      {errorMsg && (
        <div className={styles.errorBanner}>
          <span>{errorMsg}</span>
          <button
            className={styles.btnTryAgain}
            onClick={() => { setErrorMsg(""); startStream(); }}
          >
            Try Again
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* ── Terminal Panel (visible during streaming + briefly during draft) ── */}
        {(isStreaming || (isDraft && logs.length > 0)) && (
          <motion.div
            key="terminal"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className={styles.terminalCard}
          >
            <div className={styles.terminalHeader}>
              <div className={styles.dot} style={{ background: "#ef4444" }} />
              <div className={styles.dot} style={{ background: "#f59e0b" }} />
              <div className={styles.dot} style={{ background: "#10b981" }} />
              <span className={styles.terminalTitle}>wanderlust-ai — agent pipeline</span>
            </div>
            <div className={styles.terminalBody} ref={terminalRef}>
              {logs.length === 0 ? (
                <>
                  <div className={styles.skeletonLine} style={{ width: "60%" }} />
                  <div className={styles.skeletonLine} style={{ width: "80%" }} />
                  <div className={styles.skeletonLine} style={{ width: "50%" }} />
                </>
              ) : (
                logs.map((l, i) => (
                  <div key={i} className={styles.terminalLine}>
                    <span className={styles.terminalTime}>[{l.time}]</span>
                    <span className={styles.terminalMsg}>{l.msg}</span>
                  </div>
                ))
              )}
              {isStreaming && <span className={styles.cursor} />}
            </div>
          </motion.div>
        )}

        {/* ── Draft Panel ── */}
        {(isDraft || isSubmitting) && draft && (
          <motion.div
            key="draft"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <div className={styles.draftHeader} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <div>
                <h3 className={styles.draftTitle}>Your Itinerary Draft</h3>
                <span className={styles.draftBadge}>Ready for Review</span>
              </div>
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
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
              </div>
            </div>

            <div style={{ marginBottom: "2rem" }}>
              <Timeline itinerary={draft} destination={tripParams.destination} currency={tripParams.currency} />
            </div>

            {/* Feedback & Actions */}
            <div className={styles.feedbackSection}>
              <div className={styles.feedbackLabel}>Request Changes (Optional)</div>
              <textarea
                className={styles.feedbackTextarea}
                placeholder="e.g. Replace Hotel X with something cheaper, add a day trip, focus more on local cuisine…"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                disabled={isSubmitting}
              />
              <div className={styles.actionRow}>
                <button
                  className={styles.btnRevise}
                  onClick={handleRevise}
                  disabled={!feedback.trim() || isSubmitting}
                >
                  <RefreshCw size={16} />
                  Revise with Feedback
                </button>
                <button
                  className={styles.btnApprove}
                  onClick={handleApprove}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }} />
                      Saving…
                    </>
                  ) : (
                    <>
                      <ThumbsUp size={16} /> Approve &amp; Save
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
