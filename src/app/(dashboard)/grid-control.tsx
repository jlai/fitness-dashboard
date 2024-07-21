"use client";

import { useAtom } from "jotai";
import { Button, Stack } from "@mui/material";
import { AppRegistration } from "@mui/icons-material";

import DayNavigator from "@/components/day-navigator";
import { HeaderBar } from "@/components/layout/rows";
import { FlexSpacer } from "@/components/layout/flex";

import { selectedDayAtom, editingGridAtom } from "./state";
import AddTileButton from "./add-tile";

export default function GridControlBar() {
  const [selectedDay, setSelectedDay] = useAtom(selectedDayAtom);
  const [editingGrid, setEditingGrid] = useAtom(editingGridAtom);

  return (
    <HeaderBar>
      <DayNavigator
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
        disableFuture
      />
      <FlexSpacer />
      <Stack direction="row" alignItems="center" columnGap={4}>
        {editingGrid && <AddTileButton />}
        <Button
          color="inherit"
          variant="text"
          startIcon={<AppRegistration />}
          onClick={() => setEditingGrid(!editingGrid)}
        >
          {editingGrid ? "Done editing" : "Edit grid"}
        </Button>
      </Stack>
    </HeaderBar>
  );
}
