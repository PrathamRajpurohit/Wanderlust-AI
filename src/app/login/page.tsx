"use client";

import React, { useState, Suspense, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import styles from "../auth.module.css";
import { LogIn } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const isRegistered = searchParams.get("registered") === "true";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setEmailError("");
    setPasswordError("");

    let valid = true;
    if (!email) {
      setEmailError("Email is required");
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError("Please enter a valid email");
      valid = false;
    }
    if (!password) {
      setPasswordError("Password is required");
      valid = false;
    }

    if (!valid) return;

    setLoading(true);
    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
        callbackUrl,
      });

      if (res?.error) {
        setError(res.error);
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {isRegistered && !error && (
        <div style={{
          background: "rgba(16, 185, 129, 0.1)",
          border: "1px solid rgba(16, 185, 129, 0.25)",
          color: "#10b981",
          padding: "0.75rem 1rem",
          borderRadius: "var(--radius-sm)",
          fontSize: "0.9rem",
          textAlign: "center"
        }}>
          Registration successful! Please sign in.
        </div>
      )}
      {error && <div className={styles.errorBanner}>{error}</div>}
      
      <div className={styles.formGroup}>
        <label className={styles.label}>Email Address</label>
        <input
          type="email"
          className={styles.input}
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />
        {emailError && <span className={styles.fieldError}>{emailError}</span>}
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Password</label>
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

      <button type="submit" className={styles.submitBtn} disabled={loading}>
        <LogIn size={18} />
        {loading ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [status, router]);

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
        <h2 className={styles.title}>Welcome Back</h2>
        <p className={styles.subtitle}>Sign in to your Wanderlust AI account</p>
        <Suspense fallback={<div style={{ textAlign: "center", color: "var(--text-secondary)" }}>Loading form...</div>}>
          <LoginForm />
        </Suspense>
        <div className={styles.footer}>
          Don&apos;t have an account?{" "}
          <Link href="/register" className={styles.footerLink}>
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
}
