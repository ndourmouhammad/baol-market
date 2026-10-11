import type { Metadata, Viewport } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CartProvider } from "@/components/CartContext";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import InstallPrompt from "@/components/InstallPrompt";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Baol Market",
  description: "Marketplace e-commerce de proximité au Sénégal",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Baol Market",
    statusBarStyle: "default",
  },
  icons: {
    apple: [
      { url: "/logo/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
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
        <CartProvider>
          <ServiceWorkerRegister />
          <Header />
          <main className="grow">{children}</main>
          <InstallPrompt />
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}