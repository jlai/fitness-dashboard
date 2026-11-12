import { WarningAmber } from "@mui/icons-material";
import { Tooltip } from "@mui/material";

import type { Food } from "@/api/nutrition";
import { hasSuspiciousServingMultipliers } from "@/api/nutrition/food-templates";

export default function ServingSizeWarning({ food }: { food: Food }) {
  if (!hasSuspiciousServingMultipliers(food)) return null;

  return (
    <Tooltip
      title="This food template might have been corrupted during migration but we do not have enough information to tell for sure. Exercise caution and consider replacing it in any meals and using a food from the Google Health database instead."
      describeChild
    >
      <WarningAmber
        color="warning"
        fontSize="small"
        titleAccess="Incorrect serving size"
        tabIndex={0}
      />
    </Tooltip>
  );
}
