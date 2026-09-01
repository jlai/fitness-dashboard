import Image from "next/image";
import {
  Button,
  FormControl,
  InputAdornment,
  OutlinedInput,
  Typography,
} from "@mui/material";
import { Suspense, useCallback } from "react";
import { useForm } from "react-hook-form";
import {
  useQueryClient,
  useMutation,
  useSuspenseQuery,
} from "@tanstack/react-query";
import dayjs from "dayjs";
import { toast } from "mui-sonner";
import { useAtomValue } from "jotai";

import { VolumeQuantityUserProvidedUnit } from "@generated/orval/fetch/google-health-api/models";

import { SettingsWaterUnit } from "@/api/user";
import { useUnits } from "@/config/units";
import {
  buildCreateWaterLogMutation,
  buildHydrationLogQuery,
} from "@/api/nutrition";
import { millilitersFromWaterGoal } from "@/config/units";
import { waterGoalAtom } from "@/storage/settings";

import NumericStat from "../numeric-stat";
import { DividedStack } from "../layout/flex";

import glassCupUrl from "./assets/water_full_24dp_FILL0_wght400_GRAD0_opsz24.svg";
import smallBottleUrl from "./assets/water_bottle_24dp_FILL0_wght400_GRAD0_opsz24.svg";
import largeBottleUrl from "./assets/water_bottle_large_24dp_FILL0_wght400_GRAD0_opsz24.svg";

function QuickWaterButton({
  icon,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  description: string;
  onClick: () => void;
}) {
  return (
    <Button onClick={onClick}>
      <div className="flex flex-col items-center gap-y-4">
        <div>{icon}</div>
        <div>{description}</div>
      </div>
    </Button>
  );
}

function ImperialWaterButtons({
  onAddQuantity,
}: {
  onAddQuantity: (quantity: number) => void;
}) {
  return (
    <>
      <QuickWaterButton
        onClick={() => onAddQuantity(8)}
        description="8 oz"
        icon={<Image width={64} height={64} src={glassCupUrl} alt="" />}
      />
      <QuickWaterButton
        onClick={() => onAddQuantity(16)}
        description="16 oz"
        icon={<Image width={64} height={64} src={smallBottleUrl} alt="" />}
      />
      <QuickWaterButton
        onClick={() => onAddQuantity(24)}
        description="24 oz"
        icon={<Image width={64} height={64} src={largeBottleUrl} alt="" />}
      />
    </>
  );
}

function MetricWaterButtons({
  onAddQuantity,
}: {
  onAddQuantity: (quantity: number) => void;
}) {
  return (
    <>
      <QuickWaterButton
        onClick={() => onAddQuantity(250)}
        description="250 ml"
        icon={<Image width={64} height={64} src={glassCupUrl} alt="" />}
      />
      <QuickWaterButton
        onClick={() => onAddQuantity(500)}
        description="500 ml"
        icon={<Image width={64} height={64} src={smallBottleUrl} alt="" />}
      />
      <QuickWaterButton
        onClick={() => onAddQuantity(750)}
        description="750 ml"
        icon={<Image width={64} height={64} src={largeBottleUrl} alt="" />}
      />
    </>
  );
}

function CupWaterButtons({
  onAddQuantity,
}: {
  onAddQuantity: (quantity: number) => void;
}) {
  return (
    <>
      <QuickWaterButton
        onClick={() => onAddQuantity(1)}
        description="1 cup"
        icon={<Image width={64} height={64} src={glassCupUrl} alt="" />}
      />
      <QuickWaterButton
        onClick={() => onAddQuantity(2)}
        description="2 cups"
        icon={<Image width={64} height={64} src={smallBottleUrl} alt="" />}
      />
      <QuickWaterButton
        onClick={() => onAddQuantity(3)}
        description="3 cups"
        icon={<Image width={64} height={64} src={largeBottleUrl} alt="" />}
      />
    </>
  );
}

interface WaterLoggingInput {
  quantity: number;
}

export default function WaterEntryPanel() {
  const day = dayjs(); // FIXME allow selecting date
  const { waterUnit, localizedWaterVolumeName } = useUnits();
  const { register, handleSubmit, formState, getValues, setValue } =
    useForm<WaterLoggingInput>();

  const userProvidedUnit =
    waterUnit === SettingsWaterUnit.WATER_UNIT_FL_OZ
      ? VolumeQuantityUserProvidedUnit.FLUID_OUNCE_US
      : waterUnit === SettingsWaterUnit.WATER_UNIT_CUP
        ? VolumeQuantityUserProvidedUnit.CUP_US
        : VolumeQuantityUserProvidedUnit.MILLILITER;

  const queryClient = useQueryClient();
  const { mutateAsync: createWaterLog } = useMutation(
    buildCreateWaterLogMutation(queryClient),
  );

  const addQuantity = useCallback(
    (quantity: number) => {
      const currentQuantity = getValues("quantity") || 0;
      setValue("quantity", currentQuantity + quantity, {
        shouldValidate: true,
      });
    },
    [setValue, getValues],
  );

  const onSubmit = useCallback(
    (data: WaterLoggingInput) => {
      createWaterLog({
        amount: data.quantity,
        unit: userProvidedUnit,
        day,
      }).then(
        () => {
          toast(`Logged ${data.quantity} ${localizedWaterVolumeName} water`);
        },
        () => {
          toast.error("Error logging water");
        },
      );
    },
    [createWaterLog, day, localizedWaterVolumeName, userProvidedUnit],
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <DividedStack>
        <div className="flex-1 space-y-8 flex flex-col items-center">
          <div className="flex flex-row gap-x-8">
            <FormControl>
              <OutlinedInput
                type="number"
                endAdornment={
                  <InputAdornment position="end">
                    {localizedWaterVolumeName}
                  </InputAdornment>
                }
                {...register("quantity", {
                  required: true,
                  min: 0,
                  valueAsNumber: true,
                })}
              />
            </FormControl>
            <Button type="submit" disabled={!formState.isValid}>
              Log Water
            </Button>
          </div>
          <div className="flex flex-row gap-x-8">
            {waterUnit === SettingsWaterUnit.WATER_UNIT_FL_OZ ? (
              <ImperialWaterButtons onAddQuantity={addQuantity} />
            ) : waterUnit === SettingsWaterUnit.WATER_UNIT_CUP ? (
              <CupWaterButtons onAddQuantity={addQuantity} />
            ) : (
              <MetricWaterButtons onAddQuantity={addQuantity} />
            )}
          </div>
        </div>
        <div className="flex-1 self-center justify-self-center">
          <Suspense>
            <WaterToday />
          </Suspense>
        </div>
      </DividedStack>
    </form>
  );
}

function WaterToday() {
  const day = dayjs();
  const units = useUnits();
  const waterGoal = useAtomValue(waterGoalAtom);

  const { data: hydrationLog } = useSuspenseQuery(buildHydrationLogQuery(day));

  const waterConsumedMl = (hydrationLog.dataPoints ?? []).reduce(
    (sum, dataPoint) =>
      sum + (dataPoint.hydrationLog?.amountConsumed?.milliliters ?? 0),
    0,
  );

  const { localizedWaterVolumeName, localizedWaterVolume } = units;

  const waterConsumed = localizedWaterVolume(waterConsumedMl);
  const waterGoalMl = millilitersFromWaterGoal(waterGoal.value, waterGoal.unit);
  const waterGoalNumber = localizedWaterVolume(waterGoalMl);

  return (
    <div className="flex flex-col items-center">
      <Typography variant="h5">Today</Typography>
      <div className="flex flex-row items-center gap-x-2">
        <NumericStat value={waterConsumed} unit={localizedWaterVolumeName} />{" "}
        <Typography variant="body1" className="text-2xl">
          /
        </Typography>
        <NumericStat value={waterGoalNumber} unit={localizedWaterVolumeName} />
      </div>
    </div>
  );
}
