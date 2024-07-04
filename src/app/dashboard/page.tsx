import RequireLogin from "@/components/require-login";
import { RequireScopes } from "@/components/require-scopes";

import GridControlBar from "./grid-control";
import TileGrid from "./tile-grid";

export default function DashboardPage() {
  return (
    <RequireLogin>
      <RequireScopes scopes={["pro", "act", "nut"]}>
        <Dashboard />
      </RequireScopes>
    </RequireLogin>
  );
}

function Dashboard() {
  return (
    <div>
      <GridControlBar />
      <div className="h-4"></div>
      <TileGrid />
    </div>
  );
}
