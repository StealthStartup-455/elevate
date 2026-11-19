// The climber's check-in barcode on /me (#38): a Code 128 barcode of their
// student ID ("V00946178"). It never changes, so a screenshot or a printed
// copy works too. The desk scans it with the camera, a USB scanner, or types
// the ID printed under it.
import { code128Bits } from "../code128";

const MODULE = 2; // width of the thinnest bar, in SVG units
const HEIGHT = 90;
const QUIET = 10; // empty modules each side, so a scanner finds the start

// Always dark on white, even in dark mode, like a printed barcode.
export default function ClimberBarcode({ value, width = 280 }: { value: string; width?: number }) {
  const bits = code128Bits(value);
  const bars: { x: number; w: number }[] = [];
  for (let i = 0; i < bits.length; ) {
    if (bits[i] === "0") {
      i++;
      continue;
    }
    let end = i;
    while (bits[end] === "1") end++;
    bars.push({ x: i, w: end - i });
    i = end;
  }
  const total = bits.length + QUIET * 2;
  return (
    <svg
      viewBox={`${-QUIET} 0 ${total} ${HEIGHT / MODULE}`}
      width={width}
      height={(width * HEIGHT) / (MODULE * total)}
      role="img"
      aria-label={`Check-in barcode for ${value}`}
      shapeRendering="crispEdges"
      // eslint-disable-next-line no-restricted-syntax -- always white, like a printed barcode
      style={{ background: "#fff", borderRadius: 6 }}
    >
      {/* eslint-disable-next-line no-restricted-syntax -- always dark, like a printed barcode */}
      <g fill="#111">
        {bars.map(({ x, w }) => (
          <rect key={x} x={x} y={0} width={w} height={HEIGHT / MODULE} />
        ))}
      </g>
    </svg>
  );
}
