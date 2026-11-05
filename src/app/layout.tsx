import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dhanushworks Installer — Independent Portfolio Provisioning",
  description: "Provision your own independent research portfolio and workspace on GitHub, Supabase, and Vercel.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        {children}
      </body>
    </html>
  );
}
