import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { ApolloSidebar } from "@/components/apollo/apollo-sidebar";
import { Providers } from "@/components/providers";

import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Apollo — ApolloStorage console",
  description:
    "Operator console for ApolloStorage: browse buckets and objects, upload and download, and watch health.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // dark-only per the constellation UX standard — no light mode.
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-dvh antialiased`}>
        <Providers>
          <div className="flex min-h-dvh">
            <ApolloSidebar />
            <main className="relative min-w-0 flex-1">
              {/* Faint god-mark watermark behind the main view — fixed, offset
                  past the sidebar, very low opacity, and pointer/aria-inert so it
                  reads as texture, not distraction (ux-standards §3.4). */}
              <div
                aria-hidden
                className="pointer-events-none fixed inset-y-0 left-16 right-0 z-0 flex items-center justify-center overflow-hidden sm:left-60"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/apollo-logo.png"
                  alt=""
                  className="w-[38rem] max-w-[70%] select-none opacity-[0.05]"
                />
              </div>
              <div className="relative z-10 mx-auto max-w-5xl px-4 py-6 sm:px-6">{children}</div>
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
