import { atom } from "jotai";

import { ActivityLog } from "@/api/activity";

export const showingActivityLogDetailsDialogAtom = atom<ActivityLog | null>(
  null
);

export const xScaleMeasureAtom = atom<"time" | "distance">("time");

export const highlightedXAtom = atom<
  null | { type: "time"; value: Date } | { type: "distance"; value: number }
>(null);
