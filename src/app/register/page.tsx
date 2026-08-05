"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import styles from "../auth.module.css";
import { UserPlus } from "lucide-react";

export default function RegisterPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [status, router]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNameError("");
    setEmailError("");
    setPasswordError("");
    setConfirmPasswordError("");

    let valid = true;
    if (!name.trim()) {
      setNameError("Full name is required");
      valid = false;
    }
    if (!email) {
      setEmailError("Email address is required");
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError("Please enter a valid email address");
      valid = false;
    }
    if (!password) {
      setPasswordError("Password is required");
      valid = false;
    } else if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters long");
      valid = false;
    }
    if (!confirmPassword) {
      setConfirmPasswordError("Please confirm your password");
      valid = false;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match");
      valid = false;
    }

    if (!valid) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed. Please try again.");
      } else {
        router.push("/login?registered=true");
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected network error occurred. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || status === "authenticated") {
    return (
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        height: "100vh", 
        color: "var(--text-secondary)",
        fontFamily: "sans-serif"
      }}>
        Checking session and redirecting...
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.title}>Create Account</h2>
        <p className={styles.subtitle}>Begin planning your travel routes today</p>
        
        <form className={styles.form} onSubmit={handleSubmit}>
          {error && <div className={styles.errorBanner}>{error}</div>}

          <div className={styles.formGroup}>
            <label className={styles.label}>Full Name</label>
            <input
              type="text"
              className={styles.input}
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
            {nameError && <span className={styles.fieldError}>{nameError}</span>}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Email Address</label>
            <input
              type="email"
              className={styles.input}
              placeholder="john@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
            {emailError && <span className={styles.fieldError}>{emailError}</span>}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Password (Min 8 characters)</label>
            <input
              type="password"
              className={styles.input}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            {passwordError && <span className={styles.fieldError}>{passwordError}</span>}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Confirm Password</label>
            <input
              type="password"
              className={styles.input}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
            />
            {confirmPasswordError && <span className={styles.fieldError}>{confirmPasswordError}</span>}
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            <UserPlus size={18} />
            {loading ? "Registering account..." : "Register"}
          </button>
        </form>

        <div className={styles.footer}>
          Already have an account?{" "}
          <Link href="/login" className={styles.footerLink}>
            Sign in here
          </Link>
        </div>
      </div>
    </div>
  );
}
