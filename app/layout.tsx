"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./provider/AuthProvider";
import { ProvidersWrapper } from "./provider/ProvidersWrapper";
import { ConfigProvider } from "./provider/ConfigProvider";
import Header from "@/components/units/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
        <AuthProvider>
          <ConfigProvider>
            <ProvidersWrapper>
              <Header />
              {children}
            </ProvidersWrapper>
          </ConfigProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
