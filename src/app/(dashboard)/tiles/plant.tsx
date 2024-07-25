import { useEffect, useMemo, useRef } from "react";
import { SvgPlant, Genera } from "svg-plant";
import {
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import {
  FormContainer,
  SelectElement,
  ToggleButtonGroupElement,
} from "react-hook-form-mui";
import dayjs from "dayjs";

import { formatAsDate } from "@/api/datetime";
import { FormRow, FormRows } from "@/components/forms/form-row";

import { useSelectedDay } from "../state";

import { useDailySummary } from "./common";
import { RenderDialogContentProps, TileWithDialog } from "./tile-with-dialog";
import { useTileSettings } from "./tile";

type GenusID = keyof typeof Genera;

function SvgPlantWrapper({
  genusId,
  age,
  seed,
}: {
  genusId: GenusID;
  age: number;
  seed: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const plantSvg = useMemo(() => {
    const genus = new Genera[genusId](seed);

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
  goal: "steps" | "calories-out";
  genus: GenusID;
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
    case "calories-out": {
      const total = dailySummary.summary.caloriesOut;
      const goal = dailySummary.goals?.caloriesOut ?? 0;
      progress = Math.min(1.0, total / goal);
      text = "Burn calories to grow";
    }
  }

  return (
    <TileWithDialog
      dialogProps={{ sx: { minWidth: "300px" } }}
      renderDialogContent={PlantDialogContent}
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
    <div className="overflow-hidden w-[100px] h-[100px]">
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
];

const GENUS_OPTIONS = [
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
