import { Device } from "@/api/devices";

export const TRACKER_DEVICE: Device = {
  id: "TRACKER-DEVICE-ID",
  mac: "MAC",
  type: "TRACKER",
  batteryLevel: 53,
  deviceVersion: "Charge 3",
  lastSyncTime: "2021-02-01T12:01:00",
};

export const TRACKER_DEVICE_2: Device = {
  id: "TRACKER-DEVICE-ID-2",
  mac: "MAC",
  type: "TRACKER",
  batteryLevel: 53,
  deviceVersion: "Versa 3",
  lastSyncTime: "2021-02-01T12:02:00",
};

export const MOBILE_TRACK_DEVICE: Device = {
  id: "MOBILE-TRACK-DEVICE-ID",
  mac: "MAC",
  type: "TRACKER",
  batteryLevel: 0,
  deviceVersion: "MobileTrack",
  lastSyncTime: "2021-02-01T12:03:00",
};
