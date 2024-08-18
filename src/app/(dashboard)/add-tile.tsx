import {
  Button,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
} from "@mui/material";
import { bindMenu, usePopupState } from "material-ui-popup-state/hooks";
import { useAtom, useAtomValue } from "jotai";
import { useCallback, useMemo } from "react";
import { Add, Check } from "@mui/icons-material";

import { UserTile, userTilesAtom } from "@/storage/tiles";
import { increasedTileLimitsAtom } from "@/storage/settings";

import { TILE_TYPES, TileDefinition } from "./tiles";

export default function AddTileButton() {
  const [userTiles, setUserTiles] = useAtom(userTilesAtom);
  const increasedTileLimits = useAtomValue(increasedTileLimitsAtom);

  const popupState = usePopupState({
    variant: "popover",
    popupId: "add-tile-menu",
  });

  const tileCountByType = useMemo(() => {
    const countByType = new Map<string, number>();
    for (const { type } of userTiles) {
      countByType.set(type, (countByType.get(type) ?? 0) + 1);
    }
    return countByType;
  }, [userTiles]);

  const availableTileDefs = useMemo(() => {
    return [...Object.entries(TILE_TYPES)].filter(([type, tileDef]) => {
      let max = tileDef.max ?? 1;

      if (increasedTileLimits && max > 1) {
        max = Infinity;
      }

      return (tileCountByType.get(type) ?? 0) < max;
    });
  }, [tileCountByType, increasedTileLimits]);

  const addTile = useCallback(
    (type: string, tileDef: TileDefinition) => {
      const newTile: UserTile = {
        id: `${type}-${Date.now()}`,
        type,
        w: tileDef.w,
        h: tileDef.h,
      };

      setUserTiles([...userTiles, newTile]);
      popupState.close();
    },
    [setUserTiles, userTiles, popupState]
  );

  return (
    <>
      <Button
        variant="text"
        color="inherit"
        onClick={popupState.open}
        startIcon={<Add />}
      >
        Add tile
      </Button>
      <Menu {...bindMenu(popupState)}>
        {availableTileDefs.map(([type, tileDef]) => (
          <MenuItem key={type} onClick={() => addTile(type, tileDef)}>
            <ListItemText
              primary={tileDef.name}
              secondary={
                !increasedTileLimits && tileDef.max
                  ? `Maximum: ${tileDef.max}`
                  : null
              }
            />
          </MenuItem>
        ))}
        {availableTileDefs.length === 0 && (
          <MenuItem disabled>
            <ListItemIcon>
              <Check />
            </ListItemIcon>
            <ListItemText>All tiles added</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </>
  );
}
