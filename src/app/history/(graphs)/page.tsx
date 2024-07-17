"use client";

import RequireLogin from "@/components/require-login";
import { NavigableGraphView } from "@/components/charts/timeseries-graph";

export default function GraphsPage() {
  return (
    <RequireLogin>
      <NavigableGraphView />
    </RequireLogin>
  );
}
