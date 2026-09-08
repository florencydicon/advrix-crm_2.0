import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-brand",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1D2A32",
};

export const metadata: Metadata = {
  title: "Advrix CRM — Creative Agency Workflow",
  description: "High-performance CRM & automated task handoff for creative production teams.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      // Fav icon — as before: dark mode white logo, light mode dark logo
      { url: "/logo-mark.png", media: "(prefers-color-scheme: light)" },
      { url: "/logo-mark-wt.png", media: "(prefers-color-scheme: dark)" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      // Mobile app icon — dark mode DMAI, light mode LMAI
      { url: "/DMAI.png", media: "(prefers-color-scheme: dark)", sizes: "601x601", type: "image/png" },
      { url: "/LMAI.png", media: "(prefers-color-scheme: light)", sizes: "601x601", type: "image/png" },
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/apple-touch-icon-light.png", media: "(prefers-color-scheme: light)", sizes: "180x180", type: "image/png" },
    ],
    shortcut: ["/icon-192.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Advrix CRM",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} ${poppins.variable} font-sans antialiased`} suppressHydrationWarning>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}