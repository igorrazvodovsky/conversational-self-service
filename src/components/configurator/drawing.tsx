/**
 * The car and shaft as quoted, drawn: a plan from above and a section through
 * the shaft, from the values a quote holds.
 *
 * A schematic, not a manufacturer's layout drawing. Widths and depths in the
 * plan, and pit, car height and headroom in the section, are to scale; the
 * travel is a range in the catalogue, so the section breaks the shaft between
 * the bottom landing and the top and names the range instead.
 *
 * Like `SENTENCED` in `document.tsx`, this knows a few of the catalogue's
 * variable names, and it reads sizes from the option labels, which are the
 * catalogue's only statement of them ("1600 × 1400 mm", "900 mm"). A label
 * that does not read as a size leaves the drawing out rather than guessing.
 */

const SIZES = {
  car: "car_size",
  carHeight: "car_height",
  shaft: "shaft",
  pit: "pit_depth",
  headroom: "headroom",
  door: "door_width",
  doorType: "door_type",
  travel: "travel",
  stops: "stops",
};

type Held = { name: string; label: string; value: string };

function pair(label: string | undefined): [number, number] | null {
  const m = label?.match(/^(\d+)\s*×\s*(\d+)\s*mm/);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

function one(label: string | undefined): number | null {
  const m = label?.match(/^(\d+)\s*mm/);
  return m ? Number(m[1]) : null;
}

const WALL = 200; // mm, drawn, not quoted
const FONT = 12;

function Dim({
  x1,
  y1,
  x2,
  y2,
  text,
  side = 1,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  text: string;
  /** Which side of the line the figure sits on. */
  side?: 1 | -1;
}) {
  const vertical = x1 === x2;
  const tick = 4;
  return (
    <g className="text-muted-foreground">
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" />
      {vertical ? (
        <>
          <line x1={x1 - tick} y1={y1} x2={x1 + tick} y2={y1} stroke="currentColor" />
          <line x1={x2 - tick} y1={y2} x2={x2 + tick} y2={y2} stroke="currentColor" />
          <text
            x={x1 + side * 6}
            y={(y1 + y2) / 2}
            dominantBaseline="middle"
            textAnchor={side > 0 ? "start" : "end"}
            fill="currentColor"
            fontSize={FONT}
          >
            {text}
          </text>
        </>
      ) : (
        <>
          <line x1={x1} y1={y1 - tick} x2={x1} y2={y1 + tick} stroke="currentColor" />
          <line x1={x2} y1={y2 - tick} x2={x2} y2={y2 + tick} stroke="currentColor" />
          <text
            x={(x1 + x2) / 2}
            y={y1 + side * (side > 0 ? 14 : 6)}
            textAnchor="middle"
            fill="currentColor"
            fontSize={FONT}
          >
            {text}
          </text>
        </>
      )}
    </g>
  );
}

function Hatch({ id }: { id: string }) {
  return (
    <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="6" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    </pattern>
  );
}

function Plan({
  shaft,
  car,
  door,
  doorType,
  id,
}: {
  shaft: [number, number];
  car: [number, number];
  door: number;
  doorType: string;
  id: string;
}) {
  const s = 200 / Math.max(shaft[0], shaft[1]);
  const pad = { l: 16, t: 28, r: 64, b: 40 };
  const w = shaft[0] * s;
  const d = shaft[1] * s;
  const wall = WALL * s;
  const ox = pad.l + wall;
  const oy = pad.t + wall;
  const cw = car[0] * s;
  const cd = car[1] * s;
  // The car against the entrance, centred across the shaft; the rest of
  // the depth behind it is where the counterweight and rails go.
  const cx = ox + (w - cw) / 2;
  const cy = oy + d - cd - 30 * s;
  const ow = door * s;
  const side = doorType.startsWith("telescopic");
  const panels = doorType.endsWith("_4") ? 4 : 2;
  const dx = side ? cx + 6 : ox + (w - ow) / 2;
  const front = oy + d;
  const W = ox + w + wall + pad.r;
  const H = front + wall + pad.b;
  const hatch = `${id}-hatch`;
  // Door panels, drawn closed across the opening in the wall.
  const leaves = Array.from({ length: panels }, (_, i) => {
    const each = ow / panels;
    if (side) {
      return { x: dx + i * each, y: front + 3 + i * 4, w: each };
    }
    const half = panels / 2;
    const k = i < half ? i : i - half;
    const fromLeft = i < half;
    const x = fromLeft ? dx + k * each : dx + ow - (k + 1) * each;
    return { x, y: front + 3 + (half - 1 - k) * 4, w: each };
  });
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      className="max-w-full text-foreground"
      role="img"
      aria-label={`Plan: shaft ${shaft[0]} × ${shaft[1]} mm, car ${car[0]} × ${car[1]} mm, entrance ${door} mm`}
    >
      <defs>
        <Hatch id={hatch} />
      </defs>
      {/* Walls, with the entrance cut out of the front one. */}
      <path
        fillRule="evenodd"
        fill={`url(#${hatch})`}
        stroke="currentColor"
        d={`M${pad.l} ${pad.t}h${w + 2 * wall}v${d + 2 * wall}H${dx + ow}v${-wall}h${-ow}v${wall}H${pad.l}Z M${ox} ${oy}h${w}v${d}H${ox}Z`}
      />
      <rect x={ox} y={oy} width={w} height={d} fill="none" stroke="currentColor" />
      <rect x={cx} y={cy} width={cw} height={cd} fill="var(--card)" stroke="currentColor" strokeWidth="1.5" />
      <text x={cx + cw / 2} y={cy + cd / 2 - 8} textAnchor="middle" dominantBaseline="middle" fill="currentColor" fontSize={FONT}>
        <tspan x={cx + cw / 2}>car</tspan>
        <tspan x={cx + cw / 2} dy={16} className="text-muted-foreground" fill="currentColor">
          {car[0]} × {car[1]}
        </tspan>
      </text>
      {/* The entrance. */}
      {leaves.map((leaf, i) => (
        <line key={i} x1={leaf.x} y1={leaf.y} x2={leaf.x + leaf.w} y2={leaf.y} stroke="currentColor" strokeWidth="2" />
      ))}
      <Dim x1={ox} y1={pad.t - 12} x2={ox + w} y2={pad.t - 12} text={`${shaft[0]}`} side={-1} />
      <Dim x1={ox + w + wall + 10} y1={oy} x2={ox + w + wall + 10} y2={oy + d} text={`${shaft[1]}`} />
      <Dim x1={dx} y1={front + wall + 10} x2={dx + ow} y2={front + wall + 10} text={`${door}`} />
    </svg>
  );
}

function Section({
  pit,
  carHeight,
  headroom,
  travel,
  stops,
  depth,
  id,
}: {
  pit: number;
  carHeight: number;
  headroom: number;
  travel: string;
  stops: string;
  depth: number;
  id: string;
}) {
  const s = 0.04; // px per mm, the plan's scale or near it
  const pad = { l: 16, t: 12, r: 132, b: 12 };
  const wall = WALL * s;
  const w = Math.min(depth * s, 100);
  const ox = pad.l + wall;
  const gap = 28; // the break, in px, standing for the travel
  const top = pad.t + wall;
  const head = headroom * s;
  const pitH = pit * s;
  const carH = carHeight * s;
  const upper = top + head; // top landing
  const lower = upper + gap + carH; // bottom landing
  const floor = lower + pitH;
  const H = floor + wall + pad.b;
  const W = ox + w + wall + pad.r;
  const hatch = `${id}-hatch`;
  const zig = (y: number) =>
    `M${pad.l - 4} ${y}h${(w + 2 * wall) / 2 + 4}l4 -5l4 10l4 -5H${ox + w + wall + 4}`;
  const right = ox + w + wall + 10;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      className="max-w-full text-foreground"
      role="img"
      aria-label={`Section: pit ${pit} mm, car height ${carHeight} mm, headroom ${headroom} mm, travel ${travel}, ${stops}`}
    >
      <defs>
        <Hatch id={hatch} />
      </defs>
      {/* Walls, roof and pit floor. */}
      <rect x={pad.l} y={pad.t} width={w + 2 * wall} height={wall} fill={`url(#${hatch})`} stroke="currentColor" />
      <rect x={pad.l} y={floor} width={w + 2 * wall} height={wall} fill={`url(#${hatch})`} stroke="currentColor" />
      <rect x={pad.l} y={top} width={wall} height={floor - top} fill={`url(#${hatch})`} stroke="currentColor" />
      <rect x={ox + w} y={top} width={wall} height={floor - top} fill={`url(#${hatch})`} stroke="currentColor" />
      <path d={zig(upper + gap / 2 - 4)} fill="none" stroke="currentColor" className="text-muted-foreground" />
      <path d={zig(upper + gap / 2 + 4)} fill="none" stroke="currentColor" className="text-muted-foreground" />
      {/* Landings. */}
      <line x1={pad.l - 6} y1={upper} x2={ox + w + wall} y2={upper} stroke="currentColor" strokeDasharray="4 3" />
      <line x1={pad.l - 6} y1={lower} x2={ox + w + wall} y2={lower} stroke="currentColor" strokeDasharray="4 3" />
      {/* The car at the bottom landing. */}
      <rect x={ox + 6} y={lower - carH} width={w - 12} height={carH} fill="var(--card)" stroke="currentColor" strokeWidth="1.5" />
      <text x={ox + w / 2} y={lower - carH / 2} textAnchor="middle" dominantBaseline="middle" fill="currentColor" fontSize={FONT}>
        car
      </text>
      <Dim x1={right} y1={top} x2={right} y2={upper} text={`headroom ${headroom}`} />
      <Dim x1={right} y1={lower - carH} x2={right} y2={lower} text={`car ${carHeight}`} />
      <Dim x1={right} y1={lower} x2={right} y2={floor} text={`pit ${pit}`} />
      <text x={right + 6} y={upper + gap / 2 - 6} dominantBaseline="middle" fill="currentColor" fontSize={FONT} className="text-muted-foreground">
        <tspan x={right + 6}>travel {travel}</tspan>
        <tspan x={right + 6} dy={14}>{stops}</tspan>
      </text>
    </svg>
  );
}

export function LiftDrawing({ holds, id }: { holds: Held[]; id: string }) {
  const label = (name: string) => holds.find((h) => h.name === name)?.label;
  const value = (name: string) => holds.find((h) => h.name === name)?.value;
  const car = pair(label(SIZES.car));
  const shaft = pair(label(SIZES.shaft));
  const door = one(label(SIZES.door));
  const carHeight = one(label(SIZES.carHeight));
  const pit = one(label(SIZES.pit));
  const headroom = one(label(SIZES.headroom));
  const doorType = value(SIZES.doorType);
  if (!car || !shaft || !door || !carHeight || !pit || !headroom || !doorType) return null;
  return (
    <figure className="space-y-2">
      <div className="flex flex-wrap items-end gap-8">
        <Plan shaft={shaft} car={car} door={door} doorType={doorType} id={`${id}-plan`} />
        <Section
          pit={pit}
          carHeight={carHeight}
          headroom={headroom}
          travel={label(SIZES.travel) ?? ""}
          stops={label(SIZES.stops) ?? ""}
          depth={shaft[1]}
          id={`${id}-section`}
        />
      </div>
      <figcaption className="text-xs text-muted-foreground">
        Plan and section, in millimetres. Schematic: the travel is shown broken,
        and wall thickness is drawn, not quoted.
      </figcaption>
    </figure>
  );
}
