import { SiteFooter, SiteHeader } from "@/components/layout/site-chrome";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-brand-50/40 via-white to-brand-50/30">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
