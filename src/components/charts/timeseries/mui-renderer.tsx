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

import { ChartSeriesConfig } from "./series-config";
import { StringValueDatum, TimeSeriesDatum } from "./data";
import {
  getTickFormatterForDayRange,
  makeAxisValueFormatter,
  makeSeriesValueFormatter,
  TOOLTIP_DATE_FORMAT,
} from "./formatters";
import { TimeSeriesChartContext } from "./context";

interface CommonChartProps<TDatum = TimeSeriesDatum> {
  data: Array<TDatum> | undefined;
  seriesConfigs: Array<ChartSeriesConfig<TDatum>>;
  yAxisOptions?: YAxisOptions;
}

function useXAxisConfig<TDatum extends TimeSeriesDatum>(
  data?: Array<TDatum>
): ResponsiveChartContainerProps["xAxis"] {
  const { range, formatDate: customFormatDate } = useContext(
    TimeSeriesChartContext
  );

  const tickFormat = customFormatDate ?? getTickFormatterForDayRange(range);
  const dates = data?.map((entry) => dayjs(entry.dateTime).toDate()) ?? [];

  return [
    {
      id: "x",
      data: dates,
      scaleType: "band",
      valueFormatter: (value, context) =>
        context.location === "tick"
          ? tickFormat(value)
          : TOOLTIP_DATE_FORMAT.format(value),
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

function getCommonChartElements() {
  return (
    <>
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
  TDatum extends TimeSeriesDatum = StringValueDatum
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
      {getCommonChartElements()}
    </ResponsiveChartContainer>
  );
}

export function StackedBarChart<
  TDatum extends TimeSeriesDatum = StringValueDatum
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
      {getCommonChartElements()}
    </ResponsiveChartContainer>
  );
}

export function SimpleLineChart<
  TDatum extends TimeSeriesDatum = StringValueDatum
>({ data, seriesConfigs, yAxisOptions = {} }: CommonChartProps<TDatum>) {
  const xAxis = useXAxisConfig<TDatum>(data);
  const yAxis = getYAxisConfig(yAxisOptions);

  const series: Array<LineSeriesType> = seriesConfigs.map((config) => ({
    type: "line",
    connectNulls: true,
    showMark: false,
    ...getCommonSeriesProps(data, config),
  }));

  return (
    <ResponsiveChartContainer xAxis={xAxis} yAxis={yAxis} series={series}>
      <LinePlot />
      {getCommonChartElements()}
    </ResponsiveChartContainer>
  );
}
