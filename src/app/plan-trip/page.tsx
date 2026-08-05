"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./plan-trip.module.css";
import ThinkingAgentUI from "@/components/ThinkingAgentUI";
import { ArrowRight, ArrowLeft, Send } from "lucide-react";
import AutocompleteInput from "@/components/AutocompleteInput";

const TAG_OPTIONS = [
  "Adventure",
  "Culture",
  "Food",
  "Beach",
  "Nightlife",
  "Budget",
  "Luxury",
  "Family-Friendly",
  "Vegetarian",
];

export default function PlanTripPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward

  // Form fields
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  
  const [currency, setCurrency] = useState("INR");
  const [budget, setBudget] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [preferencesText, setPreferencesText] = useState("");

  // Validation errors
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateStep = () => {
    const nextErrors: { [key: string]: string } = {};
    if (step === 1) {
      if (!destination.trim()) {
        nextErrors.destination = "Destination is required";
      }
    } else if (step === 2) {
      if (!budget) {
        nextErrors.budget = "Budget is required";
      } else if (Number(budget) <= 0) {
        nextErrors.budget = "Budget must be greater than 0";
      }
      if (!startDate) {
        nextErrors.startDate = "Start date is required";
      }
      if (!endDate) {
        nextErrors.endDate = "End date is required";
      } else if (startDate && new Date(endDate) <= new Date(startDate)) {
        nextErrors.endDate = "End date must be after start date";
      }
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      setDirection(1);
      setStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setDirection(-1);
    setStep((prev) => prev - 1);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep()) {
      setDirection(1);
      setStep(4); // Mount the Thinking Agent UI
    }
  };

  const handleComplete = (tripId: string) => {
    router.push("/dashboard");
    router.refresh();
  };

  const progressPercent = step === 1 ? 33 : step === 2 ? 66 : 100;

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 50 : -50,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: {
        duration: 0.3,
        ease: "easeOut" as const,
      },
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -50 : 50,
      opacity: 0,
      transition: {
        duration: 0.25,
        ease: "easeIn" as const,
      },
    }),
  };

  if (step === 4) {
    const tagsString = selectedTags.join(", ");
    const preferencesCombined = [
      tagsString ? `Preferences: ${tagsString}` : "",
      preferencesText ? `Notes: ${preferencesText}` : "",
    ]
      .filter(Boolean)
      .join(". ");

    const tripParams = {
      origin: origin.trim() || undefined,
      destination: destination.trim(),
      currency,
      budget: Number(budget),
      startDate,
      endDate,
      preferences: preferencesCombined || undefined,
    };

    return (
      <div className={styles.container}>
        <ThinkingAgentUI tripParams={tripParams} onComplete={handleComplete} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.wizardBox}>
        {/* Animated Stepper Progress Bar */}
        <div className={styles.progressBarContainer}>
          <div
            className={styles.progressBar}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <AnimatePresence custom={direction} mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <h2 className={styles.stepTitle}>Where are you heading?</h2>
              <p className={styles.stepSubtitle}>Step 1 of 3: Enter your travel endpoints</p>

              <div className={styles.formGrid}>
                <AutocompleteInput
                  label="Starting Location (Optional)"
                  placeholder="e.g. India, New York, London"
                  value={origin}
                  onChange={setOrigin}
                />

                <AutocompleteInput
                  label="Destination (Required)"
                  placeholder="e.g. Paris, Tokyo, Bali"
                  value={destination}
                  onChange={setDestination}
                  required
                />
                {errors.destination && (
                  <span className={styles.fieldError}>{errors.destination}</span>
                )}
              </div>

              <div className={styles.btnRow} style={{ justifyContent: "flex-end" }}>
                <button type="button" onClick={handleNext} className={styles.btnPrimary}>
                  Next Step <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <h2 className={styles.stepTitle}>Budget and Timeline</h2>
              <p className={styles.stepSubtitle}>Step 2 of 3: Enter dates and trip budgets</p>

              <div className={styles.formGrid}>
                <div className={styles.dateRow}>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Currency</label>
                    <select
                      className={styles.select}
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                    >
                      <option value="INR">INR (₹)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Total Budget</label>
                    <input
                      type="number"
                      className={styles.input}
                      placeholder="e.g. 50000"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                    />
                    {errors.budget && (
                      <span className={styles.fieldError}>{errors.budget}</span>
                    )}
                  </div>
                </div>

                <div className={styles.dateRow}>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Departure Date</label>
                    <input
                      type="date"
                      className={styles.input}
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                    {errors.startDate && (
                      <span className={styles.fieldError}>{errors.startDate}</span>
                    )}
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Return Date</label>
                    <input
                      type="date"
                      className={styles.input}
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                    {errors.endDate && (
                      <span className={styles.fieldError}>{errors.endDate}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className={styles.btnRow}>
                <button type="button" onClick={handleBack} className={styles.btnSecondary}>
                  <ArrowLeft size={16} /> Back
                </button>
                <button type="button" onClick={handleNext} className={styles.btnPrimary}>
                  Next Step <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <h2 className={styles.stepTitle}>Tell us about your style</h2>
              <p className={styles.stepSubtitle}>Step 3 of 3: Selected tags and preferences</p>

              <div className={styles.formGrid}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Style Tags (Select multiple)</label>
                  <div className={styles.chipsContainer}>
                    {TAG_OPTIONS.map((tag) => {
                      const isActive = selectedTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className={`${styles.chip} ${isActive ? styles.chipActive : ""}`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Specific Requirements / Preferences</label>
                  <textarea
                    className={styles.textarea}
                    placeholder="e.g. Vegetarian restaurants, stay close to public transit, focus on museum tours..."
                    value={preferencesText}
                    onChange={(e) => setPreferencesText(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.btnRow}>
                <button type="button" onClick={handleBack} className={styles.btnSecondary}>
                  <ArrowLeft size={16} /> Back
                </button>
                <button type="button" onClick={handleSubmit} className={styles.btnPrimary}>
                  Generate Plan <Send size={16} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
