import dayjs from "dayjs";
import { useAtomValue } from "jotai";
import { ToggleButtonGroupElement } from "react-hook-form-mui";
import { Link as LinkIcon } from "@mui/icons-material";

import { selectedDayForPageAtom } from "@/state";
import { formatShortDate } from "@/utils/date-formats";

export type DaySelectorSource = "today" | "linked";

export default function LinkedDayElement({ name }: { name: string }) {
  const today = dayjs();
  const linkedDay = useAtomValue(selectedDayForPageAtom);

  const options = [
    {
      id: "today",
      label: "Today",
    },
    {
      id: "linked",
      label: (
        <div className="flex flex-row items-center gap-x-2">
          <LinkIcon />
          <div>{formatShortDate(linkedDay)}</div>
        </div>
      ),
      disabled: today.isSame(linkedDay, "day"),
    },
  ];

  return <ToggleButtonGroupElement name={name} exclusive options={options} />;
}
