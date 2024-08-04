import { Autocomplete, TextField, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { FieldError, useController, UseControllerProps } from "react-hook-form";

import { buildActivityTypesQuery } from "@/api/activity/activity-types";
import { commonActivityTypes } from "@/config/common-ids";

export interface ActivityTypeOption {
  id: number;
  name: string;
  group: string;
  requiresDistance?: boolean;
}

export function ActivityTypeInput({
  value,
  onChange,
  error,
}: {
  value: ActivityTypeOption | null;
  onChange: (value: ActivityTypeOption | null) => void;
  error?: FieldError;
}) {
  const { data: categorizedActivityTypes } = useQuery(
    buildActivityTypesQuery()
  );

  const options = useMemo(() => {
    const options: Array<ActivityTypeOption> = [];
    const alreadyAddedTypes = new Set<number>();

    // Add common activities at top
    for (const activityType of commonActivityTypes) {
      options.push({
        id: activityType.id,
        name: activityType.name,
        requiresDistance: activityType.hasSpeed,
        group: "Common",
      });

      alreadyAddedTypes.add(activityType.id);
    }

    for (const category of categorizedActivityTypes?.categories ?? []) {
      for (const activityType of category.activities) {
        if (!alreadyAddedTypes.has(activityType.id)) {
          options.push({
            id: activityType.id,
            name: activityType.name,
            requiresDistance: activityType.hasSpeed,
            group: "All",
          });
        }

        // track duplicates
        alreadyAddedTypes.add(activityType.id);
      }
    }

    return options;
  }, [categorizedActivityTypes]);

  return (
    <Autocomplete
      value={value}
      onChange={(event, value) => onChange(value)}
      disabled={!options}
      options={options ?? []}
      groupBy={(option) => option.group}
      getOptionLabel={(option) => option.name}
      getOptionKey={(option) => option.id}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      renderInput={(props) => (
        <TextField
          label="Activity"
          error={!!error}
          helperText={error?.message}
          {...props}
        />
      )}
      renderGroup={(params) => (
        <li key={params.key}>
          <Typography variant="subtitle1" padding={1} className="font-semibold">
            {params.group}
          </Typography>
          <div>{params.children}</div>
        </li>
      )}
    />
  );
}

export function ActivityTypeElement({
  name,
  rules,
}: {
  name: string;
  rules?: UseControllerProps["rules"];
}) {
  const { field, fieldState } = useController({
    name,
    rules,
  });

  return (
    <ActivityTypeInput
      value={field.value}
      onChange={field.onChange}
      error={fieldState.error}
    />
  );
}
