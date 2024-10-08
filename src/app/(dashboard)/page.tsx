import RequireLogin from "@/components/require-login";
import { LogFab } from "@/components/logging/log-fab";

import GridControlBar from "./grid-control";
import TileGrid from "./tile-grid";

export default function DashboardPage() {
  return (
    <RequireLogin>
      <Dashboard />
    </RequireLogin>
  );
}

function Dashboard() {
  return (
    <div>
      <GridControlBar />
      <div className="h-4"></div>
      <TileGrid />
      <div className="h-32"></div>
      <LogFab />
    </div>
  );
}
