import type { Metadata } from "next";
import { Roboto, Poppins } from "next/font/google";
import { HydrationProvider } from "react-hydration-provider";
import dynamic from "next/dynamic";
import { Container } from "@mui/material";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v13-appRouter";
import { ThemeProvider } from "@mui/material/styles";
import { Suspense } from "react";

import { CONTENT_SECURITY_POLICY } from "@/config/content-security-policy";

import Header from "./header";
import { theme } from "./theme";

import "./globals.css";

export const roboto = Roboto({ weight: ["400", "500"], subsets: ["latin"] });
export const poppins = Poppins({ weight: ["400", "500"], subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Dashboard for Fitbit data",
};

export const ClientSideSetup = dynamic(() => import("./client-setup"), {
  ssr: false,
});

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
            <ThemeProvider theme={theme}>
              <ClientSideSetup>
                <Header />
                <main>
                  <Suspense>
                    <Container maxWidth="lg">{children}</Container>
                  </Suspense>
                </main>
              </ClientSideSetup>
            </ThemeProvider>
          </AppRouterCacheProvider>
        </HydrationProvider>
      </body>
    </html>
  );
}
