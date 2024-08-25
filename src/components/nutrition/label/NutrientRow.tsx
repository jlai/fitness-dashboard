import {styled, Box, Typography} from "@mui/material"

import SeparatorBar from './SeparatorBar'

type RowContainerProps = {
  indent?: string;
}

const RowContainer = styled(Box)<RowContainerProps>(({ indent }) => ({
  marginTop: 0,
  marginLeft: indent || 0,
  padding: 0
}));


const TextContainer = styled(Box)(() => ({
  lineHeight: "0.667rem",
  paddingBottom: "3px"
}));

const PercentDailyValueText = styled(Typography)(() => ({
  lineHeight: "0.583rem",
  fontSize: "0.667rem",
  fontWeight: 100,
  textAlign: "right",
  margin: "3px 0 7px",
  float: "right"
}));

type NutrientTextProps = {
  isBold?: boolean;
}

const NutrientText = styled(Typography)<NutrientTextProps>(({ isBold }) => ({
  fontWeight: isBold ? 700 : 100,
  fontFamily: "Helvetica",
  fontSize: "0.667rem",
  marginLeft: "3px",
  padding: 0,
  display: "inline"
}));

const NutrientRowSeparatorBarHeight = '0.02rem';

function NutrientRow({ label, value, hideBar, color, boldLabel, indent, unit, recommended }: {
  label: string;
  value: number;
  hideBar?: boolean;
  recommended?: number;
  color?: string;
  boldLabel?: boolean;
  indent?: string;
  unit: string;
}) {
  return (
    <RowContainer indent={indent}>
      {hideBar ? null : <SeparatorBar
        height={NutrientRowSeparatorBarHeight}
        color={color}
      />}
      <TextContainer>
        <NutrientText isBold={boldLabel}>
          {label}
        </NutrientText>
        <NutrientText>
          {value} {unit}
        </NutrientText>
        {(recommended && value > 0) && (
            <PercentDailyValueText>
              {(value * 100 / recommended).toFixed(2)}%
            </PercentDailyValueText>
        )}
      </TextContainer>

    </RowContainer>
  )
}

export default NutrientRow;