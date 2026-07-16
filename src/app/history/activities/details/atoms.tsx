import { atom } from "jotai";
import { atomWithHash } from "jotai-location";

import { cleanHashReplaceState } from "@/utils/hash";

export const activityLogIdHashAtom = atomWithHash<number | bigint | null>(
  "activityLogId",
  null,
  {
    serialize: (value: number | bigint | null) =>
      value ? value.toString() : "",
    // Parse as BigInt since logIds can exceed Number.MAX_SAFE_INTEGER
    deserialize: (value: string) => {
      try {
        return value ? BigInt(value) : null;
      } catch {
        return null;
      }
    },
    setHash: cleanHashReplaceState,
  }
);

export type XScaleMeasureType = "time" | "distance";

/** Scale to use for charts; note that distance is not always supported */
export const xScaleMeasureAtom = atom<XScaleMeasureType>("time");

export const highlightedXAtom = atom<
  null | { type: "time"; value: Date } | { type: "distance"; value: number }
>(null);
