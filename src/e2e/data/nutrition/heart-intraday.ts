import { GetHeartIntradayResponse } from "@/api/intraday";

export const HEART_INTRADAY_EMPTY_RESPONSE: GetHeartIntradayResponse = {
  "activities-heart": [
    {
      customHeartRateZones: [],
      heartRateZones: [
        {
          caloriesOut: 0,
          max: 115,
          min: 30,
          minutes: 0,
          name: "Out of Range",
        },
        {
          caloriesOut: 0,
          max: 137,
          min: 115,
          minutes: 0,
          name: "Fat Burn",
        },
        {
          caloriesOut: 0,
          max: 165,
          min: 137,
          minutes: 0,
          name: "Cardio",
        },
        {
          caloriesOut: 0,
          max: 220,
          min: 165,
          minutes: 0,
          name: "Peak",
        },
      ],
      dateTime: "2021-02-01",
      value: "73.21",
    },
  ],
  "activities-heart-intraday": {
    dataset: [],
    datasetInterval: 5,
    datasetType: "minute",
  },
};

export const HEART_INTRADAY_RESPONSE: GetHeartIntradayResponse = {
  "activities-heart": [
    {
      customHeartRateZones: [],
      heartRateZones: [
        {
          caloriesOut: 1009.9404,
          max: 115,
          min: 30,
          minutes: 965,
          name: "Out of Range",
        },
        {
          caloriesOut: 0,
          max: 137,
          min: 115,
          minutes: 0,
          name: "Fat Burn",
        },
        {
          caloriesOut: 0,
          max: 165,
          min: 137,
          minutes: 0,
          name: "Cardio",
        },
        {
          caloriesOut: 0,
          max: 220,
          min: 165,
          minutes: 0,
          name: "Peak",
        },
      ],
      dateTime: "2021-02-01",
      value: "73.21",
    },
  ],
  "activities-heart-intraday": {
    dataset: [
      {
        time: "12:45:00",
        value: 76,
      },
      {
        time: "12:50:00",
        value: 67,
      },
      {
        time: "12:55:00",
        value: 68,
      },
      {
        time: "13:00:00",
        value: 67,
      },
      {
        time: "13:05:00",
        value: 74,
      },
      {
        time: "13:10:00",
        value: 83,
      },
      {
        time: "13:15:00",
        value: 79,
      },
      {
        time: "13:20:00",
        value: 79,
      },
      {
        time: "13:25:00",
        value: 74,
      },
      {
        time: "13:30:00",
        value: 79,
      },
      {
        time: "13:35:00",
        value: 72,
      },
      {
        time: "13:40:00",
        value: 70,
      },
      {
        time: "13:45:00",
        value: 71,
      },
      {
        time: "13:50:00",
        value: 72,
      },
      {
        time: "13:55:00",
        value: 73,
      },
      {
        time: "14:00:00",
        value: 76,
      },
      {
        time: "14:05:00",
        value: 75,
      },
      {
        time: "14:10:00",
        value: 74,
      },
      {
        time: "14:15:00",
        value: 73,
      },
      {
        time: "14:20:00",
        value: 71,
      },
      {
        time: "14:25:00",
        value: 80,
      },
      {
        time: "14:30:00",
        value: 86,
      },
      {
        time: "14:35:00",
        value: 95,
      },
      {
        time: "14:40:00",
        value: 101,
      },
      {
        time: "14:45:00",
        value: 115,
      },
      {
        time: "14:50:00",
        value: 130,
      },
      {
        time: "14:55:00",
        value: 150,
      },
      {
        time: "15:00:00",
        value: 165,
      },
      {
        time: "15:05:00",
        value: 173,
      },
      {
        time: "15:10:00",
        value: 166,
      },
      {
        time: "15:15:00",
        value: 153,
      },
      {
        time: "15:20:00",
        value: 130,
      },
      {
        time: "15:25:00",
        value: 110,
      },
      {
        time: "15:30:00",
        value: 90,
      },
      {
        time: "15:35:00",
        value: 80,
      },
      {
        time: "15:40:00",
        value: 75,
      },
    ],
    datasetInterval: 5,
    datasetType: "minute",
  },
};
