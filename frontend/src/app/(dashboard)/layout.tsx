import Sidebar from "@/components/layout/Sidebar";
import FooterTicker from "@/components/layout/FooterTicker";
import NarrationPanel from "@/components/layout/NarrationPanel";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex">
      {/* Demo Watermark */}
      <div className="fixed top-6 right-6 z-[100] pointer-events-none">
        <span className="font-mono text-[10px] font-bold text-charcoal/20 border border-charcoal/10 px-2 py-1 rounded tracking-[0.2em] bg-white/5 backdrop-blur-sm">
          DEMO MODE ACTIVE
        </span>
      </div>

      <Sidebar />
      <main className="flex-1 min-h-screen overflow-y-auto pb-20">
        {children}
      </main>
      <FooterTicker />
      <NarrationPanel />
    </div>
  );
}
