import {
  Button,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
} from "@mui/material";
import { bindMenu, usePopupState } from "material-ui-popup-state/hooks";
import { useAtom } from "jotai";
import { useCallback, useMemo } from "react";
import { Add, Check } from "@mui/icons-material";

import { UserTile, userTilesAtom } from "@/storage/tiles";

import { TILE_TYPES, TileDefinition } from "./tiles";

export default function AddTileButton() {
  const [userTiles, setUserTiles] = useAtom(userTilesAtom);

  const popupState = usePopupState({
    variant: "popover",
    popupId: "add-tile-menu",
  });

  const unaddedTileDefs = useMemo(() => {
    const existingTypes = new Set(userTiles.map((tile) => tile.type));

    return [...Object.entries(TILE_TYPES)].filter(
      ([type]) => !existingTypes.has(type)
    );
  }, [userTiles]);

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
        {unaddedTileDefs.map(([type, tileDef]) => (
          <MenuItem key={type} onClick={() => addTile(type, tileDef)}>
            {tileDef.name}
          </MenuItem>
        ))}
        {unaddedTileDefs.length === 0 && (
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
