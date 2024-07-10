import { Stack, StackProps } from "@mui/material";

export function FormRows({
  children,
  ...stackProps
}: {
  children: React.ReactNode;
} & StackProps) {
  return (
    <Stack direction="column" rowGap={4} {...stackProps}>
      {children}
    </Stack>
  );
}

export function FormRow({
  children,
  ...stackProps
}: {
  children: React.ReactNode;
} & StackProps) {
  return (
    <Stack
      direction="row"
      rowGap={2}
      columnGap={4}
      alignItems="center"
      flexWrap="wrap"
      {...stackProps}
    >
      {children}
    </Stack>
  );
}
