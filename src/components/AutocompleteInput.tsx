"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { MapPin } from "lucide-react";
import styles from "./AutocompleteInput.module.css";

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  required?: boolean;
}

interface Suggestion {
  description: string;
  mainText: string;
  secondaryText: string;
  placeId?: string;
}

// ─── OSM Nominatim fallback ─────────────────────────────────────────────────

async function fetchOSMSuggestions(query: string): Promise<Suggestion[]> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
    query
  )}&format=json&addressdetails=1&limit=6&featureType=city`;

  const res = await fetch(url, {
    headers: { "Accept-Language": "en" },
  });
  if (!res.ok) throw new Error("OSM request failed");

  const data = await res.json();

  return data.map((item: any) => {
    const addr = item.address ?? {};
    // Build a clean main text: prefer city/town/village/county, fallback to first part of display_name
    const mainText =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.county ||
      addr.state ||
      addr.country ||
      item.display_name.split(",")[0].trim();

    // Build a tidy secondary: State + Country (at most)
    const secondary = [addr.state, addr.country]
      .filter(Boolean)
      .join(", ");

    return {
      description: item.display_name,
      mainText,
      secondaryText: secondary,
    };
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AutocompleteInput({
  value,
  onChange,
  placeholder = "Search location...",
  label,
  error,
  required = false,
}: AutocompleteInputProps) {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Sync external value → internal input (e.g. when parent resets form)
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  // ─── Fetch suggestions ────────────────────────────────────────────────────

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);

    try {
      // 1️⃣  Try our server-side Google Places proxy first
      const proxyRes = await fetch(
        `/api/places/autocomplete?input=${encodeURIComponent(query)}`
      );
      const proxyData = proxyRes.ok ? await proxyRes.json() : null;

      if (proxyData && !proxyData.fallback && proxyData.predictions?.length > 0) {
        setSuggestions(proxyData.predictions);
        setIsOpen(true);
        setIsLoading(false);
        return;
      }

      // 2️⃣  Fallback: OpenStreetMap Nominatim
      const osmResults = await fetchOSMSuggestions(query);
      setSuggestions(osmResults);
      setIsOpen(osmResults.length > 0);
    } catch (err) {
      console.error("Autocomplete error:", err);
      setSuggestions([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ─── Debounced input handler ──────────────────────────────────────────────

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    onChange(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  };

  // ─── Select a suggestion ──────────────────────────────────────────────────

  const handleSelect = (suggestion: Suggestion) => {
    // Use "City, Country" format — clean and useful for the AI planner
    const selected = suggestion.secondaryText
      ? `${suggestion.mainText}, ${suggestion.secondaryText}`
      : suggestion.mainText;

    setInputValue(selected);
    onChange(selected);
    setSuggestions([]);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  // ─── Keyboard navigation ──────────────────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0) handleSelect(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className={styles.wrapper} ref={containerRef}>
      {label && <label className={styles.label}>{label}</label>}

      <div className={styles.inputWrapper}>
        <div className={styles.inputIcon}>
          <MapPin size={18} />
        </div>

        <input
          type="text"
          className={`${styles.input} ${error ? styles.inputError : ""}`}
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          required={required}
          autoComplete="off"
          spellCheck={false}
        />

        {isLoading && (
          <div className={styles.spinnerContainer}>
            <div className={styles.spinner} />
          </div>
        )}
      </div>

      {error && <span className={styles.fieldError}>{error}</span>}

      {isOpen && suggestions.length > 0 && (
        <div className={styles.dropdown} role="listbox">
          {suggestions.map((s, idx) => (
            <div
              key={s.placeId ?? idx}
              role="option"
              aria-selected={idx === activeIndex}
              className={`${styles.item} ${idx === activeIndex ? styles.itemActive : ""}`}
              onMouseDown={(e) => {
                // mousedown fires before blur; prevent input blur before we can select
                e.preventDefault();
                handleSelect(s);
              }}
            >
              <span className={styles.itemName}>{s.mainText}</span>
              {s.secondaryText && (
                <span className={styles.itemSub}>{s.secondaryText}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
