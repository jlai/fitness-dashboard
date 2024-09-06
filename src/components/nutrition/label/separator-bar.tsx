import { styled, Box } from "@mui/material"

type BarProps = {
  height?: string;
  margin?: string;
  color?: string;
};

const Bar = styled(Box)<BarProps>(({ height, margin, color }) => ({
  backgroundColor: color || "black",
  height: height || "1px",
  margin: margin || "0"
}));

function SeparatorBar({ height, color, margin }: { height?: string, color?: string, margin?: string }) {
  return (
    <Bar height={height} color={color} margin={margin} />
  )
}

export default SeparatorBar;