import { PairedDevice, PairedDeviceDeviceType } from "@/api/devices";

export const TRACKER_DEVICE: PairedDevice = {
  name: "users/me/pairedDevices/TRACKER-DEVICE-ID",
  macAddress: "MAC",
  deviceType: PairedDeviceDeviceType.TRACKER,
  batteryStatus: "Medium",
  batteryLevel: 53,
  deviceVersion: "Charge 3",
  lastSyncTime: "2021-02-01T12:01:00",
};

export const TRACKER_DEVICE_2: PairedDevice = {
  name: "users/me/pairedDevices/TRACKER-DEVICE-ID-2",
  macAddress: "MAC",
  deviceType: PairedDeviceDeviceType.TRACKER,
  batteryStatus: "Medium",
  batteryLevel: 53,
  deviceVersion: "Versa 3",
  lastSyncTime: "2021-02-01T12:02:00",
};

export const MOBILE_TRACK_DEVICE: PairedDevice = {
  name: "users/me/pairedDevices/MOBILE-TRACK-DEVICE-ID",
  macAddress: "MAC",
  deviceType: PairedDeviceDeviceType.TRACKER,
  batteryStatus: "Empty",
  batteryLevel: 0,
  deviceVersion: "MobileTrack",
  lastSyncTime: "2021-02-01T12:03:00",
};
