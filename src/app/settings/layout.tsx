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
  FlagOutlined as GoalsIcon,
  PublicOutlined as LocaleIcon,
  RestaurantOutlined as NutritionIcon,
} from "@mui/icons-material";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

const NAV_ITEMS = [
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
] as const;

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 md:flex-row md:items-start">
      <Paper className="w-full shrink-0 md:sticky md:top-4 md:w-56">
        <List component="nav" aria-label="settings sections" dense>
          {NAV_ITEMS.map((item) => (
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
