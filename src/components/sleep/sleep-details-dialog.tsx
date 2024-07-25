import { DialogContent, DialogTitle, Stack, Typography } from "@mui/material";
import { ResponsiveBar } from "@nivo/bar";
import dayjs from "dayjs";

import { SleepLog } from "@/api/sleep";
import { formatMinutes, formatShortDateTime } from "@/utils/date-formats";
import { PERCENT_FRACTION_DIGITS_0 } from "@/utils/number-formats";

interface SleepDetailsDialogContentProps {
  sleepLog: SleepLog;
}

export default function SleepDetailsDialogContent({
  sleepLog,
}: SleepDetailsDialogContentProps) {
  const { levels } = sleepLog;
  const endDay = dayjs(sleepLog.endTime);

  return (
    <>
      <DialogTitle align="center">
        Sleep ending {formatShortDateTime(endDay)}
      </DialogTitle>
      <DialogContent>
        <Stack direction="column">
          <div className="mb-8 text-center">
            <Typography variant="h6">
              Duration: {formatMinutes(sleepLog.minutesAsleep)}
            </Typography>
          </div>
          <div>
            {levels?.summary?.rem && <SleepLevelSummaryChart levels={levels} />}
          </div>
        </Stack>
      </DialogContent>
    </>
  );
}

function SleepLevelSummaryChart({
  levels,
}: {
  levels: NonNullable<SleepLog["levels"]>;
}) {
  const summary = levels.summary;

  const wakeMins = summary.wake?.minutes ?? 0;
  const remMins = summary.rem?.minutes ?? 0;
  const lightMins = summary.light?.minutes ?? 0;
  const deepMins = summary.deep?.minutes ?? 0;
  const totalMins = wakeMins + remMins + lightMins + deepMins;

  const data = [
    {
      level: "Awake",
      value: wakeMins,
      color: "#fcba0380",
      ratio: wakeMins / totalMins,
    },
    {
      level: "REM",
      value: remMins,
      color: "#9ccef080",
      ratio: remMins / totalMins,
    },
    {
      level: "Light",
      value: lightMins,
      color: "#0398fc80",
      ratio: lightMins / totalMins,
    },
    {
      level: "Deep",
      value: deepMins,
      color: "#5d47ff80",
      ratio: deepMins / totalMins,
    },
  ];

  return (
    <div className="w-full h-[250px]">
      <ResponsiveBar
        layout="horizontal"
        margin={{ left: 60, right: 100 }}
        indexBy="level"
        label={(datum) =>
          PERCENT_FRACTION_DIGITS_0.format(datum.data.ratio ?? 0)
        }
        enableTotals
        totalsOffset={20}
        enableGridY={false}
        enableGridX={false}
        axisLeft={{ tickSize: 0 }}
        borderRadius={6}
        valueFormat={(value) => formatMinutes(value ?? 0)}
        tooltipLabel={(datum) => datum.data.level}
        colors={(datum) => datum.data.color}
        data={data.toReversed()}
      />
    </div>
  );
}
