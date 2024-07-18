import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { buildActivityTcxQuery } from "@/api/activity/activities";
import { ParsedTcx, parseTcx } from "@/api/activity/tcx";
import { useUnits } from "@/config/units";

type LocalizedTrackpoint = {
  time: Date;
  altitudeLocalized: number;
};

function useObjectUrl(object: File | Blob | null) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!object) {
      return;
    }

    const url = URL.createObjectURL(object);
    setObjectUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [object, setObjectUrl]);

  return objectUrl;
}

/** Turn a TCX string into a url that can be downloaded */
export function useTcxDownloadUrl(
  tcxString: string | undefined,
  tcxFilename: string
) {
  const tcxFile = useMemo(() => {
    return tcxString
      ? new File([tcxString], tcxFilename, {
          type: "application/vnd.garmin.tcx+xml",
        })
      : null;
  }, [tcxString, tcxFilename]);

  const tcxDownloadUrl = useObjectUrl(tcxFile);

  return tcxDownloadUrl;
}

export function useFetchTcxAsString(activityLogId: number) {
  const { data: tcxString } = useQuery(buildActivityTcxQuery(activityLogId));
  return tcxString;
}

export function useParsedTcx(tcxString?: string) {
  return useMemo(
    () => (tcxString ? parseTcx(tcxString) : undefined),
    [tcxString]
  );
}

/** Parses a TCX string into trackpoints using localized units */
export function useTrackpoints(parsedTcx?: ParsedTcx) {
  const units = useUnits();

  return useMemo(() => {
    let hasElevation = false,
      hasHeartRate = false,
      hasLocation = false;

    const localizedTrackpoints: Array<LocalizedTrackpoint> = [];

    for (const trackpoint of parsedTcx?.trackpoints ?? []) {
      if (trackpoint.altitudeMeters !== undefined) {
        hasElevation = true;

        localizedTrackpoints.push({
          time: trackpoint.time,
          altitudeLocalized: units.localizedMeters(trackpoint.altitudeMeters),
        });
      }

      if (trackpoint.heartBpm !== undefined) {
        hasHeartRate = true;
      }

      if (trackpoint.latitudeDegrees !== undefined) {
        hasLocation = true;
      }
    }

    return { hasElevation, hasHeartRate, hasLocation, localizedTrackpoints };
  }, [parsedTcx, units]);
}
