import {styled, Box, Typography} from "@mui/material"

import SeparatorBar from './SeparatorBar'

type RowContainerProps = {
  indent?: string;
}

const RowContainer = styled(Box)<RowContainerProps>(({ indent }) => ({
  marginTop: 0,
  marginLeft: indent || '0pt',
  padding: 0
}));


const TextContainer = styled(Box)(() => ({
  lineHeight: "8pt",
  paddingBottom: "2pt"
}));

const PercentDailyValueText = styled(Typography)(() => ({
  lineHeight: "7pt",
  fontSize: "8pt",
  fontWeight: 100,
  textAlign: "right",
  margin: "2pt 0 5pt",
  float: "right"
}));

type NutrientTextProps = {
  isBold?: boolean;
}

const NutrientText = styled(Typography)<NutrientTextProps>(({ isBold }) => ({
  fontWeight: isBold ? 700 : 100,
  fontFamily: "Helvetica",
  fontSize: "8pt",
  marginLeft: "2pt",
  padding: 0,
  display: "inline"
}));

const NutrientRowSeparatorBarHeight = '0.25pt';

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