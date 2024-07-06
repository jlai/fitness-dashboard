"use client";

import RequireLogin from "@/components/require-login";
import { GraphView } from "@/components/charts/timeseries-graph";

export default function GraphsPage() {
  return (
    <RequireLogin>
      <GraphView />
    </RequireLogin>
  );
}
