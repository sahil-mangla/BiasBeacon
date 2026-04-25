import Sidebar from "@/components/layout/Sidebar";
import FooterTicker from "@/components/layout/FooterTicker";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 min-h-screen overflow-y-auto pb-20">
        {children}
      </main>
      <FooterTicker />
    </div>
  );
}
