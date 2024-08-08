import { atom } from "jotai";

import { ActivityLog } from "@/api/activity";

export const showingActivityLogDetailsDialogAtom = atom<ActivityLog | null>(
  null
);

export type XScaleMeasureType = "time" | "distance";

/** Scale to use for charts; note that distance is not always supported */
export const xScaleMeasureAtom = atom<XScaleMeasureType>("time");

export const highlightedXAtom = atom<
  null | { type: "time"; value: Date } | { type: "distance"; value: number }
>(null);
