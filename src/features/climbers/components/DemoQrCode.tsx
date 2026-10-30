// The climber's code on /me. In demo mode it is a real QR code that opens a
// song, for the class demo (#146); anywhere else it is a QR-looking
// placeholder with the three corner squares that does NOT scan, until the
// check-in ticket picks a real code format. Nothing in the scan flow reads
// either one: check-in goes through the "Simulate scan" button.
import QRCode from "qrcode";
import { isDemoMode } from "@/features/auth/demo-mode";

/** What the demo code opens when a phone camera scans it. */
export const DEMO_QR_LINK = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

const SIZE = 25;

// Small seeded random generator, so the same value always draws the same code.
function seeded(seed: string) {
  let state = [...seed].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

// Is (x, y) inside one of the 7x7 corner squares (plus its 1-module margin)?
function inFinder(x: number, y: number): boolean {
  const near = (v: number, start: number) => v >= start && v < start + 8;
  return (
    (near(x, 0) && near(y, 0)) ||
    (near(x, SIZE - 8) && near(y, 0)) ||
    (near(x, 0) && near(y, SIZE - 8))
  );
}

function Finder({ x, y }: { x: number; y: number }) {
  return (
    <>
      <rect x={x} y={y} width={7} height={7} />
      {/* eslint-disable-next-line no-restricted-syntax -- QR codes stay dark on white in both themes so scanners can read them */}
      <rect x={x + 1} y={y + 1} width={5} height={5} fill="#fff" />
      <rect x={x + 2} y={y + 2} width={3} height={3} />
    </>
  );
}

// Always dark on white, even in dark mode, like a printed code. The 2-module
// margin around it is the quiet zone a scanner needs.
function CodeSvg({
  size,
  modules,
  count,
  label,
  children,
}: {
  size: number;
  modules: { x: number; y: number }[];
  count: number;
  label: string;
  children?: React.ReactNode;
}) {
  return (
    <svg
      viewBox={`-2 -2 ${count + 4} ${count + 4}`}
      width={size}
      height={size}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
      // eslint-disable-next-line no-restricted-syntax -- always white, like a printed code
      style={{ background: "#fff", borderRadius: 6 }}
    >
      {/* eslint-disable-next-line no-restricted-syntax -- always dark, like a printed code */}
      <g fill="#111">
        {children}
        {modules.map(({ x, y }) => (
          <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} />
        ))}
      </g>
    </svg>
  );
}

function ScannableCode({ value, size }: { value: string; size: number }) {
  const { modules: bits } = QRCode.create(DEMO_QR_LINK, { errorCorrectionLevel: "M" });
  const modules: { x: number; y: number }[] = [];
  for (let y = 0; y < bits.size; y++) {
    for (let x = 0; x < bits.size; x++) {
      if (bits.get(x, y)) modules.push({ x, y });
    }
  }
  return (
    <CodeSvg size={size} modules={modules} count={bits.size} label={`Demo check-in code for ${value}`} />
  );
}

function PlaceholderCode({ value, size }: { value: string; size: number }) {
  const random = seeded(value);
  const modules: { x: number; y: number }[] = [];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (!inFinder(x, y) && random() < 0.5) modules.push({ x, y });
    }
  }
  return (
    <CodeSvg size={size} modules={modules} count={SIZE} label={`Demo check-in code for ${value}`}>
      <Finder x={0} y={0} />
      <Finder x={SIZE - 7} y={0} />
      <Finder x={0} y={SIZE - 7} />
    </CodeSvg>
  );
}

export default function DemoQrCode({ value, size = 128 }: { value: string; size?: number }) {
  return isDemoMode() ? (
    <ScannableCode value={value} size={size} />
  ) : (
    <PlaceholderCode value={value} size={size} />
  );
}
