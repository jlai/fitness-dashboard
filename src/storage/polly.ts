import { atom } from "jotai";
import type { Polly } from "@pollyjs/core";

import { atomWithQueue } from "@/utils/atom-with-queue";

const pollyAtom = atom<Polly | null>(null);

type ModifyPollyAction = "start" | "stop";

const modifyPollyAtom = atomWithQueue(
  null,
  async (get, set, action: ModifyPollyAction) => {
    const polly = get(pollyAtom);

    if (action === "start") {
      if (!polly) {
        const initPolly = await import("./init-polly");
        const polly = await initPolly.createPolly();
        set(pollyAtom, polly);
      }
    } else if (action === "stop") {
      if (polly) {
        await polly.stop();
        localStorage.removeItem("polly");
      }
      set(pollyAtom, null);
    }
  }
);

export const startPollyAtom = atom(null, async (get, set) => {
  await set(modifyPollyAtom, "start");
});

export const stopPollyAtom = atom(null, async (get, set) => {
  await set(modifyPollyAtom, "stop");
});
