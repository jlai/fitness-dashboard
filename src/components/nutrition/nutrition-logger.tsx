"use client";

import { SyntheticEvent, useCallback, useState, Suspense } from "react";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import { Box, Tab } from "@mui/material";
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
  const changeTab = useCallback(
    (event: SyntheticEvent, newIndex: "food" | "meal") => {
      setCurrentTab(newIndex);
    },
    []
  );

  return (
    <TabContext value={currentTab}>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <TabList onChange={changeTab} aria-label="food or meal switcher">
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
