import { useSuspenseQuery } from "@tanstack/react-query";
import {
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import { find, sortBy } from "lodash";
import {
  Battery0Bar,
  Battery1Bar,
  Battery3Bar,
  Battery4Bar,
  Battery5Bar,
  Battery6Bar,
  BatteryFull,
  Sync,
} from "@mui/icons-material";
import dayjs from "dayjs";
import { useId } from "react";

import { FRACTION_DIGITS_0 } from "@/utils/number-formats";
import { buildGetDevicesQuery, Device } from "@/api/devices";
import { formatShortDate, TIME } from "@/utils/date-formats";
import { FormRow } from "@/components/forms/form-row";

import { RenderDialogContentProps, TileWithDialog } from "./tile-with-dialog";
import { useTileSetting, useTileSettings } from "./tile";

interface TrackerStatusTileSettings {
  deviceId?: string;
}

interface ResolveDeviceOptions {
  deviceId?: string;
}

export function resolveDevice(
  devices: Device[],
  { deviceId }: ResolveDeviceOptions = {}
) {
  const sortedDevices = sortBy(
    devices,
    (device) => device.lastSyncTime || ""
  ).toReversed();

  let tracker =
    deviceId && find(sortedDevices, (device) => device.id === deviceId);

  if (tracker) {
    return tracker;
  }

  tracker = find(
    sortedDevices,
    (device) =>
      device.type === "TRACKER" && device.deviceVersion !== "MobileTrack"
  );

  if (!tracker || !tracker.lastSyncTime) {
    find(sortedDevices, (device) => device.deviceVersion === "MobileTrack");
  }

  return tracker;
}

export function TrackerStatusTileContent() {
  const [settings] = useTileSettings<TrackerStatusTileSettings>({});
  const { data: devices } = useSuspenseQuery(buildGetDevicesQuery());

  const tracker = resolveDevice(devices, { deviceId: settings.deviceId });

  const today = dayjs();
  const lastSync = tracker && dayjs(tracker.lastSyncTime);

  return (
    <TileWithDialog dialogComponent={TrackerStatusTileDialogContent}>
      <Stack
        direction="column"
        alignItems="center"
        justifyContent="center"
        className="h-full"
        rowGap={1}
      >
        {lastSync && (
          <>
            {tracker && tracker.deviceVersion !== "MobileTrack" && (
              <Stack direction="row" alignItems="center" columnGap={1}>
                <BatteryIcon level={tracker.batteryLevel} />
                <Typography>
                  {FRACTION_DIGITS_0.format(tracker.batteryLevel)}%
                </Typography>
              </Stack>
            )}
            <Stack direction="row" alignItems="center" columnGap={1}>
              <Sync titleAccess="Last sync" />
              <Typography variant="subtitle2">
                {lastSync.isSame(today, "day")
                  ? TIME.format(lastSync.toDate())
                  : formatShortDate(lastSync)}
              </Typography>
            </Stack>
          </>
        )}
        {!lastSync && <Typography>No devices</Typography>}
      </Stack>
    </TileWithDialog>
  );
}

function BatteryIcon({ level }: { level: number }) {
  if (level > 95) {
    return <BatteryFull />;
  } else if (level > 80) {
    return <Battery6Bar />;
  } else if (level > 65) {
    return <Battery5Bar />;
  } else if (level > 50) {
    return <Battery4Bar />;
  } else if (level > 35) {
    return <Battery3Bar />;
  } else if (level > 15) {
    return <Battery1Bar />;
  } else {
    return <Battery0Bar />;
  }
}

function formatOptionDetails(device: Device) {
  const parts = [`Last sync: ${formatShortDate(dayjs(device.lastSyncTime))}`];

  if (device.deviceVersion !== "MobileTrack") {
    parts.push(`${device.batteryLevel}%`);
  }

  return parts.join(" \u2022 ");
}

function TrackerStatusTileDialogContent({
  closeButton,
}: RenderDialogContentProps) {
  const [deviceId, setDeviceId] = useTileSetting<
    TrackerStatusTileSettings,
    "deviceId"
  >("deviceId", undefined);
  const { data: devices } = useSuspenseQuery(buildGetDevicesQuery());
  const labelId = useId();

  return (
    <>
      <DialogTitle>Device status</DialogTitle>
      <DialogContent>
        <Typography>Select a device to display.</Typography>
        <FormRow mt={4}>
          <FormControl fullWidth className="min-w-[200px]" hiddenLabel>
            <InputLabel id={labelId} shrink>
              Device
            </InputLabel>
            <Select
              displayEmpty
              value={deviceId ?? ""}
              labelId={labelId}
              label="Device"
              hiddenLabel
              onChange={(event) => setDeviceId(event.target.value || undefined)}
            >
              <MenuItem value="">Most recent</MenuItem>
              {devices
                .filter((device) => device.type === "TRACKER")
                .map((device) => (
                  <MenuItem key={device.id} value={device.id}>
                    <ListItemText
                      primary={device.deviceVersion}
                      secondary={formatOptionDetails(device)}
                    />
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </FormRow>
      </DialogContent>
      <DialogActions>{closeButton}</DialogActions>
    </>
  );
}
