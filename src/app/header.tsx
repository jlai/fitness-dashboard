import { AppBar, Container, Chip, Link } from "@mui/material";
import { Poppins } from "next/font/google";
import React from "react";
import NextLink from "next/link";
import {
  Restaurant as FoodIcon,
  Dashboard as DashboardIcon,
  Info as AboutIcon,
  Timeline as HistoryIcon,
} from "@mui/icons-material";

export const poppins = Poppins({ weight: "400", subsets: ["latin"] });

import { HOST_WEBSITE_LINK, HOST_WEBSITE_NAME, WEBSITE_NAME } from "@/config";
import { SurveyButton } from "@/components/survey";

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

function SiteBranding({ className = "" }: { className: string }) {
  return (
    <div
      className={`hidden md:flex flex-row items-center text-gray-500 dark:text-inherit ${className}`}
    >
      <div>
        <div className={`${poppins.className} text-3xl`}>{WEBSITE_NAME}</div>
        <div className={`${poppins.className} text-sm text-end`}>
          hosted by{" "}
          {HOST_WEBSITE_LINK ? (
            <a href={HOST_WEBSITE_LINK} target="_blank" className="underline">
              {HOST_WEBSITE_NAME}
            </a>
          ) : (
            HOST_WEBSITE_NAME
          )}
        </div>
      </div>
      <Chip label="Preview" color="warning" variant="filled" className="ml-4" />
    </div>
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
      }}
      className="mb-2 sm:mb-6 bg-[#fcfcff] dark:bg-inherit"
    >
      <Container maxWidth="lg">
        <div className="flex flex-row items-center gap-x-2 text-gray-500 dark:text-inherit">
          <SiteBranding className="flex-1" />
          <div className="flex flex-row flex-1 items-center md:gap-x-2 md:mx-4">
            <NavLink href="/" icon={<DashboardIcon />}>
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
            <SurveyButton />
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
