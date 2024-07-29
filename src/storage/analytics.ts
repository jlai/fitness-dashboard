import dayjs from "dayjs";
import isoWeekPlugin from "dayjs/plugin/isoWeek";
import { atomEffect } from "jotai-effect";
import { atomWithStorage } from "jotai/utils";

import { ANALYTICS_PING_URL } from "@/config";
import { formatAsDate } from "@/api/datetime";
import { isLoggedIn } from "@/api/auth";

dayjs.extend(isoWeekPlugin);

export const firstLoginDateAtom = atomWithStorage<string | undefined>(
  "analytics:first-login-date",
  undefined,
  undefined,
  {
    getOnInit: true,
  }
);

export const lastSurveyDateAtom = atomWithStorage<string | undefined>(
  "analytics:last-survey-date",
  undefined,
  undefined,
  {
    getOnInit: true,
  }
);

export const lastPingDateAtom = atomWithStorage<string | undefined>(
  "analytics:last-weekly-ping-date",
  undefined,
  undefined,
  {
    getOnInit: true,
  }
);

export const weeksActiveAtom = atomWithStorage<number>(
  "analytics:weeks-active",
  0,
  undefined,
  {
    getOnInit: true,
  }
);

/** Round down to the nearest power. */
export function roundToPower(power: number, value: number) {
  return Math.pow(power, Math.floor(Math.log(value) / Math.log(power)));
}

/** Send simple, anonymous analytics once a week for logged-in users. */
export const analyticsPingEffect = atomEffect((get, set) => {
  const today = dayjs();

  const lastPing = dayjs(get.peek(lastPingDateAtom) ?? "1990-01-01");

  // Set first login date for users that didn't have it set before
  if (!get.peek(firstLoginDateAtom) && isLoggedIn()) {
    set(firstLoginDateAtom, formatAsDate(dayjs()));
  }

  if (
    ANALYTICS_PING_URL &&
    isLoggedIn() &&
    !lastPing.isSame(today, "isoWeek")
  ) {
    const weeksActive = get.peek(weeksActiveAtom);

    // DO NOT INCLUDE PERSONAL DATA OR EVEN ANONYMOUS IDENTIFIERS HERE
    const data = {
      type: "weekly-ping",
      data: {
        weeksActiveRounded: roundToPower(2, weeksActive),
      },
    };

    fetch(ANALYTICS_PING_URL, {
      method: "POST",
      body: JSON.stringify(data),
    }).then(
      () => {
        set(lastPingDateAtom, formatAsDate(today));
        set(weeksActiveAtom, weeksActive + 1);
      },
      () => {
        console.error("failed to send analytics ping");
      }
    );
  }
});
