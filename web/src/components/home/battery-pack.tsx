/**
 * The battery pack. Side-on it's the thin slab under the car's floor; lifted
 * and tipped towards the viewer it shows its top: four modules packed with
 * cylindrical cells. A second, lit copy of the cells is wiped across to show
 * charge flowing in.
 */

const COLS = 34;
const ROWS = 4;
const MODULES = 4;

function Cells({ lit }: { lit?: boolean }) {
  const cells: React.ReactNode[] = [];
  const mw = 1000 - 60;
  const moduleH = (480 - 60 - (MODULES - 1) * 14) / MODULES;
  for (let m = 0; m < MODULES; m++) {
    const y0 = 30 + m * (moduleH + 14);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const offset = r % 2 ? (mw / COLS) / 2 : 0;
        const cx = 30 + (mw / COLS) * c + (mw / COLS) / 2 + offset - (r % 2 ? 4 : 0);
        const cy = y0 + 12 + r * ((moduleH - 24) / (ROWS - 1));
        if (cx > 30 + mw - 8) continue;
        cells.push(<circle key={`${m}-${r}-${c}`} cx={cx} cy={cy} r={9} />);
      }
    }
  }
  return (
    <svg viewBox="0 0 1000 480" className="absolute inset-0 h-full w-full" aria-hidden>
      {!lit ? (
        <>
          <rect x="4" y="4" width="992" height="472" rx="26" fill="#0b1210" stroke="rgb(157 240 196 / 0.55)" strokeWidth="3" />
          {Array.from({ length: MODULES }).map((_, m) => (
            <rect
              key={m}
              x="22"
              y={22 + m * ((480 - 60 - (MODULES - 1) * 14) / MODULES + 14)}
              width="956"
              height={(480 - 60 - (MODULES - 1) * 14) / MODULES + 16}
              rx="10"
              fill="#0f1a17"
              stroke="rgb(157 240 196 / 0.22)"
              strokeWidth="2"
            />
          ))}
          <g fill="#1b2c27">{cells}</g>
          {/* Busbars and the battery management unit at the front */}
          <g stroke="rgb(157 240 196 / 0.35)" strokeWidth="2" fill="none">
            <path d="M40 240h-28" />
            <path d="M960 120h28M960 360h28" />
          </g>
        </>
      ) : (
        <g fill="#b9f7d6">{cells}</g>
      )}
    </svg>
  );
}

export function BatteryPack() {
  return (
    <>
      {/* The slab you see side-on, inside the X-ray */}
      <div
        data-s="face"
        className="absolute inset-0 overflow-hidden rounded-[0.2rem] border border-ion/70 bg-[linear-gradient(180deg,rgb(157_240_196/0.5),rgb(27_106_75/0.55))] shadow-[0_0_1.5rem_rgb(157_240_196/0.45)]"
      >
        <div className="absolute inset-y-0 left-[25%] w-px bg-night-950/50" />
        <div className="absolute inset-y-0 left-[50%] w-px bg-night-950/50" />
        <div className="absolute inset-y-0 left-[75%] w-px bg-night-950/50" />
      </div>
      {/* The pack's top, hinged on the slab's front edge. It starts edge-on and
          tips towards you as it rises, using its own perspective so it renders
          the same in every browser. */}
      <div
        data-s="plate"
        className="absolute bottom-full left-0 w-full rounded-[1.4rem] shadow-[0_0.35rem_0_rgb(27_106_75),0_0_3rem_rgb(157_240_196/0.25)]"
        style={{ height: "var(--pack-depth)", transformOrigin: "50% 100%", transform: "perspective(1400px) rotateX(89deg)" }}
      >
        <Cells />
        <div data-s="lit" className="absolute inset-0" style={{ clipPath: "inset(0% 100% 0% 0%)" }}>
          <div className="absolute inset-[6%] rounded-[2rem] bg-ion/25 blur-2xl" />
          <Cells lit />
        </div>
      </div>
    </>
  );
}
