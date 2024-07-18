import {
  BarPlot,
  BarSeriesType,
  ChartsAxisHighlight,
  ChartsGrid,
  ChartsTooltip,
  ChartsXAxis,
  ChartsYAxis,
  LinePlot,
  LineSeriesType,
  MarkPlot,
  ResponsiveChartContainer,
  ResponsiveChartContainerProps,
} from "@mui/x-charts";
import dayjs from "dayjs";
import { useContext } from "react";
import { ChartsOverlay } from "@mui/x-charts/ChartsOverlay";

import { ChartSeriesConfig } from "./series-config";
import { TimeSeriesDatum } from "./data";
import {
  getTickFormatterForDayRange,
  makeAxisValueFormatter,
  makeSeriesValueFormatter,
  MONTH_ONLY_FORMAT,
  MONTH_YEAR_FORMAT,
  TOOLTIP_DATE_FORMAT,
} from "./formatters";
import { TimeSeriesChartContext } from "./context";

interface CommonChartProps<TDatum extends TimeSeriesDatum> {
  data: Array<TDatum> | undefined;
  seriesConfigs: Array<ChartSeriesConfig<TDatum>>;
  yAxisOptions?: YAxisOptions;
}

function useXAxisConfig<TDatum extends TimeSeriesDatum>(
  data?: Array<TDatum>
): ResponsiveChartContainerProps["xAxis"] {
  const {
    range,
    formatDate: customFormatDate,
    aggregation,
  } = useContext(TimeSeriesChartContext);

  const aggregationTickFormat =
    aggregation === "month" ? MONTH_ONLY_FORMAT.format : undefined;
  const aggregationTooltipFormat =
    aggregation === "month" ? MONTH_YEAR_FORMAT.format : undefined;

  const tickFormat =
    aggregationTickFormat ??
    customFormatDate ??
    getTickFormatterForDayRange(range);
  const dates = data?.map((entry) => dayjs(entry.dateTime).toDate()) ?? [];

  const tooltipFormat = aggregationTooltipFormat ?? TOOLTIP_DATE_FORMAT.format;

  return [
    {
      id: "x",
      data: dates,
      scaleType: "band",
      valueFormatter: (value, context) =>
        context.location === "tick" ? tickFormat(value) : tooltipFormat(value),
    },
  ];
}

type NumberFormatter = (value: number) => string;

interface YAxisOptions {
  tickFormat?: NumberFormatter;
  tooltipFormat?: NumberFormatter;
}

function getYAxisConfig({
  tickFormat,
  tooltipFormat,
}: YAxisOptions): ResponsiveChartContainerProps["yAxis"] {
  return [
    {
      id: "y",
      scaleType: "linear",
      valueFormatter: makeAxisValueFormatter({ tickFormat, tooltipFormat }),
    },
  ];
}

function getCommonSeriesProps<TDatum extends TimeSeriesDatum>(
  data: Array<TDatum> | undefined,
  config: ChartSeriesConfig<TDatum>
) {
  const props: Record<string, any> = {
    label: config.label,
    data: data?.map((entry) => config.yAccessor(entry)) ?? [],
    valueFormatter: makeSeriesValueFormatter({
      numberFormat: config.numberFormat,
      unit: config.unit,
    }),
  };

  if (config.color) {
    props.color = config.color;
  }

  return props;
}

function getCommonChartElements({ loading }: { loading: boolean }) {
  return (
    <>
      <ChartsOverlay loading={loading} />
      <ChartsXAxis />
      <ChartsYAxis />
      <ChartsAxisHighlight x="band" />
      <ChartsTooltip />
      <MarkPlot />
      <ChartsGrid horizontal />
    </>
  );
}

export function SimpleBarChart<
  TDatum extends TimeSeriesDatum = TimeSeriesDatum
>({ data, seriesConfigs, yAxisOptions = {} }: CommonChartProps<TDatum>) {
  const xAxis = useXAxisConfig<TDatum>(data);
  const yAxis = getYAxisConfig(yAxisOptions);

  const series: Array<BarSeriesType> = seriesConfigs.map((config) => ({
    type: "bar",
    ...getCommonSeriesProps(data, config),
  }));

  return (
    <ResponsiveChartContainer xAxis={xAxis} yAxis={yAxis} series={series}>
      <BarPlot />
      {getCommonChartElements({ loading: !data })}
    </ResponsiveChartContainer>
  );
}

export function StackedBarChart<
  TDatum extends TimeSeriesDatum = TimeSeriesDatum
>({ data, seriesConfigs, yAxisOptions = {} }: CommonChartProps<TDatum>) {
  const xAxis = useXAxisConfig<TDatum>(data);
  const yAxis = getYAxisConfig(yAxisOptions);

  const series: Array<BarSeriesType> = seriesConfigs.map((config) => ({
    type: "bar",
    stack: "stack",
    ...getCommonSeriesProps(data, config),
  }));

  return (
    <ResponsiveChartContainer xAxis={xAxis} yAxis={yAxis} series={series}>
      <BarPlot />
      {getCommonChartElements({ loading: !data })}
    </ResponsiveChartContainer>
  );
}

export function SimpleLineChart<
  TDatum extends TimeSeriesDatum = TimeSeriesDatum
>({ data, seriesConfigs, yAxisOptions = {} }: CommonChartProps<TDatum>) {
  const xAxis = useXAxisConfig<TDatum>(data);
  const yAxis = getYAxisConfig(yAxisOptions);

  const series: Array<LineSeriesType> = seriesConfigs.map((config) => ({
    type: "line",
    connectNulls: true,
    showMark: config.showMark,
    ...getCommonSeriesProps(data, config),
  }));

  return (
    <ResponsiveChartContainer xAxis={xAxis} yAxis={yAxis} series={series}>
      <LinePlot />
      {getCommonChartElements({ loading: !data })}
    </ResponsiveChartContainer>
  );
}
