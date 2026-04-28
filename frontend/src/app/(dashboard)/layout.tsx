import Sidebar from "@/components/layout/Sidebar";
import FooterTicker from "@/components/layout/FooterTicker";
import NarrationPanel from "@/components/layout/NarrationPanel";
import DashboardWatermark from "@/components/ui/DashboardWatermark";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex">
      <DashboardWatermark />
      <Sidebar />
      <main className="flex-1 min-h-screen overflow-y-auto pb-20">
        {children}
      </main>
      <FooterTicker />
      <NarrationPanel />
    </div>
  );
}

