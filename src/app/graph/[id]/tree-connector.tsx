"use client";

import { memo } from "react";

interface TreeConnectorProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  halfWidth: number;
  halfHeight: number;
}

export default memo(function TreeConnector({
  x1,
  y1,
  x2,
  y2,
  halfWidth,
  halfHeight,
}: TreeConnectorProps) {
  return (
    <i
      className="pointer-events-none absolute block rounded-sm"
      style={{
        width: Math.max(2, (x2 - x1) * halfWidth),
        height: Math.max(2, (y2 - y1) * halfHeight),
        backgroundColor: "#7fdb9a",
        opacity: 0.3,
        transform: `translate(${x1 * halfWidth}px, ${y1 * halfHeight}px)`,
      }}
    />
  );
});
