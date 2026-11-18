"use client";

import { SyntheticEvent, useCallback, useState, Suspense } from "react";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import {
  Box,
  IconButton,
  ListItemText,
  Menu,
  MenuItem,
  Tab,
} from "@mui/material";
import { Settings as SettingsIcon } from "@mui/icons-material";
import NextLink from "next/link";
import {
  bindMenu,
  bindTrigger,
  usePopupState,
} from "material-ui-popup-state/hooks";
import {
  BakeryDining as FoodIcon,
  MenuBook as MealIcon,
  WaterDrop as WaterIcon,
} from "@mui/icons-material";

import CreateFoodLog from "./food/create-food-log";
import CreateWaterLog from "./water-entry-panel";
import CreateMealLog from "./meal/create-meal-log";

export default function NutritionLogger() {
  const [currentTab, setCurrentTab] = useState<"food" | "meal">("food");
  const settingsMenu = usePopupState({
    variant: "popover",
    popupId: "nutrition-logger-settings-menu",
  });
  const changeTab = useCallback(
    (event: SyntheticEvent, newIndex: "food" | "meal") => {
      setCurrentTab(newIndex);
    },
    [],
  );

  return (
    <TabContext value={currentTab}>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Box className="flex items-center">
          <TabList
            onChange={changeTab}
            aria-label="food or meal switcher"
            className="flex-1"
          >
            <Tab
              label="Food"
              icon={<FoodIcon />}
              iconPosition="start"
              value="food"
            />
            <Tab
              label="Meal"
              icon={<MealIcon />}
              iconPosition="start"
              value="meal"
            />
            <Tab
              label="Water"
              icon={<WaterIcon />}
              iconPosition="start"
              value="water"
            />
          </TabList>
          <IconButton
            aria-label="nutrition settings and management"
            sx={{ mr: 1 }}
            {...bindTrigger(settingsMenu)}
          >
            <SettingsIcon />
          </IconButton>
          <Menu {...bindMenu(settingsMenu)}>
            <MenuItem component={NextLink} href="/settings/foods/favorite">
              <ListItemText>Edit favorites</ListItemText>
            </MenuItem>
            <MenuItem component={NextLink} href="/settings/foods/custom">
              <ListItemText>Edit food templates</ListItemText>
            </MenuItem>
            <MenuItem component={NextLink} href="/settings/meals">
              <ListItemText>Edit meals</ListItemText>
            </MenuItem>
            <MenuItem component={NextLink} href="/settings/nutrition">
              <ListItemText>Edit nutrition settings</ListItemText>
            </MenuItem>
          </Menu>
        </Box>
      </Box>
      <TabPanel value="food">
        <Suspense>
          <CreateFoodLog />
        </Suspense>
      </TabPanel>
      <TabPanel value="meal">
        <Suspense>
          <CreateMealLog />
        </Suspense>
      </TabPanel>
      <TabPanel value="water">
        <Suspense>
          <CreateWaterLog />
        </Suspense>
      </TabPanel>
    </TabContext>
  );
}
