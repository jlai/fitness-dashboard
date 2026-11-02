"use client";

import {
  AccountCircle as AccountIcon,
  Refresh as RefreshIcon,
  NewReleases as NewsIcon,
} from "@mui/icons-material";
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import Link from "next/link";
import {
  usePopupState,
  bindTrigger,
  bindMenu,
} from "material-ui-popup-state/hooks";
import { useQueryClient } from "@tanstack/react-query";

import { WHATS_NEW_LINK } from "@/config";

export default function AccountMenu() {
  const popupState = usePopupState({
    variant: "popover",
    popupId: "account-popup-menu",
  });
  const queryClient = useQueryClient();

  const handleRefreshClicked = () => {
    queryClient.invalidateQueries();
    popupState.close();
  };

  return (
    <>
      <IconButton {...bindTrigger(popupState)} aria-label="open account menu">
        <AccountIcon />
      </IconButton>
      <Menu {...bindMenu(popupState)}>
        {WHATS_NEW_LINK && (
          <MenuItem onClick={popupState.close}>
            <Link
              href={WHATS_NEW_LINK}
              target="_blank"
              className="flex flex-row"
            >
              <ListItemIcon>
                <NewsIcon />
              </ListItemIcon>
              <ListItemText>What&apos;s new</ListItemText>
            </Link>
          </MenuItem>
        )}
        <MenuItem onClick={handleRefreshClicked}>
          <ListItemIcon>
            <RefreshIcon />
          </ListItemIcon>
          <ListItemText>Refresh data</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
