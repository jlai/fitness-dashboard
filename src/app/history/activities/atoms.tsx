import { atom } from "jotai";

import { ActivityLog } from "@/api/activity";

export const showingActivityLogDetailsDialogAtom = atom<ActivityLog | null>(
  null
);
