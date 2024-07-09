import dayjs, { Dayjs } from "dayjs";
import { atomWithDefault } from "jotai/utils";

/**
 * Atom that represents a page-level selected date, such as the current dashboard date.
 * This can be used for components to link to the page-level date.
 *
 * This should be scoped so that switching pages (unmounting) resets the date.
 */
export const selectedDayForPageAtom = atomWithDefault<Dayjs>(() => dayjs());
