import { MouseEvent, useRef } from "react";

const useResizable = () => {
  const isDraggingRef = useRef(false);

  const onMouseDown = (
    e: MouseEvent<HTMLDivElement, globalThis.MouseEvent>,
    colIndex: number,
  ) => {
    e.preventDefault();
    isDraggingRef.current = true;

    const onMouseMove = (e: globalThis.MouseEvent) => {
      if (isDraggingRef.current) {
        setSizes((old) => {
          const oldSizes = [...old];
          oldSizes[colIndex] = oldSizes[colIndex] + e.movementX;

          return oldSizes;
        });
      }
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };
};
