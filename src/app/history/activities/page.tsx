"use client";

import { ScopeProvider } from "jotai-scope";

import { RequireScopes } from "@/components/require-scopes";

import { ActivityLogDetailsDialog } from "./details";
import ActivityLogList from "./activity-log-list";
import { showingActivityLogDetailsDialogAtom } from "./details/atoms";

export default function ActivityHistoryPage() {
  return (
    <RequireScopes scopes={["act"]}>
      <ScopeProvider atoms={[showingActivityLogDetailsDialogAtom]}>
        <ActivityLogList />
        <ActivityLogDetailsDialog />
      </ScopeProvider>
    </RequireScopes>
  );
}
