import { useSuspenseQuery } from "@tanstack/react-query";
import { Stack, Typography } from "@mui/material";
import { find } from "lodash";
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

import { FRACTION_DIGITS_0 } from "@/utils/number-formats";
import { buildGetDevicesQuery } from "@/api/devices";
import { formatShortDate, TIME } from "@/utils/date-formats";

export function TrackerStatusTileContent() {
  const { data: devices } = useSuspenseQuery(buildGetDevicesQuery());

  const tracker = find(
    devices,
    (device) =>
      device.type === "TRACKER" && device.deviceVersion !== "MobileTrack"
  );
  const mobileTrack = find(
    devices,
    (device) => device.deviceVersion === "MobileTrack"
  );

  const today = dayjs();
  const lastSync =
    (tracker && dayjs(tracker.lastSyncTime)) ??
    (mobileTrack && dayjs(mobileTrack.lastSyncTime));

  return (
    <Stack
      direction="column"
      alignItems="center"
      justifyContent="center"
      className="h-full"
      rowGap={1}
    >
      {lastSync && (
        <>
          {tracker && (
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
