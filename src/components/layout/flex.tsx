import { Stack, Divider } from "@mui/material";

/** Display two panels side-by-side */
export function DividedStack({ children }: { children: React.ReactNode }) {
  return (
    <Stack
      direction="row"
      columnGap={4}
      flexWrap="wrap"
      divider={<Divider orientation="vertical" flexItem />}
    >
      {children}
    </Stack>
  );
}

export function FlexSpacer() {
  return <div className="flex-1"></div>;
}
