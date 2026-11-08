import type { DataPoint } from "@generated/orval/fetch/google-health-api/models";

const HEART_RATE_SAMPLES: Array<{ time: string; value: number }> = [
  { time: "12:45:00", value: 76 },
  { time: "12:50:00", value: 67 },
  { time: "12:55:00", value: 68 },
  { time: "13:00:00", value: 67 },
  { time: "13:05:00", value: 74 },
  { time: "13:10:00", value: 83 },
  { time: "13:15:00", value: 79 },
  { time: "13:20:00", value: 79 },
  { time: "13:25:00", value: 74 },
  { time: "13:30:00", value: 79 },
  { time: "13:35:00", value: 72 },
  { time: "13:40:00", value: 70 },
  { time: "13:45:00", value: 71 },
  { time: "13:50:00", value: 72 },
  { time: "13:55:00", value: 73 },
  { time: "14:00:00", value: 76 },
  { time: "14:05:00", value: 75 },
  { time: "14:10:00", value: 74 },
  { time: "14:15:00", value: 73 },
  { time: "14:20:00", value: 71 },
  { time: "14:25:00", value: 80 },
  { time: "14:30:00", value: 86 },
  { time: "14:35:00", value: 95 },
  { time: "14:40:00", value: 101 },
  { time: "14:45:00", value: 115 },
  { time: "14:50:00", value: 130 },
  { time: "14:55:00", value: 150 },
  { time: "15:00:00", value: 165 },
  { time: "15:05:00", value: 173 },
  { time: "15:10:00", value: 166 },
  { time: "15:15:00", value: 153 },
  { time: "15:20:00", value: 130 },
  { time: "15:25:00", value: 110 },
  { time: "15:30:00", value: 90 },
  { time: "15:35:00", value: 80 },
  { time: "15:40:00", value: 75 },
];

function heartRateDataPoint(time: string, beatsPerMinute: number): DataPoint {
  return {
    heartRate: {
      beatsPerMinute: String(beatsPerMinute),
      sampleTime: {
        physicalTime: `2021-02-01T${time}-07:00`,
      },
    },
  };
}

export const HEART_INTRADAY_EMPTY_DATAPOINTS: Array<DataPoint> = [];

export const HEART_INTRADAY_DATAPOINTS: Array<DataPoint> =
  HEART_RATE_SAMPLES.map(({ time, value }) => heartRateDataPoint(time, value));
