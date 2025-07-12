"use client";

import {
  AreaPlot,
  ChartsClipPath,
  ChartsGrid,
  ChartsReferenceLine,
  ChartsTooltip,
  ChartsXAxis,
  ChartsYAxis,
  LinePlot,
  LineSeriesType,
  MarkPlot,
  ChartContainer,
} from "@mui/x-charts";
import { useQueries } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useAtomValue } from "jotai";
import { ScopeProvider } from "jotai-scope";
import { useId, useMemo } from "react";
import { ChartsOverlay } from "@mui/x-charts/ChartsOverlay";

import { buildTimeSeriesQuery } from "@/api/times-series";
import {
  selectedRangeAtom,
  selectedRangeTypeAtom,
} from "@/components/charts/atoms";
import {
  DateTimeRangeNavigator,
  GraphRangeSelector,
} from "@/components/charts/navigators";
import { useUnits } from "@/config/units";
import { NumberFormats } from "@/utils/number-formats";
import { buildGetBodyWeightGoalQuery } from "@/api/body";
import { HeaderBar } from "@/components/layout/rows";
import { getTickFormatterForDayRange } from "@/components/charts/timeseries/formatters";

export default function ScopedAtomWeightGraph() {
  return (
    <ScopeProvider atoms={[selectedRangeAtom, selectedRangeTypeAtom]}>
      <LeanFatMassGraph />
    </ScopeProvider>
  );
}

export function roundDownMinWeight(weight: number) {
  return Math.floor(weight / 10) * 10;
}

export function LeanFatMassGraph() {
  const { localizedKilograms, localizedKilogramsName } = useUnits();

  const range = useAtomValue(selectedRangeAtom);

  const [{ data: weightData }, { data: fatData }, { data: goal }] = useQueries({
    queries: [
      buildTimeSeriesQuery("weight", range.startDay, range.endDay),
      buildTimeSeriesQuery("fat", range.startDay, range.endDay),
      buildGetBodyWeightGoalQuery(),
    ],
  });

  const clipPathId = useId();

  const { series, dates, minWeight } = useMemo(() => {
    const today = dayjs();
    const valueFormatter = (value: number | null) =>
      value
        ? `${NumberFormats.FRACTION_DIGITS_1.format(
            value
          )} ${localizedKilogramsName}`
        : "";

    const dates: Array<Date> = [];
    const totalSeriesData: Array<number> = [];
    const fatSeriesData: Array<number> = [];
    const leanSeriesData: Array<number> = [];

    if (weightData && fatData) {
      if (weightData.length !== fatData.length) {
        throw new Error("weight and fat data unequal length");
      }

      for (let i = 0; i < weightData?.length; i++) {
        if (dayjs(weightData[i].dateTime).isAfter(today)) {
          break;
        }

        const weightKg = Number(weightData[i].value);
        const percentFat = Number(fatData[i].value);
        const leanKg = weightKg * (1.0 - percentFat / 100);
        const fatKg = weightKg * (percentFat / 100);

        dates.push(dayjs(weightData[i].dateTime).toDate());
        totalSeriesData.push(localizedKilograms(weightKg));
        leanSeriesData.push(localizedKilograms(leanKg));
        fatSeriesData.push(localizedKilograms(fatKg));
      }
    }

    const minWeight = roundDownMinWeight(Math.min(...leanSeriesData) ?? 0);

    const series: Array<LineSeriesType> = [
      {
        type: "line",
        label: "Total",
        data: totalSeriesData,
        valueFormatter,
        showMark: false,
        connectNulls: true,
        color: "rgb(0, 0, 0)",
      },
      {
        type: "line",
        label: "Lean",
        data: leanSeriesData,
        stack: "mass",
        valueFormatter,
        showMark: false,
        area: false,
        connectNulls: true,
        color: "rgb(149, 114, 204)",
      },
      {
        type: "line",
        label: "Fat",
        data: fatSeriesData,
        stack: "mass",
        valueFormatter,
        showMark: false,
        area: true,
        connectNulls: true,
        color: "rgb(137, 205, 224)",
      },
    ];

    return { series, dates, minWeight };
  }, [fatData, localizedKilograms, localizedKilogramsName, weightData]);

  const dateFormatter = getTickFormatterForDayRange(range);

  return (
    <div>
      <HeaderBar>
        <GraphRangeSelector resource="weight" />
        <div className="flex-1"></div>
        <DateTimeRangeNavigator resource="weight" />
      </HeaderBar>
      <div className="w-full h-[400px]">
        <ChartContainer
          series={series}
          xAxis={[
            {
              scaleType: "band",
              data: dates,
              valueFormatter: dateFormatter,
            },
          ]}
          yAxis={[{ label: localizedKilogramsName, min: minWeight }]}
        >
          <g clipPath={`url(#${clipPathId})`}>
            <AreaPlot />
            <LinePlot />
          </g>

          {goal?.weight && (
            <ChartsReferenceLine
              y={localizedKilograms(goal.weight)}
              lineStyle={{ strokeOpacity: 0.5, strokeDasharray: "5 5" }}
              label="Goal"
              labelAlign="end"
            />
          )}

          <ChartsXAxis />
          <ChartsYAxis />
          <ChartsTooltip />
          <ChartsClipPath id={clipPathId} />
          <MarkPlot />
          <ChartsGrid horizontal />
          <ChartsOverlay loading={!weightData || !fatData} />
        </ChartContainer>
      </div>
    </div>
  );
}
