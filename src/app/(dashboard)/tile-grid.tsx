"use client";

import { useEffect, useCallback, useRef } from "react";
import { useAtom, useAtomValue } from "jotai";
import { GridStack, GridStackNode } from "gridstack";

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

  useEffect(() => {
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
          disableDrag: true,
          disableResize: true,
        },
        "#tile-grid"
      ));

    grid.on("change", updateTile);
  }, [updateTile]);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) {
      return;
    }

    grid.setAnimation(false);
    grid.batchUpdate();
    grid.removeAll();
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
