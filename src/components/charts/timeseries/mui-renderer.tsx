import {
  AxisConfig,
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
} from "@mui/x-charts";
import dayjs from "dayjs";
import { useContext } from "react";
import { ChartsOverlay } from "@mui/x-charts/ChartsOverlay";

import { ChartSeriesConfig } from "./series-config";
import { TimeSeriesDatum } from "./data";
import {
  getTickFormatterForDayRange,
  getTooltipFormatterForDayRange,
  makeAxisValueFormatter,
  makeSeriesValueFormatter,
  MONTH_ONLY_FORMAT,
  MONTH_YEAR_FORMAT,
} from "./formatters";
import { TimeSeriesChartContext } from "./context";

const CHART_MARGINS = { top: 16, bottom: 28, right: 8 };

interface CommonChartProps<TDatum extends TimeSeriesDatum> {
  data: Array<TDatum> | undefined;
  seriesConfigs: Array<ChartSeriesConfig<TDatum>>;
  yAxisOptions?: YAxisOptions;
}

type EitherAxisConfig = Partial<Omit<AxisConfig, "position">>;

function useXAxisConfig<TDatum extends TimeSeriesDatum>(
  data?: Array<TDatum>
): Array<EitherAxisConfig> {
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

  const tooltipFormat =
    aggregationTooltipFormat ?? getTooltipFormatterForDayRange(range);

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
}: YAxisOptions): Array<EitherAxisConfig> {
  return [
    {
      id: "y",
      scaleType: "linear",
      valueFormatter: makeAxisValueFormatter({ tickFormat, tooltipFormat }),
    },
  ];
}

function getCommonSeriesProps<TDatum extends TimeSeriesDatum>({
  data,
  config,
  layout,
}: {
  data: Array<TDatum> | undefined;
  config: ChartSeriesConfig<TDatum>;
  layout?: "horizontal" | "vertical";
}) {
  const props: Record<string, any> = {
    label: config.label,
    data: data?.map((entry) => config.yAccessor(entry)) ?? [],
    valueFormatter: makeSeriesValueFormatter({
      numberFormat: config.numberFormat,
      unit: config.unit,
    }),
    layout: layout ?? "vertical",
  };

  if (config.color) {
    props.color = config.color;
  }

  return props;
}

function CommonChartElements({
  layout,
  loading,
}: {
  layout?: "horizontal" | "vertical";
  loading: boolean;
}) {
  const isHorizontal = layout === "horizontal";

  return (
    <>
      <ChartsOverlay loading={loading} />
      <ChartsXAxis />
      <ChartsYAxis />
      <ChartsAxisHighlight
        x={!isHorizontal ? "band" : undefined}
        y={isHorizontal ? "band" : undefined}
      />
      <ChartsTooltip />
      <MarkPlot />
      <ChartsGrid horizontal={!isHorizontal} vertical={isHorizontal} />
    </>
  );
}

function useAxes<TDatum extends TimeSeriesDatum>({
  layout,
  data,
  yAxisOptions,
}: {
  layout?: "vertical" | "horizontal";
  data: Array<TDatum> | undefined;
  yAxisOptions: YAxisOptions;
}) {
  const xAxis = useXAxisConfig<TDatum>(data);
  const yAxis = getYAxisConfig(yAxisOptions);

  if (layout === "horizontal") {
    return { xAxis: yAxis, yAxis: xAxis };
  }

  return { xAxis, yAxis };
}

export function SimpleBarChart<
  TDatum extends TimeSeriesDatum = TimeSeriesDatum
>({ data, seriesConfigs, yAxisOptions = {} }: CommonChartProps<TDatum>) {
  const { layout } = useContext(TimeSeriesChartContext);
  const axesProps = useAxes({ layout, data, yAxisOptions });

  const series: Array<BarSeriesType> = seriesConfigs.map((config) => ({
    type: "bar",
    ...getCommonSeriesProps({ data, config, layout }),
  }));

  return (
    <ResponsiveChartContainer
      series={series}
      {...axesProps}
      margin={CHART_MARGINS}
    >
      <BarPlot />
      <CommonChartElements layout={layout} loading={!data} />
    </ResponsiveChartContainer>
  );
}

export function StackedBarChart<
  TDatum extends TimeSeriesDatum = TimeSeriesDatum
>({ data, seriesConfigs, yAxisOptions = {} }: CommonChartProps<TDatum>) {
  const { layout } = useContext(TimeSeriesChartContext);
  const axesProps = useAxes({ layout, data, yAxisOptions });

  const series: Array<BarSeriesType> = seriesConfigs.map((config) => ({
    type: "bar",
    stack: "stack",
    ...getCommonSeriesProps({ data, config, layout }),
  }));

  return (
    <ResponsiveChartContainer
      series={series}
      {...axesProps}
      margin={CHART_MARGINS}
    >
      <BarPlot />
      <CommonChartElements layout={layout} loading={!data} />
    </ResponsiveChartContainer>
  );
}

export function SimpleLineChart<
  TDatum extends TimeSeriesDatum = TimeSeriesDatum
>({ data, seriesConfigs, yAxisOptions = {} }: CommonChartProps<TDatum>) {
  const axesProps = useAxes({ data, yAxisOptions });

  const series: Array<LineSeriesType> = seriesConfigs.map((config) => ({
    type: "line",
    connectNulls: true,
    showMark: config.showMark,
    curve: config.curve,
    ...getCommonSeriesProps({ data, config }),
  }));

  return (
    <ResponsiveChartContainer
      series={series}
      {...axesProps}
      margin={CHART_MARGINS}
    >
      <LinePlot />
      <CommonChartElements loading={!data} />
    </ResponsiveChartContainer>
  );
}
