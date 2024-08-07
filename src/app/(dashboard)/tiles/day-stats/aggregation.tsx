import { ToggleButtonGroup, ToggleButton } from "@mui/material";

export type IntradayInterval = "15min" | "hour";

export function IntradayIntervalSelect({
  value,
  onChange,
}: {
  value: IntradayInterval;
  onChange: (value: IntradayInterval) => void;
}) {
  return (
    <ToggleButtonGroup
      aria-label="interval"
      exclusive
      value={value}
      onChange={(event, newValue) => {
        if (!newValue) {
          return;
        }

        onChange(newValue);
      }}
    >
      <ToggleButton value="15min">15 min</ToggleButton>
      <ToggleButton value="hour">Hour</ToggleButton>
    </ToggleButtonGroup>
  );
}
