import type { Metadata } from "next";
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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
