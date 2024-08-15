import { resolveDevice } from "@/app/(dashboard)/tiles/tracker-status";
import { TRACKER_DEVICE, MOBILE_TRACK_DEVICE } from "@/e2e/data/devices";

describe("resolveDevice", () => {
  it("resolves tracker", () => {
    const device = resolveDevice([MOBILE_TRACK_DEVICE, TRACKER_DEVICE]);
    expect(device).toBe(TRACKER_DEVICE);
  });

  it("resolves most recently sync'd tracker", () => {
    const tracker1 = { ...TRACKER_DEVICE, lastSyncTime: "2021-02-01T12:00:00" };
    const tracker2 = { ...TRACKER_DEVICE, lastSyncTime: "2022-02-01T12:00:00" };

    const device = resolveDevice([tracker1, tracker2]);
    expect(device).toBe(tracker2);
  });
});
