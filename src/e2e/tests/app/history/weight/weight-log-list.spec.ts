import dayjs from "dayjs";

import { test, expect } from "@/e2e/fixtures";
import { TimeSeriesEntry } from "@/api/times-series";
import {
  TODAY,
  INITIAL_WEIGHT_LOGS,
  NEW_WEIGHT_LOG,
  WEIGHT_TIME_SERIES,
  FAT_TIME_SERIES,
  BMI_TIME_SERIES,
  TODAY_ISO,
} from "@/e2e/data/weight";

function createMonthDateRange(day: dayjs.Dayjs) {
  const startOfMonth = day.startOf("month");
  const endOfMonth = day.endOf("month");
  return {
    start: startOfMonth.format("YYYY-MM-DD"),
    end: endOfMonth.format("YYYY-MM-DD"),
  };
}

async function setupTimeSeriesData(
  timeSeriesApi: any,
  weightTimeSeries: TimeSeriesEntry<string>[],
  fatTimeSeries: TimeSeriesEntry<string>[],
  bmiTimeSeries: TimeSeriesEntry<string>[],
  dateRange: { start: string; end: string }
) {
  await timeSeriesApi.setWeightTimeSeriesResponse(weightTimeSeries, dateRange);
  await timeSeriesApi.setFatTimeSeriesResponse(fatTimeSeries, dateRange);
  await timeSeriesApi.setBmiTimeSeriesResponse(bmiTimeSeries, dateRange);
}

test("can log a new weight entry", async ({
  page,
  pageObjects: { toasts },
  weightApi,
  timeSeriesApi,
  userApi,
}) => {
  // Set user profile to use pounds for weight
  await userApi.setUserProfile({
    weightUnit: "en_US", // Use US units (pounds)
  });

  // Set up initial weight logs
  await weightApi.setWeightLogsResponse(INITIAL_WEIGHT_LOGS);

  // Set the time series responses with a date range that covers the entire month
  await setupTimeSeriesData(
    timeSeriesApi,
    WEIGHT_TIME_SERIES,
    FAT_TIME_SERIES,
    BMI_TIME_SERIES,
    createMonthDateRange(TODAY)
  );

  await page.goto("/history/weight");

  // Verify initial weight logs are displayed
  const initialWeightCell = page.getByRole("cell", { name: "168" });
  await expect(initialWeightCell).toBeVisible();
  const initialFatCell = page.getByRole("cell", { name: "21%" });
  await expect(initialFatCell).toBeVisible();

  // Click the "Log weight" button
  const logWeightButton = page.getByRole("button", { name: "Log weight" });
  await logWeightButton.click();

  // Dialog should be visible
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  // Fill in the weight form
  const weightField = dialog.getByLabel("Weight");
  await weightField.fill("166.5"); // 166.5 pounds

  // Optional: Fill in body fat percentage
  const fatField = dialog.getByLabel("Percent fat");
  await fatField.fill("20");

  // Mock the save request responses
  await weightApi.setWeightLogSaveResponse(true);
  await weightApi.setFatLogSaveResponse(true);

  // Mock the API response for the weight log - should include both old and new logs
  await weightApi.setWeightLogsResponse([
    NEW_WEIGHT_LOG,
    ...INITIAL_WEIGHT_LOGS,
  ]);

  // Create updated time series
  const updatedWeightTimeSeries = [
    { dateTime: TODAY_ISO, value: NEW_WEIGHT_LOG.weight.toString() },
    ...WEIGHT_TIME_SERIES.filter((entry) => entry.dateTime !== TODAY_ISO),
  ];

  const updatedFatTimeSeries = [
    { dateTime: TODAY_ISO, value: NEW_WEIGHT_LOG.fat?.toString() ?? "0" },
    ...FAT_TIME_SERIES.filter((entry) => entry.dateTime !== TODAY_ISO),
  ];

  const updatedBmiTimeSeries = [
    { dateTime: TODAY_ISO, value: NEW_WEIGHT_LOG.bmi?.toString() ?? "0" },
    ...BMI_TIME_SERIES.filter((entry) => entry.dateTime !== TODAY_ISO),
  ];

  // Update the time series responses to include the new entry
  await setupTimeSeriesData(
    timeSeriesApi,
    updatedWeightTimeSeries,
    updatedFatTimeSeries,
    updatedBmiTimeSeries,
    createMonthDateRange(TODAY)
  );

  // Click save button
  const saveButton = dialog.getByRole("button", { name: "Save" });
  await saveButton.click();

  // Verify success toast appears
  await expect(toasts.successToasts).toHaveText(/Logged weight/);

  // Verify both weight logs appear in the list
  const newWeightCell = page.getByRole("cell", { name: "166.5" });
  await expect(newWeightCell).toBeVisible();
  const newFatCell = page.getByRole("cell", { name: "20%" });
  await expect(newFatCell).toBeVisible();

  // Previous weight log should still be visible
  await expect(initialWeightCell).toBeVisible();
  await expect(initialFatCell).toBeVisible();
});

test("handles weight log save failure", async ({
  page,
  pageObjects: { toasts },
  weightApi,
  timeSeriesApi,
  userApi,
}) => {
  // Set user profile to use pounds for weight
  await userApi.setUserProfile({
    weightUnit: "en_US", // Use US units (pounds)
  });

  // Set up mock time series data
  const dateRange = createMonthDateRange(TODAY);
  await setupTimeSeriesData(
    timeSeriesApi,
    WEIGHT_TIME_SERIES,
    FAT_TIME_SERIES,
    BMI_TIME_SERIES,
    dateRange
  );

  await page.goto("/history/weight");

  // Click the "Log weight" button
  const logWeightButton = page.getByRole("button", { name: "Log weight" });
  await logWeightButton.click();

  // Dialog should be visible
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  // Fill in the weight form
  const weightField = dialog.getByLabel("Weight");
  await weightField.fill("166.5");

  // Mock the save request to fail
  await weightApi.setWeightLogSaveResponse(false, "Failed to save weight log");

  // Click save button
  const saveButton = dialog.getByRole("button", { name: "Save" });
  await saveButton.click();

  // Verify error toast appears
  await expect(toasts.allToasts).toHaveText(/Error logging weight/);

  // Dialog should still be visible (not closed on error)
  await expect(dialog).toBeVisible();
});
