"use client";

import { useAtom } from "jotai";
import { Button } from "@mui/material";
import { AppRegistration } from "@mui/icons-material";
import { useCallback } from "react";

import DayNavigator from "@/components/day-navigator";

import { selectedDayAtom, editingGridAtom } from "./state";

export default function GridControlBar() {
  const [selectedDay, setSelectedDay] = useAtom(selectedDayAtom);
  const [editingGrid, setEditingGrid] = useAtom(editingGridAtom);

  const toggleEditingGrid = useCallback(() => {
    setEditingGrid(!editingGrid);
  }, [editingGrid, setEditingGrid]);

  return (
    <div className="flex flex-row items-center">
      <DayNavigator
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
        disableFuture
      />
      <div className="flex-grow"></div>
      <div>
        <Button
          color="inherit"
          variant="text"
          startIcon={<AppRegistration />}
          onClick={toggleEditingGrid}
        >
          {editingGrid ? "Done editing" : "Edit grid"}
        </Button>
      </div>
    </div>
  );
}
