import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";
import SessionProviderWrapper from "@/components/SessionProviderWrapper";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "Wanderlust AI - Your AI Travel Companion",
  description: "Plan your next adventure with the help of parallel research agents, custom budget calculations, and human-in-the-loop refinements.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <SessionProviderWrapper>
          <ThemeProvider>
            <Navigation />
            <main style={{ minHeight: "calc(100vh - 70px)" }}>
              {children}
            </main>
          </ThemeProvider>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
