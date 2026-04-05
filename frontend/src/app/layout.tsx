import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/components/ThemeProvider";
import { StudioProvider } from "@/lib/studio-context";

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
    <html lang="en" suppressHydrationWarning className={cn("antialiased", inter.variable, "font-sans", geist.variable)}>
      <body className="font-[var(--font-inter)] bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <AuthProvider>
            <StudioProvider>
              {children}
            </StudioProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
