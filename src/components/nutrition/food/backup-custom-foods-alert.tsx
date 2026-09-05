"use client";

import { Alert, Button } from "@mui/material";
import { useQuery } from "@tanstack/react-query";

import { buildCustomFoodsQuery } from "@/api/nutrition";
import { showSuccessToast, withErrorToaster } from "@/components/toast";
import { saveCustomFoods } from "@/storage/db/fitbitmigrationdb";

export default function BackupCustomFoodsAlert({
  className = "mb-8",
}: {
  className?: string;
}) {
  const { data: customFoods } = useQuery(buildCustomFoodsQuery());

  const saveCustomFoodsCopy = withErrorToaster(async () => {
    if (!customFoods?.length) {
      return;
    }

    await saveCustomFoods(customFoods);
    showSuccessToast(
      customFoods.length === 1
        ? "Saved 1 custom food"
        : `Saved ${customFoods.length} custom foods`
    );
  }, "Error saving custom foods");

  if (!customFoods?.length) {
    return null;
  }

  return (
    <Alert
      className={className}
      severity="info"
      action={
        <Button variant="contained" onClick={saveCustomFoodsCopy}>
          Backup custom foods
        </Button>
      }
    >
      Google Health does not support custom foods from 3rd party websites. You
      can back up a local copy of your Fitbit account custom foods so they can
      be used on this website after migrating to Google Health. These custom
      foods will remain separate from the custom foods in the Google Health app.
    </Alert>
  );
}
