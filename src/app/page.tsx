"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Search, UserCheck, Calendar, Compass } from "lucide-react";
import styles from "./page.module.css";

export default function Home() {
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
        Loading...
      </div>
    );
  }
  // Animation variants for staggered cards
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut" as const,
      },
    },
  };

  return (
    <div className={styles.main}>
      {/* Background ambient light */}
      <div className="ambient-light" />

      {/* Hero Section */}
      <section className={styles.hero}>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className={styles.iconWrapper} style={{ margin: "0 auto 1.5rem" }}>
            <Compass size={28} />
          </div>
          <h1 className={styles.headline}>
            Your AI Travel Companion
          </h1>
          <p className={styles.subheading}>
            Say goodbye to endless browser tabs. Wanderlust AI deploys parallel research agents to find flights, hotels, and local attractions, all refined in real-time by you.
          </p>
        </motion.div>

        <motion.div
          className={styles.ctas}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Link href="/register" className={styles.primaryCta}>
            Get Started
          </Link>
          <Link href="/plan-trip" className={styles.secondaryCta}>
            See Demo
          </Link>
        </motion.div>
      </section>

      {/* Features Section */}
      <motion.section
        className={styles.featuresGrid}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div className={styles.featureCard} variants={cardVariants}>
          <div className={styles.iconWrapper}>
            <Search size={24} />
          </div>
          <h3 className={styles.featureTitle}>Parallel Research Agents</h3>
          <p className={styles.featureDesc}>
            Four specialized agents coordinate to scan web directories for hotels, flight paths, dining hot spots, and sights simultaneously.
          </p>
        </motion.div>

        <motion.div className={styles.featureCard} variants={cardVariants}>
          <div className={styles.iconWrapper}>
            <UserCheck size={24} />
          </div>
          <h3 className={styles.featureTitle}>Human-in-the-Loop Review</h3>
          <p className={styles.featureDesc}>
            Approve recommendations or command updates. Feed direct suggestions to the pipeline to dynamically adjust plans.
          </p>
        </motion.div>

        <motion.div className={styles.featureCard} variants={cardVariants}>
          <div className={styles.iconWrapper}>
            <Calendar size={24} />
          </div>
          <h3 className={styles.featureTitle}>Instant Itineraries</h3>
          <p className={styles.featureDesc}>
            Synthesize all agent research and preferences into a beautiful vertical chronological roadmap containing travel and budget specifics.
          </p>
        </motion.div>
      </motion.section>
    </div>
  );
}
