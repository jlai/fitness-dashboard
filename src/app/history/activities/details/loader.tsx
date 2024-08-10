import { useAtom } from "jotai";
import { Suspense } from "react";

import { activityLogIdHashAtom } from "./atoms";
import { ActivityLogDetailsDialog } from "./dialog";

/** Displays activity log dialog based on #activityLogId= hash param */
export function ActivityLogDetailsHashLoader() {
  const [logId, setLogId] = useAtom(activityLogIdHashAtom);

  return (
    <Suspense>
      {logId && (
        <ActivityLogDetailsDialog
          open={!!logId}
          onClose={() => setLogId(null)}
          logId={logId}
        />
      )}
    </Suspense>
  );
}
