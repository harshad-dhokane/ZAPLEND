import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { StarkzapProvider } from "@/providers/StarkzapProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { ToastProvider } from "@/components/Toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ZapLend — Social Collateral P2P Lending on Starknet",
  description: "Borrow with less collateral when friends vouch for you. Trust-based lending powered by Starknet and Starkzap SDK.",
  keywords: ["starknet", "defi", "lending", "p2p", "social collateral", "starkzap"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>
          <StarkzapProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </StarkzapProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
