"use client";

import {
  GridStack,
  GridStackNodesHandler,
  GridStackOptions,
  GridStackWidget,
} from "gridstack";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import "gridstack/dist/gridstack.min.css";
import "gridstack/dist/gridstack-extra.min.css";

export interface GridStackReactWidget<TUserData>
  extends Omit<GridStackWidget, "id" | "data"> {
  id: string;
  data: TUserData;
}

export type GridRenderFunc<TUserData> = (
  w: GridStackReactWidget<TUserData>
) => React.ReactNode;

type ElementChangedListener = (element: HTMLElement | null) => void;

interface GridContextData {
  grid: GridStack;
  elementsById: Map<string, HTMLElement>;
  listenersById: Map<string, ElementChangedListener>;
}

const GridContext = createContext<GridContextData>({
  grid: undefined!,
  elementsById: new Map(),
  listenersById: new Map(),
});

export function GridNodePortal<TUserData>({
  widget,
  render,
}: {
  widget: GridStackReactWidget<TUserData>;
  render: (w: GridStackReactWidget<TUserData>) => React.ReactNode;
}) {
  const context = useContext(GridContext);
  const [element, setElement] = useState(
    context.elementsById.get(widget.id) ?? null
  );

  useEffect(() => {
    context.listenersById.set(widget.id, setElement);
  }, [context, widget.id]);

  return (
    element &&
    createPortal(
      <div className="grid-stack-item-content">{render(widget)}</div>,
      element
    )
  );
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
  const elementsById = useRef<Map<string, HTMLElement>>(new Map());
  const listenersById = useRef<Map<string, ElementChangedListener>>(new Map());
  const [grid, setGrid] = useState<GridStack | null>(null);

  const gridRef = useRef<HTMLDivElement | null>(null);

  const contextData = useMemo(
    () =>
      grid && {
        grid,
        elementsById: elementsById.current,
        listenersById: listenersById.current,
      },
    [grid]
  );

  const handleAdded = useCallback(
    (event, nodes) => {
      onAdded?.(event, nodes);
    },
    [onAdded]
  ) as GridStackNodesHandler;

  const handleChange = useCallback(
    (event, nodes) => {
      onChange?.(event, nodes);
    },
    [onChange]
  ) as GridStackNodesHandler;

  const handleRemoved = useCallback(
    (event, nodes) => {
      onRemoved?.(event, nodes);
    },
    [onRemoved]
  ) as GridStackNodesHandler;

  useEffect(() => {
    if (gridRef.current) {
      const newGrid = GridStack.init(options, gridRef.current);
      setGrid(newGrid);

      newGrid.on("change", handleChange);
      newGrid.on("added", handleAdded);
      newGrid.on("removed", handleRemoved);
    }
  }, [options, handleChange, handleRemoved, handleAdded]);

  useEffect(() => {
    const addRemove = (
      parent: HTMLElement,
      w: GridStackWidget,
      add: boolean,
      grid: boolean
    ) => {
      const id = w.id!;

      if (add) {
        const el = document.createElement("div");
        el.classList.add("grid-stack-item");

        parent.appendChild(el);
        elementsById.current.set(id, el);
        listenersById.current.get(id)?.(el);

        return el;
      } else {
        elementsById.current.delete(id);
        listenersById.current.get(id)?.(null);
      }
    };

    grid?.load(layout, addRemove);
  }, [grid, layout]);

  useEffect(() => {
    if (!grid) {
      return;
    }

    if (disableDrag !== undefined) {
      grid.enableMove(!disableDrag);
    }

    if (disableResize !== undefined) {
      grid.enableResize(!disableResize);
    }
  }, [grid, disableDrag, disableResize]);

  useEffect(() => {
    return () => {
      if (grid) {
        grid.destroy();
        setGrid(null);
        gridRef.current = null;
      }
    };
  }, [grid]);

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
