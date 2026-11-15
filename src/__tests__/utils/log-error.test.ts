import { logError } from "@/utils/log-error";

const configMock = { DEV_MODE_ENABLED: true };

jest.mock("@/config", () => ({
  ...jest.requireActual("@/config"),
  get DEV_MODE_ENABLED() {
    return configMock.DEV_MODE_ENABLED;
  },
}));

describe("logError", () => {
  const consoleLog = jest.spyOn(console, "log").mockImplementation(() => {});

  afterEach(() => {
    consoleLog.mockClear();
    configMock.DEV_MODE_ENABLED = true;
  });

  afterAll(() => {
    consoleLog.mockRestore();
  });

  it("logs the full error object when DEV_MODE is enabled", () => {
    const error = new Error("boom");
    logError("something failed", error);
    expect(consoleLog).toHaveBeenCalledWith("something failed", error);
  });

  it("logs only error.message when DEV_MODE is disabled", () => {
    configMock.DEV_MODE_ENABLED = false;
    const error = new Error("boom");
    logError("something failed", error);
    expect(consoleLog).toHaveBeenCalledWith("something failed", "boom");
  });

  it("logs the message alone when no error is provided", () => {
    logError("something failed");
    expect(consoleLog).toHaveBeenCalledWith("something failed");
  });
});
