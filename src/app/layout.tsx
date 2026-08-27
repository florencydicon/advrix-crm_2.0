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
      { url: "/logo-mark-wt.png", media: "(prefers-color-scheme: light)" },
      { url: "/logo-mark.png", media: "(prefers-color-scheme: dark)" },
    ],
    apple: [{ url: "/logo-mark.png", sizes: "180x180" }],
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