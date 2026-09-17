"use client";

import {
  GridStack,
  GridStackNodesHandler,
  GridStackOptions,
  GridStackWidget,
} from "gridstack";
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import "gridstack/dist/gridstack.min.css";

export interface GridStackReactWidget<TUserData> extends Omit<
  GridStackWidget,
  "id"
> {
  id: string;
  data: TUserData;
}

export type GridRenderFunc<TUserData> = (
  w: GridStackReactWidget<TUserData>,
) => React.ReactNode;

interface GridContextData {
  grid: GridStack;
  /** Bumped after load()/DOM host changes so portals re-resolve containers. */
  layoutVersion: number;
}

const GridContext = createContext<GridContextData | null>(null);

function isLiveGrid(grid: GridStack | null | undefined): grid is GridStack {
  // destroy() deletes opts; never call methods on a destroyed instance.
  return !!grid?.opts && !!grid.el;
}

function contentElForId(grid: GridStack, id: string): HTMLElement | null {
  const node = grid.engine?.nodes.find((n) => String(n.id) === String(id));
  return (
    node?.el?.querySelector<HTMLElement>(".grid-stack-item-content") ?? null
  );
}

/** v11+ addRemoveCB: create item + content shells; GridStack appends/makeWidget. */
function createItemShell(
  _parent: HTMLElement,
  w: GridStackWidget,
  add: boolean,
  _isGrid: boolean,
): HTMLElement | undefined {
  if (!add) {
    // DOM removal is handled by removeWidget() after this callback.
    return;
  }

  const itemEl = document.createElement("div");
  itemEl.classList.add("grid-stack-item");
  if (w.id != null) {
    itemEl.setAttribute("gs-id", String(w.id));
  }
  const contentEl = document.createElement("div");
  contentEl.classList.add("grid-stack-item-content");
  itemEl.appendChild(contentEl);
  return itemEl;
}

export function GridNodePortal<TUserData>({
  widget,
  render,
}: {
  widget: GridStackReactWidget<TUserData>;
  render: (w: GridStackReactWidget<TUserData>) => React.ReactNode;
}) {
  const context = useContext(GridContext);
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (!context || !isLiveGrid(context.grid)) {
      setContainer(null);
      return;
    }
    setContainer(contentElForId(context.grid, widget.id));
  }, [context, context?.layoutVersion, widget.id]);

  if (!container) {
    return null;
  }

  return createPortal(render(widget), container);
}

export function Grid<TUserData = any>({
  layout,
  options,
  render,
  onChange,
  onAdded,
  onRemoved,
  disableResize = options?.disableResize,
  disableDrag = options?.disableDrag,
}: {
  layout: Array<GridStackReactWidget<TUserData>>;
  options?: GridStackOptions;
  render: (w: GridStackReactWidget<TUserData>) => React.ReactNode;
  onChange?: GridStackNodesHandler;
  onAdded?: GridStackNodesHandler;
  onRemoved?: GridStackNodesHandler;
  disableResize?: boolean;
  disableDrag?: boolean;
}) {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const gridInstanceRef = useRef<GridStack | null>(null);
  const [gridGeneration, setGridGeneration] = useState(0);
  const [layoutVersion, setLayoutVersion] = useState(0);

  const onChangeRef = useRef(onChange);
  const onAddedRef = useRef(onAdded);
  const onRemovedRef = useRef(onRemoved);
  const layoutRef = useRef(layout);
  onChangeRef.current = onChange;
  onAddedRef.current = onAdded;
  onRemovedRef.current = onRemoved;
  layoutRef.current = layout;

  const contextData = useMemo((): GridContextData | null => {
    const grid = gridInstanceRef.current;
    if (!isLiveGrid(grid)) {
      return null;
    }
    return { grid, layoutVersion };
  }, [gridGeneration, layoutVersion]);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) {
      return;
    }

    // Drop orphaned items from a prior destroy(false) / StrictMode cycle.
    Array.from(el.children).forEach((child) => {
      if (
        child instanceof HTMLElement &&
        child.classList.contains("grid-stack-item") &&
        !(child as HTMLElement & { gridstackNode?: unknown }).gridstackNode
      ) {
        child.remove();
      }
    });

    const newGrid = GridStack.init(options, el);
    if (!newGrid) {
      return;
    }
    gridInstanceRef.current = newGrid;
    setGridGeneration((value) => value + 1);

    const handleChange: GridStackNodesHandler = (event, nodes) => {
      onChangeRef.current?.(event, nodes);
    };
    const handleAdded: GridStackNodesHandler = (event, nodes) => {
      onAddedRef.current?.(event, nodes);
    };
    const handleRemoved: GridStackNodesHandler = (event, nodes) => {
      onRemovedRef.current?.(event, nodes);
    };

    newGrid.on("change", handleChange);
    newGrid.on("added", handleAdded);
    newGrid.on("removed", handleRemoved);

    return () => {
      if (gridInstanceRef.current === newGrid) {
        gridInstanceRef.current = null;
      }
      newGrid.off("change");
      newGrid.off("added");
      newGrid.off("removed");
      if (newGrid.el) {
        newGrid.removeAll(/* removeDOM */ true, /* triggerEvent */ false);
        newGrid.destroy(false);
      }
    };
  }, [options]);

  // Reload GridStack only when widget geometry/membership changes — not when
  // per-tile `data` (e.g. settings) updates, which would recreate DOM hosts and
  // unmount portals (closing tile dialogs).
  const layoutGeometryKey = useMemo(
    () =>
      layout
        .map((w) => `${w.id}:${w.x ?? ""}:${w.y ?? ""}:${w.w ?? ""}:${w.h ?? ""}`)
        .join("|"),
    [layout],
  );

  // useLayoutEffect so content hosts exist before paint / portal commit.
  useLayoutEffect(() => {
    const grid = gridInstanceRef.current;
    if (gridGeneration === 0 || !isLiveGrid(grid)) {
      return;
    }

    grid.load(layoutRef.current, createItemShell);
    setLayoutVersion((value) => value + 1);
  }, [gridGeneration, layoutGeometryKey]);

  // Re-apply after hosts load and whenever edit mode toggles. Force-rebuild DD when
  // enabling — first enable after load can otherwise leave handles unbound until a
  // disable/enable cycle.
  useEffect(() => {
    const grid = gridInstanceRef.current;
    if (gridGeneration === 0 || !isLiveGrid(grid)) {
      return;
    }

    const allowMove = !disableDrag;
    const allowResize = !disableResize;

    grid.enableMove(allowMove);
    grid.enableResize(allowResize);

    if (allowMove || allowResize) {
      for (const el of grid.getGridItems()) {
        grid.prepareDragDrop(el, /* force */ true);
      }
    }
  }, [gridGeneration, layoutVersion, disableDrag, disableResize]);

  return (
    <>
      <div ref={gridRef} className="grid-stack"></div>
      {contextData && (
        <GridContext.Provider value={contextData}>
          {layout.map((w) => (
            <GridNodePortal<TUserData> key={w.id} widget={w} render={render} />
          ))}
        </GridContext.Provider>
      )}
    </>
  );
}
