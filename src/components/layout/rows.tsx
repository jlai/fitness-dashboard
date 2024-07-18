import { Stack, StackProps } from "@mui/material";

export function HeaderBar({
  children,
  ...stackProps
}: { children: React.ReactNode } & StackProps) {
  return (
    <Stack
      direction="row"
      marginInline={4}
      marginBlock={2}
      alignItems="center"
      columnGap={2}
      {...stackProps}
    >
      {children}
    </Stack>
  );
}

export function FooterActionBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="flow-root">
      <Stack
        direction="row"
        marginInline={4}
        marginBlock={2}
        alignItems="center"
        columnGap={2}
      >
        {children}
      </Stack>
    </div>
  );
}
