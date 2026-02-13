import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { InventoryOverviewBar } from "@/components/common/InventoryOverviewBar";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  fallback: ["Arial", "Tahoma", "sans-serif"],
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: "KStore - نظام إدارة المخزون والمبيعات",
  description: "نظام متكامل لإدارة المخزون والمبيعات مع دعم قارئ الباركود - يعمل بدون إنترنت",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "KStore",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icon-192.png",
  },
  themeColor: "#3b82f6",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#3b82f6" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="KStore" />
        <script dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').then(
                  function(registration) {
                    console.log('Service Worker registered:', registration.scope);
                  },
                  function(err) {
                    console.log('Service Worker registration failed:', err);
                  }
                );
              });
            }
          `
        }} />
      </head>
      <body className={`${cairo.variable} font-cairo antialiased pb-14 sm:pb-28`}>
        {children}
        <InventoryOverviewBar />
      </body>
    </html>
  );
}
