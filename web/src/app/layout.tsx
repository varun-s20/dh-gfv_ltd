import type { Metadata, Viewport } from "next";
import { Archivo, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import { consentBootstrapScript } from "@/lib/analytics/consent-script";
import { site } from "@/lib/site";
import "./globals.css";

// Display: a grotesk with a width axis, stretched wide for badges and the giant backdrop words.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
});

// Reading and interface text.
const instrument = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  display: "swap",
});

// Specs, references and the admin's tables.
const mono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const introBootstrapScript = `(function(d){if(!matchMedia('(prefers-reduced-motion: reduce)').matches){d.classList.add('story-intro');setTimeout(function(){d.classList.remove('story-intro')},3000)}})(document.documentElement)`;

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `Sell your Tesla, electric car or van | ${site.brand.fullName}`,
    template: `%s | ${site.brand.fullName}`,
  },
  description:
    "Sell your Tesla, electric car or electric van to a UK EV specialist. A person prices it from your photos and battery health, then sends one firm offer by WhatsApp or email.",
  applicationName: site.brand.fullName,
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    locale: "en_GB",
    siteName: site.brand.fullName,
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#050607",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB" className={`${archivo.variable} ${instrument.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script
          // Consent Mode v2 defaults must run before any tag can load.
          dangerouslySetInnerHTML={{ __html: consentBootstrapScript(site.analytics.gtmId) }}
        />
        <script
          // Cars that drive in wait off-stage until their scripts take over; released after 3s regardless.
          dangerouslySetInnerHTML={{ __html: introBootstrapScript }}
        />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
