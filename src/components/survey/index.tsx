"use client";

import { Poll } from "@mui/icons-material";
import { Typography, Popover, Button, Stack } from "@mui/material";
import dayjs from "dayjs";
import isBetweenPlugin from "dayjs/plugin/isBetween";
import { useAtom } from "jotai";
import {
  bindPopover,
  bindTrigger,
  usePopupState,
} from "material-ui-popup-state/hooks";

import { lastSurveyDateAtom } from "@/storage/analytics";
import { SURVEY_DATE_RANGE, SURVEY_LINK } from "@/config";
import { formatAsDate } from "@/api/datetime";

dayjs.extend(isBetweenPlugin);

function NavButton({
  onClick,
  children,
}: {
  onClick: (event: React.MouseEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="menu-link flex flex-row gap-x-2 items-center justify-items-center"
    >
      <Poll className="text-blue-500" />
      <div className="hidden md:inline font-medium">{children}</div>
    </button>
  );
}

export function SurveyButton() {
  const [lastSurveyDate, setLastSurveyDate] = useAtom(lastSurveyDateAtom);

  const popupState = usePopupState({
    variant: "popover",
    popupId: "survey-popup",
  });

  const today = dayjs();
  const lastSurveyDay = dayjs(lastSurveyDate ?? "1990-01-01");

  const showSurvey =
    SURVEY_DATE_RANGE &&
    today.isBetween(SURVEY_DATE_RANGE[0], SURVEY_DATE_RANGE[1]) &&
    !lastSurveyDay.isBetween(SURVEY_DATE_RANGE[0], SURVEY_DATE_RANGE[1]);

  if (!SURVEY_LINK || !showSurvey) {
    return null;
  }

  const handleDismissSurvey = () => {
    popupState.close();
    setLastSurveyDate(formatAsDate(today));
  };

  const handleOpenSurvey = () => {
    popupState.close();
    setLastSurveyDate(formatAsDate(today));
  };

  return (
    <>
      <NavButton {...bindTrigger(popupState)}>Survey</NavButton>
      <Popover
        {...bindPopover(popupState)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: -10, horizontal: "center" }}
        slotProps={{ paper: { sx: { borderRadius: 8 } } }}
      >
        <Stack direction="column" margin="24px" alignItems="center" rowGap={2}>
          <Typography variant="h6">Monthly survey</Typography>
          <Typography variant="body2" className="text-center">
            We want to hear from you! Let us know what you think.
          </Typography>
          <Stack direction="row" columnGap={2}>
            <Button color="warning" onClick={handleDismissSurvey}>
              No thanks
            </Button>{" "}
            <Button
              href={SURVEY_LINK}
              target="_blank"
              rel="noreferrer noopener"
              onClick={handleOpenSurvey}
            >
              Open survey
            </Button>
          </Stack>
        </Stack>
      </Popover>
    </>
  );
}
