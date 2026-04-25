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
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600&family=Nunito:wght@400;700&display=swap" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
      </head>
      <body className="font-sans text-charcoal bg-background min-h-screen">
        <div className="grain-overlay" />
        {children}
      </body>
    </html>
  );
}
