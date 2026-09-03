import { useAtom } from "jotai";
import { Suspense } from "react";

import { exerciseIdHashAtom } from "./atoms";
import { ActivityLogDetailsDialog } from "./dialog";

/** Displays activity log dialog based on #exerciseId= hash param */
export function ActivityLogDetailsHashLoader() {
  const [logId, setLogId] = useAtom(exerciseIdHashAtom);

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
