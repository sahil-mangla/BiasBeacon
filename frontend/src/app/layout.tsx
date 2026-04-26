import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import FooterTicker from "@/components/layout/FooterTicker";

export const metadata: Metadata = {
  title: "Bias Beacon | Soulful Data",
  description: "Moving from Silicon Valley Cold to Social Science Warm. Empathetic fairness monitoring and bias mitigation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Outfit:wght@300;400;600&family=JetBrains+Mono:wght@400;700&display=swap" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
      </head>
      <body className="font-outfit text-charcoal bg-background min-h-screen relative overflow-x-hidden">
        {/* Top Progress Bar */}
        <div className="fixed top-0 left-0 right-0 h-[1px] bg-amber-400 z-50 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
        
        <div className="grain-overlay opacity-[0.03] pointer-events-none fixed inset-0 z-[60]" />
        <div className="mesh-gradient-bg fixed inset-0 z-[-1] opacity-[0.15]" />
        
        {children}
      </body>
    </html>
  );
}
