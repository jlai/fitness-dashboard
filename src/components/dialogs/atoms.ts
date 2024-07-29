import { atom } from "jotai";
import { atomFamily } from "jotai/utils";

export const fullScreenPreferenceFamily = atomFamily((key: string) =>
  atom(false)
);
