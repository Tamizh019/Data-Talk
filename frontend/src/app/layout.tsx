import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Data-Talk | Autonomous Database Agent",
  description:
    "Production-grade SQL generation agent. Connect your database, ask questions, and visualize results automatically.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("dark antialiased", inter.variable, "font-sans", geist.variable)}>
      <body className="font-[var(--font-inter)] bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
