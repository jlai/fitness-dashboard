import { test, expect } from "@/e2e/fixtures";
import { TimeSeriesEntry } from "@/api/times-series";
import {
  INITIAL_WEIGHT_DATA_POINTS,
  INITIAL_FAT_DATA_POINTS,
  NEW_WEIGHT_DATA_POINT,
  NEW_FAT_DATA_POINT,
  WEIGHT_TIME_SERIES,
  FAT_TIME_SERIES,
  TODAY_ISO,
  kgFromPounds,
} from "@/e2e/data/weight";

async function setupTimeSeriesData(
  timeSeriesApi: {
    setWeightTimeSeriesResponse: (
      response: TimeSeriesEntry<string>[],
    ) => Promise<void>;
    setFatTimeSeriesResponse: (
      response: TimeSeriesEntry<string>[],
    ) => Promise<void>;
  },
  weightTimeSeries: TimeSeriesEntry<string>[],
  fatTimeSeries: TimeSeriesEntry<string>[],
) {
  await timeSeriesApi.setWeightTimeSeriesResponse(weightTimeSeries);
  await timeSeriesApi.setFatTimeSeriesResponse(fatTimeSeries);
}

test("can log a new weight entry", async ({
  page,
  pageObjects: { toasts },
  weightApi,
  timeSeriesApi,
}) => {
  await weightApi.setWeightLogsResponse(INITIAL_WEIGHT_DATA_POINTS);
  await weightApi.setBodyFatLogsResponse(INITIAL_FAT_DATA_POINTS);

  await setupTimeSeriesData(
    timeSeriesApi,
    WEIGHT_TIME_SERIES,
    FAT_TIME_SERIES,
  );

  await page.goto("/history/weight");

  const initialWeightCell = page.getByRole("cell", { name: "168" });
  await expect(initialWeightCell).toBeVisible();
  const initialFatCell = page.getByRole("cell", { name: "21%" });
  await expect(initialFatCell).toBeVisible();

  const logWeightButton = page.getByRole("button", { name: "Log weight" });
  await logWeightButton.click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  const weightField = dialog.getByLabel("Weight");
  await weightField.fill("166.5");

  const fatField = dialog.getByLabel("Percent fat");
  await fatField.fill("20");

  await weightApi.setWeightLogSaveResponse(true);
  await weightApi.setFatLogSaveResponse(true);

  await weightApi.setWeightLogsResponse([
    NEW_WEIGHT_DATA_POINT,
    ...INITIAL_WEIGHT_DATA_POINTS,
  ]);
  await weightApi.setBodyFatLogsResponse([
    NEW_FAT_DATA_POINT,
    ...INITIAL_FAT_DATA_POINTS,
  ]);

  const updatedWeightTimeSeries = [
    { dateTime: TODAY_ISO, value: kgFromPounds(166.5) },
    ...WEIGHT_TIME_SERIES.filter((entry) => entry.dateTime !== TODAY_ISO),
  ];

  const updatedFatTimeSeries = [
    { dateTime: TODAY_ISO, value: "20" },
    ...FAT_TIME_SERIES.filter((entry) => entry.dateTime !== TODAY_ISO),
  ];

  await setupTimeSeriesData(
    timeSeriesApi,
    updatedWeightTimeSeries,
    updatedFatTimeSeries,
  );

  const saveButton = dialog.getByRole("button", { name: "Save" });
  await saveButton.click();

  await expect(toasts.successToasts).toHaveText(/Logged weight/);

  const newWeightCell = page.getByRole("cell", { name: "166.5" });
  await expect(newWeightCell).toBeVisible();
  const newFatCell = page.getByRole("cell", { name: "20%" });
  await expect(newFatCell).toBeVisible();

  await expect(initialWeightCell).toBeVisible();
  await expect(initialFatCell).toBeVisible();
});

test("handles weight log save failure", async ({
  page,
  pageObjects: { toasts },
  weightApi,
  timeSeriesApi,
}) => {
  await setupTimeSeriesData(
    timeSeriesApi,
    WEIGHT_TIME_SERIES,
    FAT_TIME_SERIES,
  );

  await page.goto("/history/weight");

  const logWeightButton = page.getByRole("button", { name: "Log weight" });
  await logWeightButton.click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  const weightField = dialog.getByLabel("Weight");
  await weightField.fill("166.5");

  await weightApi.setWeightLogSaveResponse(false, "Failed to save weight log");

  const saveButton = dialog.getByRole("button", { name: "Save" });
  await saveButton.click();

  await expect(toasts.allToasts).toHaveText(/Error logging weight/);

  await expect(dialog).toBeVisible();
});
