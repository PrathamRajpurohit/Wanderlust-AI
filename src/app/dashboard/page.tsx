import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Globe, Plus } from "lucide-react";
import TripCard from "./TripCard";
import styles from "./dashboard.module.css";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  const userId = (session.user as any).id;

  const trips = await prisma.trip.findMany({
    where: { userId, status: "FINALIZED" },
    orderBy: { startDate: "desc" },
  });

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>My Trips</h1>
          <p className={styles.pageSubtitle}>
            {trips.length > 0
              ? `${trips.length} finalized itinerar${trips.length === 1 ? "y" : "ies"}`
              : "Plan your first trip below"}
          </p>
        </div>
        <Link href="/plan-trip" className={styles.btnPlan}>
          <Plus size={18} /> Plan New Trip
        </Link>
      </div>

      {trips.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <Globe size={64} style={{ margin: "0 auto", display: "block", opacity: 0.4 }} />
          </div>
          <h2 className={styles.emptyTitle}>No trips yet</h2>
          <p className={styles.emptyDesc}>
            Your AI-generated travel plans will appear here once finalized. Start exploring!
          </p>
          <Link href="/plan-trip" className={styles.btnCta}>
            <Plus size={18} /> Plan Your First Trip
          </Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}
    </div>
  );
}
