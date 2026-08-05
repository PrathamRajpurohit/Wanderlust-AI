"use client";

import React, { useState, useEffect, useRef } from "react";
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

// Track script loading globally
let googleMapsLoading = false;
let googleMapsLoaded = false;

function loadGoogleMapsScript(apiKey: string, onLoad: () => void) {
  if (typeof window === "undefined") return;
  
  if ((window as any).google?.maps?.places) {
    googleMapsLoaded = true;
    onLoad();
    return;
  }

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
  script.onerror = () => {
    googleMapsLoading = false;
    console.error("Google Maps script failed to load.");
  };
  document.head.appendChild(script);
}

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
  const [useGoogle, setUseGoogle] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const autocompleteServiceRef = useRef<any>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Initialize Google Maps script if API key is present
  useEffect(() => {
    if (apiKey) {
      loadGoogleMapsScript(apiKey, () => {
        setUseGoogle(true);
        if ((window as any).google?.maps?.places) {
          autocompleteServiceRef.current = new (window as any).google.maps.places.AutocompleteService();
        }
      });
    }
  }, [apiKey]);

  // Keep internal input value in sync with external value prop
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch suggestions with debounce
  const fetchSuggestions = (query: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);

    debounceTimerRef.current = setTimeout(async () => {
      if (useGoogle && autocompleteServiceRef.current) {
        // Use Google Maps Autocomplete Service
        try {
          autocompleteServiceRef.current.getPlacePredictions(
            { input: query },
            (predictions: any[] | null, status: string) => {
              setIsLoading(false);
              if (status === "OK" && predictions) {
                const formatted = predictions.map((p) => ({
                  description: p.description,
                  mainText: p.structured_formatting?.main_text || p.description,
                  secondaryText: p.structured_formatting?.secondary_text || "",
                  placeId: p.place_id,
                }));
                setSuggestions(formatted);
                setIsOpen(true);
              } else {
                setSuggestions([]);
                setIsOpen(false);
              }
            }
          );
        } catch (err) {
          console.warn("Google Maps autocomplete failed, falling back to OSM", err);
          fetchOSMSuggestions(query);
        }
      } else {
        // Fallback: OpenStreetMap Nominatim
        await fetchOSMSuggestions(query);
      }
    }, 300);
  };

  const fetchOSMSuggestions = async (query: string) => {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        query
      )}&format=json&addressdetails=1&limit=5`;
      const res = await fetch(url, {
        headers: { "Accept-Language": "en" },
      });
      if (!res.ok) throw new Error("OSM Nominatim API request failed");
      const data = await res.json();
      
      const formatted: Suggestion[] = data.map((item: any) => {
        const parts = item.display_name.split(",");
        const mainText = parts[0]?.trim() || item.name || "Unknown Place";
        const secondaryText = parts.slice(1).map((p: string) => p.trim()).join(", ");
        return {
          description: item.display_name,
          mainText,
          secondaryText,
        };
      });

      setSuggestions(formatted);
      setIsOpen(formatted.length > 0);
    } catch (err) {
      console.error("OSM Nominatim Autocomplete failed:", err);
      setSuggestions([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    onChange(val);
    fetchSuggestions(val);
  };

  const handleSelectSuggestion = (suggestion: Suggestion) => {
    // We can store either the mainText or the full description
    // For general trip planning inputs, the main text + secondary country (e.g. "Paris, France") is best
    const selectedText = suggestion.secondaryText 
      ? `${suggestion.mainText}, ${suggestion.secondaryText}`
      : suggestion.mainText;

    setInputValue(selectedText);
    onChange(selectedText);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        handleSelectSuggestion(suggestions[activeIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div className={styles.wrapper} ref={containerRef}>
      {label && <label className={styles.label}>{label}</label>}
      <div className={styles.inputWrapper}>
        <div className={styles.inputIcon}>
          <MapPin size={18} />
        </div>
        <input
          type="text"
          className={styles.input}
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          required={required}
        />
        {isLoading && (
          <div className={styles.spinnerContainer}>
            <div className={styles.spinner} />
          </div>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className={styles.dropdown}>
          {suggestions.map((s, idx) => (
            <div
              key={idx}
              className={`${styles.item} ${idx === activeIndex ? styles.itemActive : ""}`}
              onClick={() => handleSelectSuggestion(s)}
            >
              <span className={styles.itemName}>{s.mainText}</span>
              {s.secondaryText && <span className={styles.itemSub}>{s.secondaryText}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
