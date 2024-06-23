import { AppBar, Container, Typography, Chip, Link } from "@mui/material";
import { Poppins, Fira_Sans } from "next/font/google";
import React from "react";
import NextLink from "next/link";
import {
  Restaurant as FoodIcon,
  Dashboard as DashboardIcon,
  Info as AboutIcon,
  Timeline as HistoryIcon,
} from "@mui/icons-material";

export const poppins = Poppins({ weight: "400", subsets: ["latin"] });
export const firaSans = Fira_Sans({ weight: "400", subsets: ["latin"] });

import AccountMenu from "./account-menu";

function NavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      className="menu-link flex flex-col gap-x-2 items-center justify-items-center"
      component={NextLink}
      href={href}
      underline="none"
    >
      {icon && <div className="md:hidden">{icon}</div>}
      <div className="hidden md:inline">{children}</div>
    </Link>
  );
}

export default function Header() {
  return (
    <AppBar
      position="static"
      sx={{
        boxShadow: 0,
        bgcolor: "#fcfcff",
        paddingBlock: 2,
        marginBottom: 4,
      }}
    >
      <Container maxWidth="lg">
        <div className="flex flex-row items-center gap-x-1 text-gray-500">
          <Typography
            variant="h4"
            className="hidden md:flex flex-row flex-1 items-center"
          >
            <span className={poppins.className}>
              {process.env.NEXT_PUBLIC_WEBSITE_NAME ?? "Dashboard"}
            </span>
            <Chip
              label="Preview"
              color="warning"
              variant="filled"
              className="ml-4"
            />
          </Typography>
          <div className="flex flex-row flex-1 items-center md:gap-x-2 md:mx-4">
            <NavLink href="/dashboard" icon={<DashboardIcon />}>
              Dashboard
            </NavLink>
            <NavLink href="/nutrition" icon={<FoodIcon />}>
              Food
            </NavLink>
            <NavLink href="/history" icon={<HistoryIcon />}>
              History
            </NavLink>
          </div>
          <div className="flex flex-row items-center gap-x-2 md:mx-4">
            <NavLink href="/about" icon={<AboutIcon />}>
              About
            </NavLink>
            <AccountMenu />
          </div>
        </div>
      </Container>
    </AppBar>
  );
}
