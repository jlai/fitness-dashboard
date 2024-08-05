import { Device } from "@/api/devices";

export const TRACKER_DEVICE: Device = {
  id: "DEVICE-ID",
  mac: "MAC",
  type: "TRACKER",
  batteryLevel: 53,
  deviceVersion: "Charge 3",
  lastSyncTime: "2021-02-01T12:00:00",
};

export const MOBILE_TRACK_DEVICE: Device = {
  id: "DEVICE-ID",
  mac: "MAC",
  type: "TRACKER",
  batteryLevel: 0,
  deviceVersion: "MobileTrack",
  lastSyncTime: "2021-02-01T12:00:00",
};
