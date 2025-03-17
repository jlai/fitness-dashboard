import type { Metadata } from "next";
import { Roboto, Poppins } from "next/font/google";
import { HydrationProvider } from "react-hydration-provider";
import { Container } from "@mui/material";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v13-appRouter";
import { Suspense } from "react";

import { CONTENT_SECURITY_POLICY } from "@/config/content-security-policy";
import { ErrorBoundary } from "@/components/error";

import Header from "./header";
import { ClientSideSetup } from "./client-layout";

import "./globals.css";

export const roboto = Roboto({ weight: ["400", "500"], subsets: ["latin"] });
export const poppins = Poppins({ weight: ["400", "500"], subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Dashboard for Fitbit data",
};

export default function RootPageLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <meta
        httpEquiv="Content-Security-Policy"
        content={CONTENT_SECURITY_POLICY}
      />
      <body className={`${roboto.className}`}>
        <HydrationProvider>
          <AppRouterCacheProvider options={{ key: "css" }}>
            <ClientSideSetup>
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
          </AppRouterCacheProvider>
        </HydrationProvider>
      </body>
    </html>
  );
}
