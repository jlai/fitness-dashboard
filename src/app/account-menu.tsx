"use client";

import {
  AccountCircle as AccountIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from "@mui/material";
import Link from "next/link";
import {
  usePopupState,
  bindTrigger,
  bindMenu,
} from "material-ui-popup-state/hooks";
import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { logout, useLoggedIn } from "@/api/auth";

export default function AccountMenu() {
  const loggedIn = useLoggedIn();
  const popupState = usePopupState({
    variant: "popover",
    popupId: "account-popup-menu",
  });
  const queryClient = useQueryClient();

  const clickedLogout = useCallback(() => {
    logout();
    popupState.close();
  }, [popupState]);

  const clickedRefrseh = useCallback(() => {
    queryClient.invalidateQueries();
    popupState.close();
  }, [popupState, queryClient]);

  return (
    <>
      <IconButton {...bindTrigger(popupState)}>
        <AccountIcon />
      </IconButton>
      <Menu {...bindMenu(popupState)}>
        <MenuItem onClick={popupState.close}>
          <Link href="/settings" className="flex flex-row">
            <ListItemIcon>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText>Settings</ListItemText>
          </Link>
        </MenuItem>
        <MenuItem onClick={clickedRefrseh}>
          <ListItemIcon>
            <RefreshIcon />
          </ListItemIcon>
          <ListItemText>Refresh data</ListItemText>
        </MenuItem>
        {loggedIn && <Divider />}
        {loggedIn && (
          <MenuItem onClick={clickedLogout}>
            <ListItemIcon>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText>Logout</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </>
  );
}
