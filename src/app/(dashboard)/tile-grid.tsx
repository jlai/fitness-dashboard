"use client";

import { useAtom, useAtomValue } from "jotai";
import { useCallback, useMemo } from "react";
import { GridStackNode, GridStackNodesHandler } from "gridstack";
import { Typography } from "@mui/material";
import { DeleteOutlineOutlined as TrashIcon } from "@mui/icons-material";

import { userTilesAtom } from "@/storage/tiles";

import { Grid, GridStackReactWidget } from "./grid";
import { editingGridAtom } from "./state";
import { LazyTile } from "./tiles";
import { TileContext } from "./tiles/tile";

type GridData = {
  type: string;
};

const GRID_OPTIONS = {
  auto: false,
  margin: 6,
  float: true,
  cellHeight: 150,
  column: 8,
  columnOpts: {
    columnWidth: 150,
  },
  minRow: 1,
  removable: "#grid-remove-target",
  disableDrag: true,
  disableResize: true,
};

function renderTile({ data, w, h }: GridStackReactWidget<GridData>) {
  return (
    <TileContext.Provider value={{ w, h, type: data.type }}>
      <LazyTile type={data.type} />
    </TileContext.Provider>
  );
}

export default function TileGrid() {
  const [userTiles, setUserTiles] = useAtom(userTilesAtom);
  const editingGrid = useAtomValue(editingGridAtom);

  const layout = useMemo(
    () =>
      userTiles.map((tile) => ({
        id: tile.id,
        x: tile.x,
        y: tile.y,
        w: tile.w ?? 1, // support old tile configs
        h: tile.h ?? 1, // support old tile configs
        data: {
          type: tile.type,
        },
      })),
    [userTiles]
  );

  const updateTiles = useCallback(
    (event: Event, nodes: GridStackNode[]) => {
      const changesById = nodes.reduce(
        (acc, node) => (node.id !== undefined ? acc.set(node.id, node) : acc),
        new Map<string, GridStackNode>()
      );

      const updatedTiles = userTiles.map((tile) => {
        const node = changesById.get(tile.id);

        return node
          ? {
              ...tile,
              x: node.x ?? tile.x,
              y: node.y ?? tile.y,
              w: node.w ?? tile.w,
              h: node.h ?? tile.h,
            }
          : tile;
      });

      // Don't save changes from window resizes
      if (editingGrid) {
        setUserTiles(updatedTiles);
      }
    },
    [userTiles, setUserTiles, editingGrid]
  );

  const removeTiles = useCallback(
    (event, nodes) => {
      const removedIds = new Set(nodes.map((node) => node.id));
      const updatedTiles = userTiles.filter((tile) => !removedIds.has(tile.id));

      setUserTiles(updatedTiles);
    },
    [userTiles, setUserTiles]
  ) as GridStackNodesHandler;

  return (
    <>
      <section
        className="mb-4"
        style={{ display: editingGrid ? "block" : "none" }}
      >
        <div
          id="grid-remove-target"
          className="w-full h-20 bg-red-50 border-dashed border-slate-300 border-2 rounded-2xl flex flex-row justify-center items-center gap-x-4"
        >
          <TrashIcon className="text-slate-400" />
          <Typography variant="h5">Drag tiles here to remove</Typography>
        </div>
      </section>
      <Grid<GridData>
        layout={layout}
        options={GRID_OPTIONS}
        disableDrag={!editingGrid}
        disableResize={!editingGrid}
        onChange={updateTiles}
        onAdded={editingGrid ? updateTiles : undefined}
        onRemoved={removeTiles}
        render={renderTile}
      />
    </>
  );
}
