import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import { headers } from "next/headers";
import { HydrationProvider } from "react-hydration-provider";
import { Container } from "@mui/material";
import { Suspense } from "react";

import { ErrorBoundary } from "@/components/error";
import { ClientSideSetup } from "./client-setup-wrapper";
import { MuiCacheProvider } from "./mui-cache-provider";

import Header from "./header";

import "./globals.css";

export const roboto = Roboto({ weight: ["400", "500"], subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Dashboard for Fitbit data",
};

export default async function RootPageLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="en">
      <body className={`${roboto.className}`}>
        <HydrationProvider>
          <MuiCacheProvider nonce={nonce}>
            <ClientSideSetup nonce={nonce}>
              <Header />
              <main>
                <ErrorBoundary>
                  <Suspense>
                    <Container maxWidth="lg" className="px-0 sm:px-6">
                      {children}
                    </Container>
                  </Suspense>
                </ErrorBoundary>
              </main>
            </ClientSideSetup>
          </MuiCacheProvider>
        </HydrationProvider>
      </body>
    </html>
  );
}
