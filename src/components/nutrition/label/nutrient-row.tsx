import { styled, Box, Typography } from "@mui/material";

import { formatValue } from "@/utils/food-amounts";

import SeparatorBar from "./separator-bar";

type RowContainerProps = {
  indent?: string;
};

const RowContainer = styled(Box)<RowContainerProps>(({ indent }) => ({
  marginLeft: indent || 0,
  marginTop: 0,
  padding: 0,
}));

const TextContainer = styled(Box)(() => ({
  lineHeight: "0.667rem",
  paddingBottom: "3px",
}));

const PercentDailyValueText = styled(Typography)(() => ({
  lineHeight: "0.583rem",
  fontSize: "0.667rem",
  margin: "5px 0 0 auto",
}));

const NutrientText = styled(Typography)(() => ({
  fontFamily: "Helvetica",
  fontSize: "0.667rem",
  marginLeft: "3px",
}));

const NutrientRowSeparatorBarHeight = "0.02rem";

function NutrientRow({
  label,
  value,
  hideBar,
  color,
  boldLabel,
  indent,
  unit,
  recommended,
  digits,
}: {
  label: string;
  value: number;
  hideBar?: boolean;
  recommended?: number;
  color?: string;
  boldLabel?: boolean;
  indent?: string;
  digits?: number;
  unit: string;
}) {
  return (
    <RowContainer indent={indent}>
      {hideBar ? null : (
        <SeparatorBar height={NutrientRowSeparatorBarHeight} color={color} />
      )}
      <TextContainer className="flex flex-row">
        <NutrientText
          className={`${boldLabel ? "font-extrabold" : "font-normal"}`}
        >
          {label}
        </NutrientText>
        <NutrientText>
          {formatValue(value, digits)} {unit}
        </NutrientText>
        <PercentDailyValueText className="text-right">
          {recommended && recommended > 0 && value > 0
            ? `${formatValue((value * 100) / recommended, digits)}%`
            : "-"}
        </PercentDailyValueText>
      </TextContainer>
    </RowContainer>
  );
}

export default NutrientRow;
