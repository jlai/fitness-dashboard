import { QueryClient } from "@tanstack/react-query";

import { getDataPoint } from "@/api/datapoints";
import { buildGetExerciseQuery } from "@/api/exercise/exercise";
import type { ServerError } from "@/api/request";

jest.mock("@/api/datapoints", () => ({
  ...jest.requireActual("@/api/datapoints"),
  getDataPoint: jest.fn(),
}));

const mockedGetDataPoint = jest.mocked(getDataPoint);

function serverError(errorType: string, message = "invalid"): ServerError {
  const error = new Error(`server response (400): ${message}`) as ServerError;
  error.status = 400;
  error.errors = [{ errorType, fieldName: "unknown", message }];
  error.errorText = message;
  return error;
}

describe("buildGetExerciseQuery", () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("maps INVALID_ARGUMENT to Exercise not found", async () => {
    mockedGetDataPoint.mockRejectedValue(serverError("INVALID_ARGUMENT"));

    await expect(
      queryClient.fetchQuery(buildGetExerciseQuery("abcd")),
    ).rejects.toThrow("Exercise not found");
  });

  it("maps 404 to Exercise not found", async () => {
    const error = serverError("NOT_FOUND", "not found");
    error.status = 404;
    mockedGetDataPoint.mockRejectedValue(error);

    await expect(
      queryClient.fetchQuery(buildGetExerciseQuery("abcd")),
    ).rejects.toThrow("Exercise not found");
  });

  it("rethrows other datapoint errors", async () => {
    const error = serverError("PERMISSION_DENIED", "permission denied");
    mockedGetDataPoint.mockRejectedValue(error);

    await expect(
      queryClient.fetchQuery(buildGetExerciseQuery("abcd")),
    ).rejects.toBe(error);
  });
});
