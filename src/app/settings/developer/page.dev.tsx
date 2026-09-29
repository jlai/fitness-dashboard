import { notFound } from "next/navigation";

import { DEV_MODE_ENABLED } from "@/config";

import DeveloperSettingsPage from "./developer-page";

export default function DeveloperPage() {
  if (!DEV_MODE_ENABLED) {
    notFound();
  }

  return <DeveloperSettingsPage />;
}
