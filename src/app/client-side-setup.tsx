"use client";

import dynamic from "next/dynamic";

// next/dynamic with ssr:false must live in a Client Component (Next 15+).
const ClientSideSetup = dynamic(() => import("./client-setup"), {
  ssr: false,
});

export default function ClientSideSetupLoader({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClientSideSetup>{children}</ClientSideSetup>;
}
