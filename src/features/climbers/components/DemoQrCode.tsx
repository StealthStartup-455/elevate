// A QR-looking placeholder until the check-in ticket picks a real code
// format. It has the three corner squares of a QR code, but it does NOT scan.

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

export default function DemoQrCode({ value, size = 104 }: { value: string; size?: number }) {
  const random = seeded(value);
  const modules: { x: number; y: number }[] = [];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (!inFinder(x, y) && random() < 0.5) modules.push({ x, y });
    }
  }

  return (
    // Always dark on white, even in dark mode, like a real code.
    <svg
      viewBox={`-2 -2 ${SIZE + 4} ${SIZE + 4}`}
      width={size}
      height={size}
      role="img"
      aria-label={`Demo check-in code for ${value}`}
      shapeRendering="crispEdges"
      // eslint-disable-next-line no-restricted-syntax -- always white, like a printed code
      style={{ background: "#fff", borderRadius: 6 }}
    >
      {/* eslint-disable-next-line no-restricted-syntax -- always dark, like a printed code */}
      <g fill="#111">
        <Finder x={0} y={0} />
        <Finder x={SIZE - 7} y={0} />
        <Finder x={0} y={SIZE - 7} />
        {modules.map(({ x, y }) => (
          <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} />
        ))}
      </g>
    </svg>
  );
}
