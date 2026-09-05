"use client";

import { useRouter } from "next/navigation";
import { Button } from "@mui/material";

import RequireLogin from "@/components/require-login";
import { RequireScopes } from "@/components/require-scopes";

import MigrationBackup from "./migration-backup";

export default function MigrationSettingsPage() {
  const router = useRouter();

  return (
    <RequireLogin>
      <RequireScopes scopes={["nut", "act", "sle", "wei"]}>
        <div className="mb-4">
          <Button
            onClick={() => {
              router.back();
            }}
          >
            Back
          </Button>
        </div>
        <MigrationBackup />
      </RequireScopes>
    </RequireLogin>
  );
}
