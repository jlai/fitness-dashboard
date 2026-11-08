import { getPairedDeviceId } from "@/api/devices";
import { resolveDevice } from "@/app/(dashboard)/tiles/tracker-status";
import {
  MOBILE_TRACK_DEVICE,
  TRACKER_DEVICE,
  TRACKER_DEVICE_2,
} from "@/e2e/data/devices";

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

  it("resolves a specific paired device by id", () => {
    const device = resolveDevice([TRACKER_DEVICE, TRACKER_DEVICE_2], {
      deviceId: getPairedDeviceId(TRACKER_DEVICE_2),
    });
    expect(device).toBe(TRACKER_DEVICE_2);
  });
});
