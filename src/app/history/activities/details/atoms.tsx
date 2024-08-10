import { atom } from "jotai";
import { atomWithHash } from "jotai-location";

import { cleanHashReplaceState } from "@/utils/hash";

export const activityLogIdHashAtom = atomWithHash<number | null>(
  "activityLogId",
  null,
  {
    serialize: (value: number | null) => (value ? value.toString() : ""),
    deserialize: (value: string) => Number.parseInt(value) || null,
    setHash: cleanHashReplaceState,
  }
);

export type XScaleMeasureType = "time" | "distance";

/** Scale to use for charts; note that distance is not always supported */
export const xScaleMeasureAtom = atom<XScaleMeasureType>("time");

export const highlightedXAtom = atom<
  null | { type: "time"; value: Date } | { type: "distance"; value: number }
>(null);
