import {
  Button,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
} from "@mui/material";
import { bindMenu, usePopupState } from "material-ui-popup-state/hooks";
import { useAtomValue, useSetAtom } from "jotai";
import { unwrap } from "jotai/utils";
import { useCallback, useMemo } from "react";
import { Add, Check } from "@mui/icons-material";

import { UserTile, userTilesAtom } from "@/storage/tiles";
import { increasedTileLimitsAtom } from "@/storage/settings";

import { TILE_TYPES, TileDefinition } from "./tiles";

/** Sync read of async tile layout; keep prior tiles while a refresh is pending. */
const userTilesValueAtom = unwrap(userTilesAtom, (prev) => prev);
const increasedTileLimitsValueAtom = unwrap(
  increasedTileLimitsAtom,
  () => false,
);

export default function AddTileButton() {
  const userTiles = useAtomValue(userTilesValueAtom);
  const setUserTiles = useSetAtom(userTilesAtom);
  const increasedTileLimits = useAtomValue(increasedTileLimitsValueAtom);

  const tilesReady = userTiles !== undefined;
  const resolvedTiles = userTiles ?? [];

  const popupState = usePopupState({
    variant: "popover",
    popupId: "add-tile-menu",
  });

  const tileCountByType = useMemo(() => {
    const countByType = new Map<string, number>();
    for (const { type } of resolvedTiles) {
      countByType.set(type, (countByType.get(type) ?? 0) + 1);
    }
    return countByType;
  }, [resolvedTiles]);

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
      if (!userTiles) {
        return;
      }

      const newTile: UserTile = {
        id: `${type}-${Date.now()}`,
        type,
        w: tileDef.w,
        h: tileDef.h,
      };

      setUserTiles([...userTiles, newTile]);
      popupState.close();
    },
    [setUserTiles, userTiles, popupState],
  );

  return (
    <>
      <Button
        variant="text"
        color="inherit"
        onClick={popupState.open}
        startIcon={<Add />}
        disabled={!tilesReady}
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
