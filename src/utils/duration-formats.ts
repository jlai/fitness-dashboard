"use client";

import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";

dayjs.extend(duration);

export function formatDuration(milliseconds: number) {
  return dayjs.duration(milliseconds).format("HH:mm:ss");
}

export function formatMinutes(minutes: number) {
  const duration = dayjs.duration(minutes, "minutes");

  const formatParts = [];

  if (duration.hours() > 0) {
    formatParts.push("H[h]");
  }

  if (duration.minutes() > 0 || duration.hours() === 0) {
    formatParts.push("m[m]");
  }

  return duration.format(formatParts.join(" "));
}

export function formatSeconds(seconds: number) {
  const duration = dayjs.duration(seconds, "seconds");

  const formatParts = [];

  if (duration.hours() > 0) {
    formatParts.push("H[h]");
  }

  if (duration.minutes() > 0) {
    formatParts.push("m[m]");
  }

  if (duration.seconds() > 0) {
    formatParts.push("s[s]");
  }

  return duration.format(formatParts.join(" "));
}
