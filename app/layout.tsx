import type { Metadata } from "next";
import "./globals.css";
import { Sidebar, MobileNav } from "@/components/layout/Sidebar";

export const metadata: Metadata = {
  title: "EtsyGen — Digital Product Generator",
  description: "Generate high-quality digital products for your Etsy shop",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 min-h-screen overflow-y-auto pb-20 md:pb-0">
            {children}
          </main>
        </div>
        <MobileNav />
      </body>
    </html>
  );
}
