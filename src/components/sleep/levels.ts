import type { Sleep } from "@generated/orval/fetch/google-health-api/models";
import { StageSummaryType } from "@generated/orval/fetch/google-health-api/models";

import {
  getSleepMinutesAsleep,
  stageLevelKey,
  usesStagesLayout,
} from "@/api/sleep/helpers";

export const LEVEL_COLORS: Record<string, string> = {
  wake: "#fcba03",
  rem: "#9ccef0",
  light: "#0398fc",
  deep: "#5d47ff",

  awake: "#fcba03",
  restless: "#61dde8",
  asleep: "#2850a1",
};

export const LEVEL_NAMES: Record<string, string> = {
  wake: "Awake",
  rem: "REM",
  light: "Light",
  deep: "Deep",

  awake: "Awake",
  asleep: "Asleep",
  restless: "Restless",
};

export interface SleepSummaryDatum {
  level: string;
  value: number;
  color: string;
  ratio: number;
  count: number;
}

function summaryDatum(
  level: string,
  minutes: number,
  count: number,
  totalMins: number,
  color: string
): SleepSummaryDatum {
  return {
    level,
    value: minutes,
    color,
    ratio: totalMins > 0 ? minutes / totalMins : 0,
    count,
  };
}

function findStageSummary(sleep: Sleep, type: StageSummaryType) {
  return sleep.summary?.stagesSummary?.find((summary) => summary.type === type);
}

export function getLevelSummary(sleep: Sleep): Array<SleepSummaryDatum> {
  const stagesSummary = sleep.summary?.stagesSummary ?? [];

  if (usesStagesLayout(sleep)) {
    const wake = findStageSummary(sleep, StageSummaryType.AWAKE);
    const rem = findStageSummary(sleep, StageSummaryType.REM);
    const light = findStageSummary(sleep, StageSummaryType.LIGHT);
    const deep = findStageSummary(sleep, StageSummaryType.DEEP);

    const wakeMins = Number(wake?.minutes ?? 0);
    const remMins = Number(rem?.minutes ?? 0);
    const lightMins = Number(light?.minutes ?? 0);
    const deepMins = Number(deep?.minutes ?? 0);
    const totalMins = wakeMins + remMins + lightMins + deepMins;

    return [
      summaryDatum(
        "wake",
        wakeMins,
        Number(wake?.count ?? 0),
        totalMins,
        LEVEL_COLORS.wake
      ),
      summaryDatum(
        "rem",
        remMins,
        Number(rem?.count ?? 0),
        totalMins,
        LEVEL_COLORS.rem
      ),
      summaryDatum(
        "light",
        lightMins,
        Number(light?.count ?? 0),
        totalMins,
        LEVEL_COLORS.light
      ),
      summaryDatum(
        "deep",
        deepMins,
        Number(deep?.count ?? 0),
        totalMins,
        "#5d47ff80"
      ),
    ];
  }

  const awake = findStageSummary(sleep, StageSummaryType.AWAKE);
  const restless = findStageSummary(sleep, StageSummaryType.RESTLESS);
  const asleep = findStageSummary(sleep, StageSummaryType.ASLEEP);

  const awakeMins = Number(awake?.minutes ?? 0);
  const restlessMins = Number(restless?.minutes ?? 0);
  const asleepMins =
    Number(asleep?.minutes ?? 0) || getSleepMinutesAsleep(sleep);
  const totalMins = awakeMins + restlessMins + asleepMins;

  return [
    summaryDatum(
      stageLevelKey(StageSummaryType.AWAKE, sleep),
      awakeMins,
      Number(awake?.count ?? 0),
      totalMins,
      LEVEL_COLORS.awake
    ),
    summaryDatum(
      "restless",
      restlessMins,
      Number(restless?.count ?? 0),
      totalMins,
      LEVEL_COLORS.restless
    ),
    summaryDatum(
      "asleep",
      asleepMins,
      Number(asleep?.count ?? 0),
      totalMins,
      LEVEL_COLORS.asleep
    ),
  ];
}
