"use client";

import { ScopeProvider } from "jotai-scope";

import { RequireScopes } from "@/components/require-scopes";

import { ActivityLogDetailsDialog } from "./activity-details";
import ActivityLogList from "./activity-log-list";
import { showingActivityLogDetailsDialogAtom } from "./atoms";

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
