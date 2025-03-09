import { SleepLog } from "@/api/sleep";

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
  // Stages
  wake: "Awake",
  rem: "REM",
  light: "Light",
  deep: "Deep",

  // Classic
  awake: "Awake",
  asleep: "Asleep",
  restless: "Restless",
};

export interface SleepSummaryDatum {
  level: string;
  value: number;
  color: string;
  ratio: number;
  thirtyDayAvgMinutes: number;
  count: number;
}

export function getLevelSummary(
  levels: NonNullable<SleepLog["levels"]>
): Array<SleepSummaryDatum> {
  const summary = levels.summary;
  const hasSleepStages = !!levels.summary.rem;

  if (hasSleepStages) {
    const wakeMins = summary.wake?.minutes ?? 0;
    const remMins = summary.rem?.minutes ?? 0;
    const lightMins = summary.light?.minutes ?? 0;
    const deepMins = summary.deep?.minutes ?? 0;
    const totalMins = wakeMins + remMins + lightMins + deepMins;

    return [
      {
        level: "wake",
        value: wakeMins,
        color: "#fcba03",
        ratio: wakeMins / totalMins,
        thirtyDayAvgMinutes: summary.wake?.thirtyDayAvgMinutes ?? 0,
        count: summary.wake?.count ?? 0,
      },
      {
        level: "rem",
        value: remMins,
        color: "#9ccef0",
        ratio: remMins / totalMins,
        thirtyDayAvgMinutes: summary.rem?.thirtyDayAvgMinutes ?? 0,
        count: summary.rem?.count ?? 0,
      },
      {
        level: "light",
        value: lightMins,
        color: "#0398fc",
        ratio: lightMins / totalMins,
        thirtyDayAvgMinutes: summary.light?.thirtyDayAvgMinutes ?? 0,
        count: summary.light?.count ?? 0,
      },
      {
        level: "deep",
        value: deepMins,
        color: "#5d47ff80",
        ratio: deepMins / totalMins,
        thirtyDayAvgMinutes: summary.deep?.thirtyDayAvgMinutes ?? 0,
        count: summary.deep?.count ?? 0,
      },
    ];
  } else {
    const awakeMins = summary.awake?.minutes ?? 0;
    const restlessMins = summary.restless?.minutes ?? 0;
    const asleepMins = summary.asleep?.minutes ?? 0;

    const totalMins = awakeMins + restlessMins + asleepMins;

    return [
      {
        level: "awake",
        value: awakeMins,
        color: "#fcba03",
        ratio: awakeMins / totalMins,
        thirtyDayAvgMinutes: summary.awake?.thirtyDayAvgMinutes ?? 0,
        count: summary.awake?.count ?? 0,
      },
      {
        level: "restless",
        value: restlessMins,
        color: "#61dde8",
        ratio: restlessMins / totalMins,
        thirtyDayAvgMinutes: summary.light?.thirtyDayAvgMinutes ?? 0,
        count: summary.restless?.count ?? 0,
      },
      {
        level: "asleep",
        value: asleepMins,
        color: "#2850a1",
        ratio: asleepMins / totalMins,
        thirtyDayAvgMinutes: summary.asleep?.thirtyDayAvgMinutes ?? 0,
        count: summary.asleep?.count ?? 0,
      },
    ];
  }
}
