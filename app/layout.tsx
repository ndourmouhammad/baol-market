import type { Metadata, Viewport } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CartProvider } from "@/components/CartContext";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import InstallPrompt from "@/components/InstallPrompt";
import AudioGuide from "@/components/AudioGuide";
import PushInvite from "@/components/PushInvite";
import OfflineBanner from "@/components/OfflineBanner";
import AppLaunch from "@/components/AppLaunch";
import { SITE_URL } from "@/lib/siteUrl";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Baol Market",
  description: "Marketplace e-commerce de proximité au Sénégal",
  applicationName: "Baol Market",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Baol Market",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/logo/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/logo/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/logo/logo-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/logo/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    siteName: "Baol Market",
    locale: "fr_SN",
    type: "website",
    images: [
      {
        url: "/logo/logo-512x512.png",
        width: 512,
        height: 512,
        alt: "Baol Market",
      },
    ],
  },
  twitter: {
    card: "summary",
  },
};

export const viewport: Viewport = {
  themeColor: "#009A3D",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="fr"
      className={`${inter.variable} ${fraunces.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans bg-(--fond) text-(--encre)" suppressHydrationWarning>
        <AppLaunch />
        <CartProvider>
          <ServiceWorkerRegister />
          <OfflineBanner />
          <Header />
          <main className="grow">{children}</main>
          <InstallPrompt />
          <AudioGuide />
          <PushInvite />
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}