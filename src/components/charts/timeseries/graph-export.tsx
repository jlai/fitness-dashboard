"use client";

import React, { useCallback, useEffect } from "react";
import { stringify } from "csv-stringify/sync";
import dayjs from "dayjs";
import { head, isNotNil, last } from "es-toolkit";
import { atom, useAtomValue, useSetAtom } from "jotai";
import { ScopeProvider } from "jotai-scope";

import { DayjsRange } from "@/components/calendar/period-navigator";
import { todayOrEarlier } from "@/utils/date-utils";

import { CHART_RESOURCE_CONFIGS, ChartResource } from "./resources";
import { ChartSeriesConfig } from "./series-config";
import { TimeSeriesDatum } from "./data";

interface GraphExportData {
  data: Array<TimeSeriesDatum>;
  seriesConfigs: Array<ChartSeriesConfig<any>>;
}

const graphExportDataAtom = atom<GraphExportData | null>(null);

export function GraphExportProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ScopeProvider atoms={[graphExportDataAtom]}>{children}</ScopeProvider>
  );
}

/** Provide data for exporting to CSV */
export function useExportGraphData(exportData: Partial<GraphExportData>) {
  const setExportData = useSetAtom(graphExportDataAtom);

  useEffect(() => {
    if (exportData.data && exportData.seriesConfigs) {
      setExportData(exportData as GraphExportData);
    }

    return () => {
      // unregister
      setExportData(null);
    };
  }, [exportData, setExportData]);
}

const CSV_NUMBER_FORMAT = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 3,
  useGrouping: false,
});

export function createCSV(
  data: Array<TimeSeriesDatum>,
  seriesConfigs: Array<ChartSeriesConfig<any>>,
  range: DayjsRange
) {
  const isIntraday = range.startDay.isSame(range.endDay, "day");

  const mappedData = data
    .filter((datum) => !dayjs(datum.dateTime).isAfter(range.endDay, "day"))
    .map((datum) => {
      const fields: Record<string, string> = {};
      fields.Timestamp = dayjs(datum.dateTime).format(
        isIntraday ? "YYYY-MM-DD HH:mm:ss" : "YYYY-MM-DD"
      );

      for (const config of seriesConfigs) {
        const key = config.unit
          ? `${config.label} (${config.unit})`
          : config.label || "Value";

        const value = config.yAccessor(datum);
        fields[key] = isNotNil(value) ? CSV_NUMBER_FORMAT.format(value) : "";
      }

      return fields;
    });

  return stringify(mappedData, {
    header: true,
  });
}

/**
 * Returns a function save a CSV.
 */
export function useSaveAsCSV(resource: ChartResource, range: DayjsRange) {
  const exportData = useAtomValue(graphExportDataAtom);

  const saveAsCSV = useCallback(() => {
    if (!exportData) {
      console.log("no data to save", exportData);
      return;
    }

    const { data, seriesConfigs } = exportData;

    const actualStartDay = dayjs(head(data)?.dateTime ?? range.startDay);
    const actualEndDay = todayOrEarlier(
      dayjs(last(data)?.dateTime ?? range.endDay)
    );

    const csvString = createCSV(data, seriesConfigs, range);
    const csvBytes = new TextEncoder().encode(csvString);

    const label = CHART_RESOURCE_CONFIGS[resource].label;
    const filename = `${label} ${actualStartDay.format(
      "YYYY-MM-DD"
    )} to ${actualEndDay.format("YYYY-MM-DD")}.csv`;

    const blob = new File([csvBytes], filename, {
      type: "text/plain; charset=utf-8",
    });

    const downloadLink = document.createElement("a");
    downloadLink.className = "hidden";
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = filename;

    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
  }, [exportData, range, resource]);

  return { saveAsCSV, hasDataToExport: !!exportData };
}
