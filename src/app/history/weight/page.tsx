"use client";

import { RequireScopes } from "@/components/require-scopes";

import WeightLogList from "./weight-log-list";
import WeightGraph from "./weight-graph";

export default function WeightHistoryPage() {
  return (
    <RequireScopes scopes={["wei"]}>
      <section>
        <WeightGraph />
      </section>
      <section>
        <WeightLogList />
      </section>
    </RequireScopes>
  );
}
