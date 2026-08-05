"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import styles from "./Navigation.module.css";
import { LogOut, Menu, X, User, Sun, Moon } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export default function Navigation() {
  const { data: session, status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const isAuthenticated = status === "authenticated";

  return (
    <nav className={styles.navContainer}>
      <div className={styles.navContent}>
        {/* Logo left */}
        <Link href="/" className={styles.logo} onClick={() => setMobileMenuOpen(false)}>
          <span className={styles.logoIcon}>✈</span> Wanderlust AI
        </Link>

        {/* Links center (hidden on mobile unless active) */}
        <div className={`${styles.navLinks} ${mobileMenuOpen ? styles.mobileOpen : ""}`}>
          <Link href="/" className={styles.link} onClick={() => setMobileMenuOpen(false)}>
            Home
          </Link>
          {isAuthenticated && (
            <>
              <Link href="/dashboard" className={styles.link} onClick={() => setMobileMenuOpen(false)}>
                Dashboard
              </Link>
              <Link href="/plan-trip" className={styles.link} onClick={() => setMobileMenuOpen(false)}>
                Plan Trip
              </Link>
            </>
          )}
        </div>

        {/* User state + theme toggle right */}
        <div className={styles.rightSection}>
          {isAuthenticated ? (
            <div className={styles.userControls}>
              <div className={styles.avatar} title={session.user?.email || "User"}>
                {session.user?.name ? session.user.name[0].toUpperCase() : <User size={16} />}
              </div>
              <button onClick={() => signOut({ callbackUrl: "/" })} className={styles.signOutBtn} title="Sign Out">
                <LogOut size={18} />
                <span className={styles.signOutText}>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className={styles.authLinks}>
              <Link href="/login" className={styles.loginBtn}>Login</Link>
              <Link href="/register" className={styles.registerBtn}>Register</Link>
            </div>
          )}

          {/* Theme toggle */}
          <button
            className={styles.themeToggle}
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Mobile toggle */}
          <button className={styles.mobileToggle} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
    </nav>
  );
}
