import { useCallback } from "react";
import { useTooltip, useTooltipInPortal } from "@visx/tooltip";
import { localPoint } from "@visx/event";

export function usePortalTooltip<TDatum = {}>() {
  const tooltip = useTooltip<TDatum>();
  const { showTooltip } = tooltip;

  const { containerRef, TooltipInPortal } = useTooltipInPortal({
    detectBounds: true,
    scroll: true,
  });

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<SVGElement>, datum: TDatum) => {
      const coords = localPoint((event.target as any).ownerSVGElement, event);
      if (!coords) {
        return;
      }

      showTooltip({
        tooltipLeft: coords.x,
        tooltipTop: coords.y,
        tooltipData: datum,
      });
    },
    [showTooltip]
  );

  return {
    ...tooltip,
    containerRef,
    TooltipInPortal,
    handleMouseMove,
  };
}
