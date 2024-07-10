"use client";

import { useEffect, useCallback, useRef } from "react";
import { useAtom, useAtomValue } from "jotai";
import {
  GridStack,
  GridStackNode,
  type GridStackNodesHandler,
} from "gridstack";
import { Delete as TrashIcon } from "@mui/icons-material";
import { Typography } from "@mui/material";

import { userTilesAtom } from "@/storage/tiles";

import { LazyTile } from "./tiles";
import { editingGridAtom } from "./state";

import "gridstack/dist/gridstack.min.css";
import "gridstack/dist/gridstack-extra.min.css";

export default function TileGrid() {
  const editingGrid = useAtomValue(editingGridAtom);
  const gridRef = useRef<GridStack>();
  const itemRefs = useRef(new Map<string, Element>());

  const [userTiles, setUserTiles] = useAtom(userTilesAtom);

  const updateTile = useCallback(
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
              x: node.x,
              y: node.y,
              w: node.w,
              h: node.h,
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

      console.log("removed", event, nodes);
    },
    [userTiles, setUserTiles]
  ) as GridStackNodesHandler;

  useEffect(() => {
    console.log("change");

    const grid = (gridRef.current =
      gridRef.current ||
      GridStack.init(
        {
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
        },
        "#tile-grid"
      ));

    grid.on("change", updateTile);

    grid.on("removed", removeTiles);

    return () => {
      gridRef.current?.off("change");
      gridRef.current?.off("removed");
    };
  }, [userTiles, updateTile, removeTiles]);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) {
      return;
    }

    grid.setAnimation(false);
    grid.batchUpdate();
    grid.removeAll(false, false);
    for (const tile of userTiles) {
      const node = itemRefs.current.get(tile.id);
      if (tile) {
        grid.addWidget(node, {
          id: tile.id,
          x: tile.x,
          y: tile.y,
          w: tile.w,
          h: tile.h,
        });
      }
    }
    grid.batchUpdate(false);
    grid.setAnimation(true);
  }, [userTiles]);

  useEffect(() => {
    const grid = gridRef.current;

    if (!grid) {
      return;
    }

    grid.enableResize(editingGrid);
    grid.enableMove(editingGrid);
  }, [editingGrid]);

  return (
    <div className="h-full w-full">
      <section
        className="my-8"
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
      <section id="tile-grid" className="grid-stack w-full">
        {userTiles.map((item) => (
          <div
            key={item.id}
            className="grid-stack-item"
            ref={(node: Element | null) => {
              if (node) {
                itemRefs.current.set(item.id, node);
              } else {
                itemRefs.current.delete(item.id);
              }
            }}
          >
            <div className="grid-stack-item-content">
              <LazyTile type={item.type} />
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
