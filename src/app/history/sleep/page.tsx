"use client";

import { RequireScopes } from "@/components/require-scopes";

import SleepLogList from "./sleep-log-list";

export default function SleepHistoryPage() {
  return (
    <RequireScopes scopes={["sle"]}>
      <SleepLogList />
    </RequireScopes>
  );
}
