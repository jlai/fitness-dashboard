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
import { find } from "es-toolkit/compat";

import { formatAsDate } from "@/api/datetime";
import { FormRow, FormRows } from "@/components/forms/form-row";

import { useSelectedDay } from "../state";

import { useDailySummary } from "./common";
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

export default function PlantTileContent() {
  const day = useSelectedDay();
  const dailySummary = useDailySummary();
  const [settings] = useTileSettings<PlantSettings>(DEFAULT_SETTINGS);

  let progress: number;
  let text: string;

  switch (settings.goal) {
    case "steps":
      {
        const totalSteps = dailySummary.summary.steps;
        const goalSteps = dailySummary.goals?.steps ?? 10000;
        progress = Math.min(1.0, totalSteps / goalSteps);
        text = "Meet your step goal to grow";
      }
      break;
    case "calories-out":
      {
        const total = dailySummary.summary.caloriesOut;
        const goal = dailySummary.goals?.caloriesOut ?? 0;
        progress = Math.min(1.0, total / goal);
        text = "Burn calories to grow";
      }
      break;
    case "active-minutes":
      {
        const { fairlyActiveMinutes, veryActiveMinutes } = dailySummary.summary;
        const total = fairlyActiveMinutes + veryActiveMinutes;
        const goal = dailySummary.goals?.activeMinutes ?? 0;
        progress = Math.min(1.0, total / goal);
        text = "Be active to grow";
      }
      break;
    case "distance":
      {
        const total =
          find(dailySummary.summary.distances, { activity: "total" })
            ?.distance ?? 0;
        const goal = dailySummary.goals?.distance ?? 0;
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
