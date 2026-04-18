import { atom } from "jotai";
import { atomFamily } from "jotai-family";

export const fullScreenPreferenceFamily = atomFamily((key: string) =>
  atom(false)
);
