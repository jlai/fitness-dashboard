"use client";

import { useAtom } from "jotai";
import { Button, Stack } from "@mui/material";
import { AppRegistration } from "@mui/icons-material";
import { useCallback } from "react";

import DayNavigator from "@/components/day-navigator";
import { HeaderBar } from "@/components/layout/rows";

import { selectedDayAtom, editingGridAtom } from "./state";
import AddTileButton from "./add-tile";

export default function GridControlBar() {
  const [selectedDay, setSelectedDay] = useAtom(selectedDayAtom);
  const [editingGrid, setEditingGrid] = useAtom(editingGridAtom);

  const toggleEditingGrid = useCallback(() => {
    setEditingGrid(!editingGrid);
  }, [editingGrid, setEditingGrid]);

  return (
    <HeaderBar>
      <DayNavigator
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
        disableFuture
      />
      <div className="flex-grow"></div>
      <Stack direction="row" alignItems="center" columnGap={4}>
        {editingGrid && <AddTileButton />}
        <Button
          color="inherit"
          variant="text"
          startIcon={<AppRegistration />}
          onClick={toggleEditingGrid}
        >
          {editingGrid ? "Done editing" : "Edit grid"}
        </Button>
      </Stack>
    </HeaderBar>
  );
}
