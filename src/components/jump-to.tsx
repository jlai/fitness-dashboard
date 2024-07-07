import { Button, Popover } from "@mui/material";
import { DateCalendar } from "@mui/x-date-pickers";
import { PickerSelectionState } from "@mui/x-date-pickers/internals";
import { Dayjs } from "dayjs";
import { bindPopover, usePopupState } from "material-ui-popup-state/hooks";
import { useCallback } from "react";

export default function JumpTo({
  onPickDay,
}: {
  onPickDay: (value: Dayjs | null) => void;
}) {
  const popupState = usePopupState({ variant: "popover", popupId: "jump-to" });

  const pickDay = useCallback(
    (value: Dayjs | null, selectionState: PickerSelectionState | undefined) => {
      if (selectionState === "finish") {
        onPickDay(value);
        popupState.close();
      }
    },
    [onPickDay, popupState]
  );

  return (
    <>
      <Button onClick={popupState.open}>Jump to...</Button>
      <Popover {...bindPopover(popupState)}>
        <DateCalendar
          disableFuture
          openTo="month"
          views={["year", "month", "day"]}
          onChange={pickDay}
        />
      </Popover>
    </>
  );
}
