import { useEffect, useMemo, useRef } from "react";
import { SvgPlant, Genera } from "svg-plant";
import {
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import {
  FormContainer,
  SelectElement,
  ToggleButtonGroupElement,
} from "react-hook-form-mui";
import dayjs from "dayjs";
import { CasinoOutlined } from "@mui/icons-material";
import { Chance } from "chance";
import { useAtomValue } from "jotai";

import { formatAsDate } from "@/api/datetime";
import {
  ActiveMinutesTimeSeriesValue,
  TimeSeriesResource,
} from "@/api/times-series";
import {
  activeMinutesGoalAtom,
  caloriesOutGoalAtom,
  distanceGoalAtom,
  stepsGoalAtom,
} from "@/storage/settings";
import { kilometersFromDistanceGoal } from "@/config/units";
import { FormRow, FormRows } from "@/components/forms/form-row";

import { useSelectedDay } from "../state";

import { useSelectedDayTimeSeries } from "./common";
import { RenderDialogContentProps, TileWithDialog } from "./tile-with-dialog";
import { useTileSettings } from "./tile";

type GenusID = keyof typeof Genera;
const GENUSES = Object.keys(Genera);

function SvgPlantWrapper({
  genusId,
  age,
  seed,
}: {
  genusId: GenusID | "random";
  age: number;
  seed: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const plantSvg = useMemo(() => {
    let genus;

    if (genusId === "random") {
      const randomGenusId = Chance(seed).pickone(GENUSES) as GenusID;
      genus = new Genera[randomGenusId](seed);
    } else {
      genus = new Genera[genusId](seed);
    }

    const plant = new SvgPlant(genus, {
      color: true,
      age,
    });

    return plant;
  }, [age, seed, genusId]);

  useEffect(() => {
    ref.current?.replaceChildren(plantSvg.svgElement);
  });

  return <div ref={ref} className="[&>svg]:mx-auto [&>svg]:max-h-full"></div>;
}

interface PlantSettings {
  goal: "steps" | "distance" | "calories-out" | "active-minutes";
  genus: GenusID | "random";
}

const DEFAULT_SETTINGS: PlantSettings = { goal: "steps", genus: "BushyPlant" };

const PLANT_GOAL_RESOURCE: Record<PlantSettings["goal"], TimeSeriesResource> = {
  steps: "steps",
  "calories-out": "calories",
  "active-minutes": "active-minutes",
  distance: "distance",
};

export default function PlantTileContent() {
  const day = useSelectedDay();
  const stepsGoal = useAtomValue(stepsGoalAtom);
  const caloriesOutGoal = useAtomValue(caloriesOutGoalAtom);
  const activeMinutesGoal = useAtomValue(activeMinutesGoalAtom);
  const distanceGoal = useAtomValue(distanceGoalAtom);
  const [settings] = useTileSettings<PlantSettings>(DEFAULT_SETTINGS);
  const dayValue = useSelectedDayTimeSeries<
    string | ActiveMinutesTimeSeriesValue
  >(PLANT_GOAL_RESOURCE[settings.goal]);

  let progress: number;
  let text: string;

  switch (settings.goal) {
    case "steps":
      {
        const totalSteps = Number(dayValue ?? 0);
        const goalSteps = stepsGoal;
        progress = Math.min(1.0, totalSteps / goalSteps);
        text = "Meet your step goal to grow";
      }
      break;
    case "calories-out":
      {
        const total = Number(dayValue ?? 0);
        const goal = caloriesOutGoal;
        progress = Math.min(1.0, total / goal);
        text = "Burn calories to grow";
      }
      break;
    case "active-minutes":
      {
        const total =
          (dayValue as ActiveMinutesTimeSeriesValue | undefined)
            ?.activeMinutes ?? 0;
        const goal = activeMinutesGoal;
        progress = Math.min(1.0, total / goal);
        text = "Be active to grow";
      }
      break;
    case "distance":
      {
        const total = Number(dayValue ?? 0);
        const goal = kilometersFromDistanceGoal(
          distanceGoal.value,
          distanceGoal.unit,
        );
        progress = Math.min(1.0, total / goal);
        text = "Go the distance to grow";
      }
      break;
  }

  return (
    <TileWithDialog
      dialogProps={{ maxWidth: "lg" }}
      dialogComponent={PlantDialogContent}
    >
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex-1 min-h-0 text-center align-middle">
          {progress < 0.7 && (
            <Typography variant="subtitle1" component="div" className="m-8">
              {text}
            </Typography>
          )}
        </div>
        <div>
          <SvgPlantWrapper
            genusId={settings.genus}
            age={progress}
            seed={formatAsDate(day)}
          />
        </div>
      </div>
    </TileWithDialog>
  );
}

function GenusPreview({ genusId }: { genusId: GenusID }) {
  const today = dayjs();

  return (
    <div className="overflow-hidden size-[50px] md:size-[100px]">
      <SvgPlantWrapper genusId={genusId} age={0.7} seed={formatAsDate(today)} />
    </div>
  );
}

const PLANT_GOAL_OPTIONS = [
  {
    id: "steps",
    label: "Steps",
  },
  {
    id: "calories-out",
    label: "Calories burned",
  },
  {
    id: "active-minutes",
    label: "Active minutes",
  },
  {
    id: "distance",
    label: "Distance",
  },
];

const GENUS_OPTIONS = [
  {
    id: "random",
    label: (
      <Stack
        direction="column"
        alignItems="center"
        justifyContent="center"
        gap={1}
        marginInline={2}
      >
        <CasinoOutlined fontSize="large" />
        Random
      </Stack>
    ),
  },
  {
    id: "BushyPlant",
    label: <GenusPreview genusId="BushyPlant" />,
  },
  {
    id: "DragonTree",
    label: <GenusPreview genusId="DragonTree" />,
  },
  {
    id: "Zamia",
    label: <GenusPreview genusId="Zamia" />,
  },
  {
    id: "Pilea",
    label: <GenusPreview genusId="Pilea" />,
  },
];

function PlantDialogContent(props: RenderDialogContentProps) {
  const [settings, saveSettings] =
    useTileSettings<PlantSettings>(DEFAULT_SETTINGS);

  const handleSubmit = (values: PlantSettings) => {
    saveSettings(values);
    props.close();
  };

  return (
    <FormContainer defaultValues={settings} onSuccess={handleSubmit}>
      <DialogTitle>Plant</DialogTitle>
      <DialogContent>
        <Typography>
          Powered by{" "}
          <a
            href="https://github.com/days-later/svg-plant"
            target="_blank"
            className="underline"
            rel="noopener noreferrer"
          >
            svg-plant
          </a>
        </Typography>
        <FormRows mt={4}>
          <FormRow>
            <SelectElement
              name="goal"
              label="Goal"
              options={PLANT_GOAL_OPTIONS}
              fullWidth
            />
          </FormRow>
          <FormRow className="overflow-x-auto">
            <ToggleButtonGroupElement
              exclusive
              enforceAtLeastOneSelected
              name="genus"
              label="Genus"
              options={GENUS_OPTIONS}
              fullWidth
            />
          </FormRow>
        </FormRows>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.close}>Cancel</Button>
        <Button type="submit">Save</Button>
      </DialogActions>
    </FormContainer>
  );
}
