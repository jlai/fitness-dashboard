import dayjs from "dayjs";

import type { Sleep, SleepStage } from "@generated/orval/fetch/google-health-api/models";
import {
  SleepStageType,
  SleepType,
  StageSummaryType,
} from "@generated/orval/fetch/google-health-api/models";

import type { DataPointFor } from "../datapoints";
import { getDataPointValue } from "../datapoints";

export type SleepDataPoint = DataPointFor<"sleep">;

export function getSleepFromDataPoint(dataPoint: SleepDataPoint): Sleep {
  return getDataPointValue("sleep", dataPoint);
}

export function getSleepDataPointId(dataPoint: SleepDataPoint) {
  const sleep = getSleepFromDataPoint(dataPoint);
  return (
    dataPoint.name ??
    `${sleep.interval?.startTime ?? ""}-${sleep.interval?.endTime ?? ""}`
  );
}

export function getSleepStartTime(sleep: Sleep) {
  return sleep.interval?.startTime ?? "";
}

export function getSleepEndTime(sleep: Sleep) {
  return sleep.interval?.endTime ?? "";
}

export function getSleepMinutesAsleep(sleep: Sleep) {
  return Number(sleep.summary?.minutesAsleep ?? 0);
}

export function isMainSleep(sleep: Sleep) {
  return sleep.metadata?.mainSleep ?? false;
}

export function hasSleepStages(sleep: Sleep) {
  return sleep.type === SleepType.STAGES;
}

export function hasStageData(sleep: Sleep) {
  return (
    (sleep.stages?.length ?? 0) > 0 ||
    (sleep.shortAwakenings?.length ?? 0) > 0 ||
    (sleep.summary?.stagesSummary?.length ?? 0) > 0
  );
}

export function usesStagesLayout(sleep: Sleep) {
  if (hasSleepStages(sleep)) {
    return true;
  }

  return (
    sleep.summary?.stagesSummary?.some(
      (summary) => summary.type === StageSummaryType.REM
    ) ?? false
  );
}

export function stageDurationSeconds(stage: SleepStage) {
  if (!stage.startTime || !stage.endTime) {
    return 0;
  }

  return dayjs(stage.endTime).diff(dayjs(stage.startTime), "second");
}

export function stageLevelKey(
  type: SleepStageType | StageSummaryType | undefined,
  sleep: Sleep
) {
  const stagesLayout = usesStagesLayout(sleep);

  switch (type) {
    case SleepStageType.AWAKE:
    case StageSummaryType.AWAKE:
      return stagesLayout ? "wake" : "awake";
    case SleepStageType.LIGHT:
    case StageSummaryType.LIGHT:
      return "light";
    case SleepStageType.DEEP:
    case StageSummaryType.DEEP:
      return "deep";
    case SleepStageType.REM:
    case StageSummaryType.REM:
      return "rem";
    case SleepStageType.ASLEEP:
    case StageSummaryType.ASLEEP:
      return "asleep";
    case SleepStageType.RESTLESS:
    case StageSummaryType.RESTLESS:
      return "restless";
    default:
      return stagesLayout ? "wake" : "awake";
  }
}
