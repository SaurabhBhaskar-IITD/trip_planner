import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Trip Le Planner",
    template: "%s · Trip Le Planner",
  },
  description:
    "Internal trip customization, pricing and quotation console for Trip Le Tourism Pvt. Ltd.",
  robots: { index: false, follow: false }, // internal tool — never index
  // Icons come from the App Router FILE convention (src/app/icon.png and
  // src/app/apple-icon.png — the official brand asset). Next.js generates the
  // <link> tags and hashed URLs itself; declaring `metadata.icons` as well would
  // emit duplicate, conflicting tags, so it is deliberately omitted.
};

export const viewport: Viewport = {
  // Matches the navy sidebar so mobile browser chrome blends with the app.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0A192F" },
    { media: "(prefers-color-scheme: dark)", color: "#0A192F" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
