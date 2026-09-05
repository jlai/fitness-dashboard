"use client";

import { Alert, Button } from "@mui/material";
import { useQuery } from "@tanstack/react-query";

import { buildMealsQuery } from "@/api/nutrition";
import { showSuccessToast, withErrorToaster } from "@/components/toast";
import { saveMeals } from "@/storage/db/fitbitmigrationdb";

export default function BackupMealsAlert({
  className = "mb-8",
}: {
  className?: string;
}) {
  const { data: meals } = useQuery(buildMealsQuery());

  const saveMealsCopy = withErrorToaster(async () => {
    if (!meals?.length) {
      return;
    }

    await saveMeals(meals);
    showSuccessToast(
      meals.length === 1 ? "Saved 1 meal" : `Saved ${meals.length} meals`
    );
  }, "Error saving meals");

  if (!meals?.length) {
    return null;
  }

  return (
    <Alert
      className={className}
      severity="info"
      action={
        <Button variant="contained" onClick={saveMealsCopy}>
          Backup meals
        </Button>
      }
    >
      Google Health does not support logging meals. You can back up a local copy
      of your Fitbit account meals so they can be used on this website after
      migrating to Google Health. The meals will only be available here, not via
      the Google Health app.
    </Alert>
  );
}
