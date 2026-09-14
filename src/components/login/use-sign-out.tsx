"use client";

import { Checkbox, FormControlLabel, Typography } from "@mui/material";
import { useConfirm } from "material-ui-confirm";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { logout } from "@/api/auth";
import { wipeLocalData } from "@/storage/wipe-local-data";

function ClearSavedSettingsCheckbox({
  onChange,
}: {
  onChange: (checked: boolean) => void;
}) {
  return (
    <FormControlLabel
      className="mt-4 items-start"
      control={
        <Checkbox
          defaultChecked={false}
          onChange={(_event, checked) => onChange(checked)}
        />
      }
      label="Clear saved settings. This will remove any saved goals, meals, dashboard layout, and other settings."
    />
  );
}

/** Confirm sign-out, optionally wiping local data, then clear caches and leave. */
export function useSignOut() {
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const router = useRouter();

  return () => {
    let clearSavedSettings = false;

    confirm({
      title: "Sign out",
      content: (
        <>
          <Typography>
            Sign out of your Google account on this website?
          </Typography>
          <ClearSavedSettingsCheckbox
            onChange={(checked) => {
              clearSavedSettings = checked;
            }}
          />
        </>
      ),
      confirmationText: "Sign out",
    }).then(async ({ confirmed }) => {
      if (!confirmed) {
        return;
      }

      await logout();

      if (clearSavedSettings) {
        await wipeLocalData();
        queryClient.clear();
        window.location.assign("/");
        return;
      }

      queryClient.clear();
      router.replace("/");
    });
  };
}
