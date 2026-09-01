"use client";

import { RequireScopes } from "@/components/require-scopes";
import { HEALTH_METRICS_AND_MEASUREMENTS_READONLY } from "@/config/google-health-scopes";

import WeightLogList from "./weight-log-list";
import WeightGraph from "./weight-graph";

export default function WeightHistoryPage() {
  return (
    <RequireScopes
      scopes={[
        HEALTH_METRICS_AND_MEASUREMENTS_READONLY
      ]}
    >
      <section>
        <WeightGraph />
      </section>
      <section>
        <WeightLogList />
      </section>
    </RequireScopes>
  );
}
