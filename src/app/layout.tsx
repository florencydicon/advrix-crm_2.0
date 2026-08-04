import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#111424",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Prevents zooming on mobile
};

export const metadata: Metadata = {
  title: "Advrix Media CRM",
  description: "Automated Agency CRM v3.0",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-app-bg text-gray-900 antialiased min-h-screen flex overflow-hidden">
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          {children}
        </div>
      </body>
    </html>
  );
}