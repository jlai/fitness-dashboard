"use client";

import {
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
} from "@mui/material";
import {
  AccountCircleOutlined as AccountIcon,
  BuildOutlined as AdvancedIcon,
  DeveloperModeOutlined as DeveloperIcon,
  FlagOutlined as GoalsIcon,
  PublicOutlined as LocaleIcon,
  RestaurantOutlined as NutritionIcon,
} from "@mui/icons-material";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

import { DEV_MODE_ENABLED } from "@/config";

export interface SettingsNavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  match: (pathname: string) => boolean;
}

const BASE_NAV_ITEMS: ReadonlyArray<SettingsNavItem> = [
  {
    href: "/settings",
    label: "Account",
    icon: <AccountIcon />,
    match: (pathname: string) =>
      pathname === "/settings" || pathname === "/settings/",
  },
  {
    href: "/settings/locale",
    label: "Locale",
    icon: <LocaleIcon />,
    match: (pathname: string) => pathname.startsWith("/settings/locale"),
  },
  {
    href: "/settings/nutrition",
    label: "Nutrition",
    icon: <NutritionIcon />,
    match: (pathname: string) =>
      pathname.startsWith("/settings/nutrition") ||
      pathname.startsWith("/settings/foods") ||
      pathname.startsWith("/settings/meals"),
  },
  {
    href: "/settings/goals",
    label: "Goals",
    icon: <GoalsIcon />,
    match: (pathname: string) => pathname.startsWith("/settings/goals"),
  },
  {
    href: "/settings/advanced",
    label: "Advanced",
    icon: <AdvancedIcon />,
    match: (pathname: string) =>
      pathname.startsWith("/settings/advanced") ||
      pathname.startsWith("/settings/migration"),
  },
];

const DEVELOPER_NAV_ITEM: SettingsNavItem = {
  href: "/settings/developer",
  label: "Developer",
  icon: <DeveloperIcon />,
  match: (pathname: string) => pathname.startsWith("/settings/developer"),
};

export function getSettingsNavItems(
  devModeEnabled = DEV_MODE_ENABLED,
): ReadonlyArray<SettingsNavItem> {
  return devModeEnabled
    ? [...BASE_NAV_ITEMS, DEVELOPER_NAV_ITEM]
    : BASE_NAV_ITEMS;
}

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const navItems = getSettingsNavItems();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 md:flex-row md:items-start">
      <Paper className="w-full shrink-0 md:sticky md:top-4 md:w-56">
        <List component="nav" aria-label="settings sections" dense>
          {navItems.map((item) => (
            <ListItemButton
              key={item.href}
              component={Link}
              href={item.href}
              selected={item.match(pathname)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
      </Paper>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
