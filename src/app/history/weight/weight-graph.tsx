"use client";

import {
  AreaPlot,
  ChartsClipPath,
  ChartsGrid,
  ChartsTooltip,
  ChartsXAxis,
  ChartsYAxis,
  LinePlot,
  LineSeriesType,
  MarkPlot,
  ResponsiveChartContainer,
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
import { HeaderBar } from "@/components/layout/rows";
import { getTickFormatterForDayRange } from "@/components/charts/timeseries/formatters";

import { leanFatMassByDate } from "./lean-fat-mass";

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

  const [{ data: weightData }, { data: fatData }] = useQueries({
    queries: [
      buildTimeSeriesQuery("weight", range.startDay, range.endDay),
      buildTimeSeriesQuery("fat", range.startDay, range.endDay),
    ],
  });

  const clipPathId = useId();

  const { series, dates, minWeight } = useMemo(() => {
    const valueFormatter = (value: number | null) =>
      value
        ? `${NumberFormats.FRACTION_DIGITS_1.format(
            value,
          )} ${localizedKilogramsName}`
        : "";

    const { dates, totalKg, leanKg, fatKg } = leanFatMassByDate(
      weightData,
      fatData,
      dayjs(),
    );

    const totalSeriesData = totalKg.map(localizedKilograms);
    const leanSeriesData = leanKg.map((value) =>
      value == null ? null : localizedKilograms(value),
    );
    const fatSeriesData = fatKg.map((value) =>
      value == null ? null : localizedKilograms(value),
    );

    const minCandidates = [...leanSeriesData, ...totalSeriesData].filter(
      (value): value is number => value != null,
    );
    const minWeight = minCandidates.length
      ? roundDownMinWeight(Math.min(...minCandidates))
      : 0;

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
        <ResponsiveChartContainer
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

          <ChartsXAxis />
          <ChartsYAxis />
          <ChartsTooltip />
          <ChartsClipPath id={clipPathId} />
          <MarkPlot />
          <ChartsGrid horizontal />
          <ChartsOverlay loading={!weightData || !fatData} />
        </ResponsiveChartContainer>
      </div>
    </div>
  );
}
