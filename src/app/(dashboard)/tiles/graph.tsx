import { Typography } from "@mui/material";
import { BarChart } from "@mui/x-charts";
import dayjs from "dayjs";
import { useSuspenseQuery } from "@tanstack/react-query";

import { TimeSeriesResource, buildTimeSeriesQuery } from "@/api/activity";

import { useSelectedDay } from "../state";

function formatDay(dateString: string) {
  return dayjs(dateString).format("ddd");
}

export default function GraphTileContent() {
  const day = useSelectedDay();

  const startDay = day.subtract(7, "days");
  const endDay = day;

  const { data } = useSuspenseQuery({
    ...buildTimeSeriesQuery("steps", startDay, endDay),
  });

  const dataset = data?.map(({ dateTime, value }) => ({
    dateTime,
    value: Number(value),
  }));

  return (
    <div className="size-full max-h-full relative overflow-hidden p-2">
      <div className="size-full flex flex-col">
        <Typography variant="h6" className="self-center">
          Steps
        </Typography>
        <BarChart
          className="flex-grow"
          dataset={dataset}
          xAxis={[
            {
              scaleType: "band",
              dataKey: "dateTime",
              valueFormatter: formatDay,
              disableTicks: true,
            },
          ]}
          series={[{ dataKey: "value", label: "Steps" }]}
          slotProps={{
            legend: { hidden: true },
          }}
        />
      </div>
    </div>
  );
}
