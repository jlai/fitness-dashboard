import { Box, Stack, Typography } from "@mui/material";

import { FRACTION_DIGITS_1 } from "@/utils/number-formats";

import StatGauge, { StatPercent } from "./stat-gauge";

interface DailyGoalSummaryProps {
  currentTotal: number;
  dailyGoal: number;
  unit: string;
}

export function DailyGoalSummary({
  currentTotal,
  dailyGoal,
  unit,
}: DailyGoalSummaryProps) {
  return (
    <Stack direction="column" alignItems="center">
      <Typography variant="h5">Daily goal</Typography>
      <Box width={200} height={200} mt={2}>
        <StatGauge
          value={currentTotal}
          valueMax={dailyGoal}
          valueUnits={unit}
          innerContent={<StatPercent ratio={currentTotal / dailyGoal} />}
          bottomContent={
            <Stack direction="column" alignItems="center">
              <Typography>
                {FRACTION_DIGITS_1.format(currentTotal)} /{" "}
                {FRACTION_DIGITS_1.format(dailyGoal)} {unit}
              </Typography>
              {currentTotal < dailyGoal && (
                <Typography>
                  {FRACTION_DIGITS_1.format(dailyGoal - currentTotal)} {unit} to
                  go
                </Typography>
              )}
            </Stack>
          }
        />
      </Box>
    </Stack>
  );
}
