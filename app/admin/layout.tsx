import AdminSidebar from "@/components/AdminSidebar";
import AwaAssistant from "@/components/assistant";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      <AdminSidebar />
      <main className="flex-1 pb-20 lg:pb-0">{children}</main>
      <AwaAssistant />
    </div>
  );
}
