"use client";

import dynamic from "next/dynamic";

export const ClientSideSetup = dynamic(() => import("./client-setup"), {
  ssr: false,
});
