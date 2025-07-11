import { useQuery } from "@tanstack/react-query";

import { buildActivityIntradayQuery, IntradayEntry } from "@/api/intraday";
import { NumberFormats } from "@/utils/number-formats";

import { aggregateByHour } from "./aggregation";
import { SimpleBarChart } from "./mui-renderer";
import { useRangeInfo } from "./data";
import { singleSeriesConfig } from "./series-config";

const STEPS_INTRADAY_SERIES_CONFIGS = singleSeriesConfig<IntradayEntry>({
  label: "Steps",
  numberFormat: NumberFormats.FRACTION_DIGITS_0.format,
  unit: "steps",
});

export function IntradayStepsChart() {
  const { startDay, endDay } = useRangeInfo();

  const { data: detailedData } = useQuery(
    buildActivityIntradayQuery("steps", "15min", startDay, endDay)
  );
  const data = detailedData && aggregateByHour(detailedData);

  return (
    <>
      <SimpleBarChart<IntradayEntry>
        data={data}
        seriesConfigs={STEPS_INTRADAY_SERIES_CONFIGS}
      />
    </>
  );
}
