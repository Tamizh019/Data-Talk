import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RAG Chatbot — LlamaIndex + Groq",
  description:
    "Production-grade RAG chatbot. Upload PDFs and chat with them using LlamaIndex, Qdrant, and Groq.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} antialiased`}>
      <body className="font-[var(--font-inter)] bg-[#09090b] text-[#fafafa]">
        {children}
      </body>
    </html>
  );
}
