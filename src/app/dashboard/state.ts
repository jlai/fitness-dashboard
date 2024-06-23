import { atom, useAtomValue } from "jotai";
import dayjs from "dayjs";

export const selectedDayAtom = atom(dayjs());

export function useSelectedDay() {
  return useAtomValue(selectedDayAtom);
}

export const editingGridAtom = atom(false);
