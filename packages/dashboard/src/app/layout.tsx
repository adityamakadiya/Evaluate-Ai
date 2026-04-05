import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { LayoutDashboard, MessageSquare, BarChart3, Settings } from "lucide-react";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EvaluateAI",
  description: "AI coding assistant evaluation dashboard",
};

const navItems = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/sessions", label: "Sessions", icon: MessageSquare },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex bg-[#0a0a0a] text-[#ededed]">
        {/* Sidebar */}
        <aside className="fixed inset-y-0 left-0 z-30 flex w-56 flex-col border-r border-[var(--card-border)] bg-[var(--card)]">
          <div className="flex h-14 items-center gap-2 px-5 border-b border-[var(--card-border)]">
            <div className="h-7 w-7 rounded-md bg-[var(--accent)] flex items-center justify-center text-white font-bold text-sm">
              E
            </div>
            <span className="text-base font-semibold tracking-tight">EvaluateAI</span>
          </div>

          <nav className="flex-1 flex flex-col gap-1 px-3 py-4">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-[var(--muted)] transition-colors hover:bg-white/5 hover:text-[var(--foreground)]"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="ml-56 flex-1 min-h-screen">
          <div className="px-8 py-6">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
