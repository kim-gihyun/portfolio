import {ShcWidget} from '@/components/helpdesk/ShcWidget';
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { Nav } from "@/components/chrome/Nav";
import { Footer } from "@/components/chrome/Footer";
import { Preloader } from "@/components/chrome/Preloader";
import { Cursor } from "@/components/chrome/Cursor";
import { GkBackdrop } from "@/components/chrome/GkBackdrop";
import { Analytics } from "@/components/chrome/Analytics";

const geistSans = Geist({subsets: ["latin"], variable: "--font-sans-geist", display: "swap"});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono-geist",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://gihyunkim.com"),
  title: {
    default: "Gihyun Kim — Mechanical Engineering, HKU",
    template: "%s — Gihyun Kim",
  },
  description:
    "Gihyun Kim, a mechanical engineering student at the University of Hong Kong. Projects, research and CV.",
  openGraph: {
    title: "Gihyun Kim — Mechanical Engineering, HKU",
    description:
      "Mechanical engineering projects and research at the University of Hong Kong.",
    url: "https://gihyunkim.com",
    siteName: "Gihyun Kim",
    images: [{ url: "/assets/og-card.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: { card: "summary_large_image", images: ["/assets/og-card.png"] },
  icons: { icon: "/assets/favicon.svg" },
};

// the site boots dark for everyone, so the browser chrome matches that — not the OS
export const viewport: Viewport = {
  themeColor: "#0a1322",
};

// No-flash theme + js flag, applied before first paint.
const bootScript = `(function(){try{var t=localStorage.getItem('gk-theme');var d=t?t==='dark':true;var r=document.documentElement;r.setAttribute('data-theme',d?'dark':'light');r.classList.add('js');}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body suppressHydrationWarning>
        <Preloader />
        <Cursor />
        <GkBackdrop />
        <SmoothScroll>
          <Nav />
          <main id="main">{children}</main>
          <Footer />
        </SmoothScroll>
        <ShcWidget />
        <Analytics />
      </body>
      {/* GoatCounter — privacy-friendly page-view analytics */}
      <Script
        src="https://gc.zgo.at/count.js"
        data-goatcounter="https://ghkim037.goatcounter.com/count"
        strategy="afterInteractive"
      />
    </html>
  );
}
