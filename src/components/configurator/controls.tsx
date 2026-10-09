"use client";

import {
  Building2Icon,
  CheckIcon,
  HomeIcon,
  HospitalIcon,
  HotelIcon,
  ShoppingBagIcon,
  TriangleAlertIcon,
  type LucideIcon,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { adds, kilos } from "./format";
import type { Option, Variable } from "./provider";

/**
 * Each variable's options, drawn as the control that fits what a person
 * does with them: compares magnitudes on a scale, sees a size to scale,
 * sees a finish, sees where a rail or a mirror goes, or reads a sentence.
 *
 * Every control is the same interaction under a different look: a button
 * per option, `aria-pressed` on the current one, which does nothing when
 * pressed again (`A11Y-DECISIONS.md`). A variable may be open, with no value
 * anyone chose, so nothing here has a resting position: a slider or a switch
 * would show a value that is not on record.
 *
 * Like `SIZES` in `drawing.tsx`, this knows some of the catalogue's
 * variable names and reads magnitudes from the option labels, the
 * catalogue's only statement of them. A variable it does not know is a row
 * of buttons, and a label that does not read as a number gives no picture.
 */

/** One option as every control presents it. */
export interface Choice {
  option: Option;
  /** The value now asked for. */
  current: boolean;
  /** Ruled out by the rules; picking it puts the conflict to the person. */
  conflicts: boolean;
  /** The catalogue's note, or why the option conflicts. */
  tip: string | null;
  /** The facets `Showing` has on: what the option adds to the price and the
   * carbon. */
  figures: { key: string; text: string }[];
  press: () => void;
}

export function choices(
  variable: Variable,
  pick: (option: Option) => void,
  shown: { price: boolean; carbon: boolean; currency: string },
): Choice[] {
  return variable.options.map((option) => {
    const current = option.id === variable.asked;
    const figures: Choice["figures"] = [];
    if (shown.price && option.capital !== null)
      figures.push({ key: "capital", text: adds(option.capital, shown.currency) });
    if (shown.price && option.monthly !== null)
      figures.push({ key: "monthly", text: `${adds(option.monthly, shown.currency)}/mo` });
    if (shown.carbon && option.carbon !== null)
      figures.push({
        key: "carbon",
        text: `${option.carbon < 0 ? "−" : "+"}${kilos(Math.abs(option.carbon))}`,
      });
    return {
      option,
      current,
      conflicts: !option.possible,
      tip: option.possible
        ? option.note
        : "Conflicts with what has been asserted so far. Picking it puts the conflict to you.",
      figures,
      press: () => current || pick(option),
    };
  });
}

/** The tick and the caution mark are for the eye; the words after the label
 * say the same to a screen reader. */
function Mark({ choice, className }: { choice: Choice; className?: string }) {
  if (choice.current) return <CheckIcon aria-hidden className={className} />;
  if (choice.conflicts)
    return <TriangleAlertIcon aria-hidden className={cn("text-caution", className)} />;
  return null;
}

function Said({ choice }: { choice: Choice }) {
  return choice.current ? (
    <span className="sr-only">, the current value</span>
  ) : choice.conflicts ? (
    <span className="sr-only">, conflicts with what has been asserted</span>
  ) : null;
}

function Figures({ choice, className }: { choice: Choice; className?: string }) {
  if (!choice.figures.length) return null;
  return (
    <span
      className={cn(
        "flex flex-wrap gap-x-1.5 font-normal tabular-nums text-muted-foreground",
        className,
      )}
    >
      {choice.figures.map((f) => (
        <span key={f.key}>{f.text}</span>
      ))}
    </span>
  );
}

/**
 * A label set as the catalogue wrote it, with what qualifies it — a
 * parenthesis, or what follows a slash — on a line of its own and muted.
 * The words are all still there in the order written, so the button's name
 * is the label, and only the line break and the weight are the eye's.
 */
function Label({ text, className }: { text: string; className?: string }) {
  const slash = text.indexOf(" / ");
  if (slash > 0)
    return (
      <span className={cn("flex flex-col", className)}>
        <span>{text.slice(0, slash)}</span>
        <span className="sr-only"> / </span>
        <span className="font-normal text-muted-foreground">{text.slice(slash + 3)}</span>
      </span>
    );
  const m = text.match(/^(.*?)\s*(\(.*\))$/);
  if (m)
    return (
      <span className={className}>
        {m[1]} <span className="font-normal text-muted-foreground">{m[2]}</span>
      </span>
    );
  return <span className={className}>{text}</span>;
}

/** An option's button with its tooltip, whatever it looks like. A conflict
 * is a dashed edge, never a disabled one. */
function Pick({
  choice,
  className,
  children,
}: {
  choice: Choice;
  className?: string;
  children: ReactNode;
}) {
  const button = (
    <Button
      variant="outline"
      size="xs"
      aria-pressed={choice.current}
      onClick={choice.press}
      className={cn(
        "relative h-auto py-1 font-normal",
        // The current option is ringed in the foreground, so a tile or a
        // bar reads as chosen at a glance and not only by its tick.
        "aria-pressed:border-foreground aria-pressed:bg-muted aria-pressed:font-medium",
        choice.conflicts && "border-dashed text-muted-foreground",
        className,
      )}
    >
      {children}
      <Said choice={choice} />
    </Button>
  );
  if (!choice.tip) return button;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent className="max-w-xs">{choice.tip}</TooltipContent>
    </Tooltip>
  );
}

// -- the controls --------------------------------------------------------------

/** The catalogue's own order, as buttons that wrap: for a variable this file
 * does not know. */
function Chips({ choices }: { choices: Choice[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {choices.map((c) => (
        <Pick key={c.option.id} choice={c}>
          <Mark choice={c} />
          {c.option.label}
          <Figures choice={c} className="inline-flex" />
        </Pick>
      ))}
    </div>
  );
}

/** What a step's label says it spans: one figure ("2100 mm"), a range
 * ("15–30 m", "Up to 15 m"), and for a load the persons it carries. */
interface Span {
  lo: number;
  hi: number;
  persons: number | null;
}

function span(label: string): Span | null {
  const persons = label.match(/(\d+)\s*persons/);
  const head = label.split(" / ")[0];
  const all = head.match(/\d+(?:\.\d+)?/g)?.map(Number);
  if (!all?.length) return null;
  const lo = /^up to/i.test(head) ? 0 : all[0];
  return { lo, hi: all.length > 1 ? all[1] : all[0], persons: persons ? Number(persons[1]) : null };
}

/**
 * How a quantity is pictured, in its own terms. A load is people, a speed a
 * dial, a travel a height in the building, stops its floors, a door width
 * an opening, a clear height or a pit a dimension line, a term years along
 * a line. One shape for all of them would say they were one kind of amount.
 */
type Glyph = "people" | "dial" | "rise" | "floors" | "opening" | "height" | "years";

const W = 64;
const H = 40;

function Picture({ glyph, at, top }: { glyph: Glyph; at: Span; top: Span }) {
  const k = (v: number) => (top.hi ? v / top.hi : 0);
  switch (glyph) {
    case "people": {
      // One figure per person the car is rated for, filled row by row.
      const n = at.persons ?? 0;
      const cols = 9;
      return (
        <>
          {Array.from({ length: n }, (_, i) => {
            const x = 2 + (i % cols) * 6.8;
            const y = H - 9 - Math.floor(i / cols) * 9.5;
            return (
              <g key={i} className="fill-current stroke-none">
                <circle cx={x + 2} cy={y + 1.6} r={1.6} />
                <rect x={x} y={y + 3.8} width={4} height={5} rx={1.5} />
              </g>
            );
          })}
        </>
      );
    }
    case "dial": {
      // A speedometer's half dial, the needle at the step's speed.
      const cx = W / 2;
      const cy = H - 4;
      const r = 26;
      const t = Math.PI * (1 - k(at.hi));
      const x = cx + r * Math.cos(t);
      const y = cy - r * Math.sin(t);
      return (
        <>
          <path d={`M${cx - r} ${cy}A${r} ${r} 0 0 1 ${cx + r} ${cy}`} className="fill-none opacity-30" strokeWidth={3} />
          <path d={`M${cx - r} ${cy}A${r} ${r} 0 0 1 ${x} ${y}`} className="fill-none" strokeWidth={3} />
          <line x1={cx} y1={cy} x2={cx + (r - 6) * Math.cos(t)} y2={cy - (r - 6) * Math.sin(t)} strokeWidth={1.5} />
          <circle cx={cx} cy={cy} r={2} className="stroke-none" />
        </>
      );
    }
    case "rise": {
      // The shaft's full height in outline, the step's range of travel in it.
      const y = (v: number) => H - 2 - k(v) * (H - 4);
      return (
        <>
          <rect x={W / 2 - 6} y={2} width={12} height={H - 4} className="fill-none opacity-40" />
          <rect x={W / 2 - 6} y={y(at.hi)} width={12} height={y(at.lo) - y(at.hi)} className="stroke-none" />
          <line x1={W / 2 - 14} x2={W / 2 + 14} y1={H - 2} y2={H - 2} />
        </>
      );
    }
    case "floors": {
      // A building as tall as the most stops the step allows, one line a
      // floor; the floors within the step's range are drawn solid.
      const h = k(at.hi) * (H - 4);
      const each = h / at.hi;
      return (
        <>
          <rect x={W / 2 - 10} y={H - 2 - h} width={20} height={h} className="fill-none" />
          {Array.from({ length: at.hi - 1 }, (_, i) => (
            <line
              key={i}
              x1={W / 2 - 10}
              x2={W / 2 + 10}
              y1={H - 2 - (i + 1) * each}
              y2={H - 2 - (i + 1) * each}
              strokeWidth={0.6}
              className={i + 2 < at.lo ? "opacity-30" : undefined}
            />
          ))}
          <line x1={W / 2 - 18} x2={W / 2 + 18} y1={H - 2} y2={H - 2} />
        </>
      );
    }
    case "opening": {
      // The clear opening between two jambs, to scale.
      const o = k(at.hi) * (W - 16);
      const l = (W - o) / 2;
      return (
        <>
          <rect x={l - 5} y={6} width={5} height={H - 8} className="stroke-none" />
          <rect x={l + o} y={6} width={5} height={H - 8} className="stroke-none" />
          <path d={`M${l + 2} ${H / 2 + 2}h${o - 4}m-3-3 3 3-3 3M${l + 2} ${H / 2 + 2}l3-3m-3 3 3 3`} className="fill-none" strokeWidth={0.8} />
        </>
      );
    }
    case "height": {
      // A dimension line from the floor, to scale against the tallest step.
      const h = k(at.hi) * (H - 4);
      return (
        <>
          <line x1={W / 2 - 12} x2={W / 2 + 12} y1={H - 2} y2={H - 2} />
          <line x1={W / 2 - 6} x2={W / 2 + 6} y1={H - 2 - h} y2={H - 2 - h} />
          <path d={`M${W / 2} ${H - 2}V${H - 2 - h}m-2 3 2-3 2 3M${W / 2 - 2} ${H - 5}l2 3 2-3`} className="fill-none" strokeWidth={0.8} />
        </>
      );
    }
    case "years": {
      // A year a tick along the longest term; the step's years drawn solid.
      const each = (W - 8) / top.hi;
      return (
        <>
          {Array.from({ length: top.hi }, (_, i) => (
            <rect
              key={i}
              x={4 + i * each + 0.5}
              y={(i + 1) % 5 ? 14 : 6}
              width={each - 1}
              height={(i + 1) % 5 ? 20 : 28}
              className={cn("stroke-none", i >= at.hi && "opacity-20")}
            />
          ))}
        </>
      );
    }
  }
}

/**
 * A quantity the catalogue offers in steps — a load, a speed, a height, a
 * term. What a person weighs is how much more one step is than another, and
 * what it costs, so each step is pictured to the same scale as its
 * neighbours, in the quantity's own terms, the step's figure under it. The
 * scales start from nothing: 2100 mm against 2400 mm is a small difference
 * and looks it.
 */
function Scale({ choices, glyph }: { choices: Choice[]; glyph: Glyph }) {
  const spans = choices.map((c) => span(c.option.label));
  const top: Span = {
    lo: 0,
    hi: Math.max(...spans.map((s) => s?.hi ?? 0)),
    persons: Math.max(...spans.map((s) => s?.persons ?? 0)),
  };
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(4.5rem,1fr))] gap-1">
      {choices.map((c, i) => {
        const at = spans[i];
        return (
          <Pick
            key={c.option.id}
            choice={c}
            className="flex-col items-stretch justify-start gap-1.5 px-1.5 pt-2 pb-1.5 text-left whitespace-normal"
          >
            {at && top.hi > 0 ? (
              <svg
                aria-hidden
                viewBox={`0 0 ${W} ${H}`}
                // `size-auto` keeps the button's own icon size off the drawing.
                className={cn(
                  "size-auto h-10 w-full fill-current stroke-current text-muted-foreground",
                  c.current && "text-foreground",
                )}
                strokeWidth={1}
                strokeDasharray={c.conflicts ? "2 1.5" : undefined}
              >
                <Picture glyph={glyph} at={at} top={top} />
              </svg>
            ) : null}
            <Label text={c.option.label} className="tabular-nums" />
            <Mark choice={c} className="absolute top-1 right-1" />
            <Figures choice={c} />
          </Pick>
        );
      })}
    </div>
  );
}

/** Width and depth, in millimetres, from "1600 × 1400 mm (wide)". */
function plan(label: string): [number, number] | null {
  const m = label.match(/^(\d+)\s*×\s*(\d+)\s*mm/);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

/**
 * A floor area: the car or the shaft, seen from above. Car sizes read as
 * pairs of numbers until they are drawn; drawn to one scale, a deep
 * stretcher car and a wide one are told apart at a glance, which is the
 * question a hospital or a goods lift is asked. The front, where the doors
 * are, is the lower edge, as in the drawing. Figures are set in the page's
 * type under the plan, not inside it, so they keep their size.
 */
function Plans({ choices }: { choices: Choice[] }) {
  const sizes = choices.map((c) => plan(c.option.label));
  const top = Math.max(...sizes.flatMap((s) => s ?? [0]));
  const BOX = 56;
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-1">
      {choices.map((c, i) => {
        const size = sizes[i];
        const w = size ? (size[0] / top) * BOX : 0;
        const d = size ? (size[1] / top) * BOX : 0;
        return (
          <Pick
            key={c.option.id}
            choice={c}
            className="flex-col items-stretch justify-start gap-1.5 p-2 text-left whitespace-normal"
          >
            {size ? (
              <svg
                aria-hidden
                viewBox={`0 0 ${BOX} ${BOX}`}
                // `size-auto` keeps the button's own icon size off the drawing.
                className="size-auto h-14 w-full overflow-visible"
              >
                <rect
                  x={(BOX - w) / 2}
                  y={BOX - d}
                  width={w}
                  height={d}
                  className={cn(
                    "fill-muted-foreground/15 stroke-muted-foreground",
                    c.current && "fill-foreground/20 stroke-foreground",
                  )}
                  strokeWidth={1}
                  strokeDasharray={c.conflicts ? "3 2" : undefined}
                  vectorEffect="non-scaling-stroke"
                />
                <line
                  x1={(BOX - w) / 2 + w * 0.25}
                  x2={(BOX - w) / 2 + w * 0.75}
                  y1={BOX}
                  y2={BOX}
                  className="stroke-foreground"
                  strokeWidth={2.5}
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            ) : null}
            <Label text={c.option.label} className="tabular-nums" />
            <Mark choice={c} className="absolute top-1 right-1" />
            <Figures choice={c} />
          </Pick>
        );
      })}
    </div>
  );
}

/**
 * A finish is chosen by how it looks, which its name says poorly: brushed
 * stainless and painted steel are both "steel". So each is a swatch, drawn
 * in greys like the rest of the canvas — a texture to tell them apart, not
 * a sample to match a colour to.
 */
const TEXTURES: Record<string, CSSProperties> = {
  painted: {
    background: "linear-gradient(160deg, #d4d4d8, #b4b4ba)",
  },
  brushed: {
    background:
      "linear-gradient(115deg, rgba(255,255,255,.45), transparent 45%, rgba(255,255,255,.25) 70%, transparent)," +
      "repeating-linear-gradient(90deg, rgba(0,0,0,.07) 0 1px, transparent 1px 3px, rgba(255,255,255,.3) 3px 4px, transparent 4px 6px), linear-gradient(160deg, #e4e4e7, #a1a1aa)",
  },
  glass: {
    background:
      "linear-gradient(135deg, rgba(255,255,255,.85) 0 18%, transparent 18% 30%, rgba(255,255,255,.5) 30% 36%, transparent 36%)," +
      "linear-gradient(180deg, #e4e4e7, #c8c8ce)",
  },
  laminate: {
    background:
      "repeating-linear-gradient(178deg, #a1a1aa 0 2px, #c4c4ca 2px 7px, #b0b0b6 7px 9px, #d0d0d5 9px 15px)",
  },
  rubber: {
    background:
      "radial-gradient(circle at 50% 50%, #71717a 0 2.5px, transparent 3px) 0 0 / 10px 10px, #3f3f46",
  },
  pvc: {
    background:
      "radial-gradient(circle, rgba(0,0,0,.18) 0 .6px, transparent 1px) 0 0 / 5px 5px, linear-gradient(160deg, #a1a1aa, #8b8b93)",
  },
  granite: {
    background:
      "radial-gradient(circle, #27272a 0 1px, transparent 1.4px) 0 0 / 13px 11px," +
      "radial-gradient(circle, #e4e4e7 0 .9px, transparent 1.3px) 5px 7px / 9px 14px," +
      "radial-gradient(circle, #3f3f46 0 1.3px, transparent 1.8px) 9px 2px / 17px 15px," +
      "radial-gradient(circle, #d4d4d8 0 1px, transparent 1.4px) 2px 10px / 23px 19px, #8b8b93",
  },
};

function texture(option: Option): CSSProperties | null {
  const id = option.id.split(":").pop() ?? "";
  if (id.includes("brushed")) return TEXTURES.brushed;
  if (id.includes("glass")) return TEXTURES.glass;
  if (id.includes("painted")) return TEXTURES.painted;
  return TEXTURES[id] ?? null;
}

function Swatches({ choices }: { choices: Choice[] }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-1">
      {choices.map((c) => {
        const look = texture(c.option);
        return (
          <Pick
            key={c.option.id}
            choice={c}
            className="flex-col items-stretch justify-start gap-1.5 p-1.5 text-left whitespace-normal"
          >
            {look ? (
              <span
                aria-hidden
                className={cn(
                  "relative block aspect-[4/3] w-full border border-border",
                  c.option.id.endsWith("glass") && "outline outline-4 -outline-offset-4 outline-zinc-500",
                  c.conflicts && "opacity-60",
                )}
                style={look}
              >
                <Mark
                  choice={c}
                  className="absolute top-1 right-1 size-4 bg-background p-0.5"
                />
              </span>
            ) : (
              <Mark choice={c} />
            )}
            <Label text={c.option.label} />
            <Figures choice={c} />
          </Pick>
        );
      })}
    </div>
  );
}

/**
 * Where something goes in the car is a question about a place, so the tile
 * draws the place: the doors seen from the landing, the car from above with
 * its rails, the rear wall with its mirror. Strokes only, in the current
 * colour, so a chosen tile and a conflicting one read like their buttons.
 */
const PICTURES: Record<string, Record<string, ReactNode>> = {
  door_type: {
    telescopic_2: (
      <>
        <rect x="4" y="4" width="40" height="32" className="fill-none" />
        <rect x="6" y="6" width="9" height="30" />
        <rect x="15" y="6" width="9" height="30" />
        <path d="M40 21H27m3-3-3 3 3 3" className="fill-none" />
      </>
    ),
    center_2: (
      <>
        <rect x="4" y="4" width="40" height="32" className="fill-none" />
        <rect x="6" y="6" width="8" height="30" />
        <rect x="34" y="6" width="8" height="30" />
        <path d="M22 21h-6m3-3-3 3 3 3M26 21h6m-3-3 3 3-3 3" className="fill-none" />
      </>
    ),
    center_4: (
      <>
        <rect x="4" y="4" width="40" height="32" className="fill-none" />
        <rect x="6" y="6" width="5" height="30" />
        <rect x="11" y="6" width="5" height="30" />
        <rect x="32" y="6" width="5" height="30" />
        <rect x="37" y="6" width="5" height="30" />
        <path d="M23 21h-4m2-2-2 2 2 2M25 21h4m-2-2 2 2-2 2" className="fill-none" />
      </>
    ),
  },
  handrail: {
    none: <path d="M8 4h32v32H30M18 36H8V4" className="fill-none" />,
    one_side: (
      <>
        <path d="M8 4h32v32H30M18 36H8V4" className="fill-none" />
        <path d="M36 9v22" strokeWidth={3} className="fill-none" />
      </>
    ),
    three_sides: (
      <>
        <path d="M8 4h32v32H30M18 36H8V4" className="fill-none" />
        <path d="M12 31V8h24v23" strokeWidth={3} className="fill-none" />
      </>
    ),
  },
  mirror: {
    none: <rect x="10" y="4" width="28" height="32" className="fill-none" />,
    half: (
      <>
        <rect x="10" y="4" width="28" height="32" className="fill-none" />
        <rect x="13" y="7" width="22" height="13" className="opacity-40" />
        <path d="M10 22h28" strokeDasharray="2 2" className="fill-none" />
      </>
    ),
    full: (
      <>
        <rect x="10" y="4" width="28" height="32" className="fill-none" />
        <rect x="13" y="7" width="22" height="26" className="opacity-40" />
      </>
    ),
  },
};

/** What kind of building, said with the icon a person recognises it by. */
const ICONS: Record<string, LucideIcon> = {
  residential: HomeIcon,
  office: Building2Icon,
  hotel: HotelIcon,
  hospital: HospitalIcon,
  retail: ShoppingBagIcon,
};

function Tiles({ choices, variable }: { choices: Choice[]; variable: string }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-1">
      {choices.map((c) => {
        const id = c.option.id.split(":").pop() ?? "";
        const picture = PICTURES[variable]?.[id];
        const Icon = variable === "building_type" ? ICONS[id] : undefined;
        return (
          <Pick
            key={c.option.id}
            choice={c}
            className="flex-col items-center justify-start gap-1.5 px-1.5 pt-3 pb-2 text-center whitespace-normal"
          >
            {picture ? (
              <svg
                aria-hidden
                viewBox="0 0 48 40"
                className={cn(
                  "size-auto h-10 w-12 fill-current stroke-current text-muted-foreground",
                  c.current && "text-foreground",
                )}
                strokeWidth={1.25}
                strokeLinecap="square"
                strokeDasharray={c.conflicts ? "3 2" : undefined}
              >
                {picture}
              </svg>
            ) : Icon ? (
              <Icon
                aria-hidden
                strokeWidth={1.25}
                className={cn("size-8 text-muted-foreground", c.current && "text-foreground")}
              />
            ) : null}
            <Label text={c.option.label} />
            <Figures choice={c} className="justify-center" />
            <Mark choice={c} className="absolute top-1 right-1" />
          </Pick>
        );
      })}
    </div>
  );
}

/**
 * A rating read the way the building trade reads one: the energy label's
 * stepped arrows, the better class the shorter. In greys, since colour on
 * the canvas says where the document stands (`docs/ui.md`), not how good
 * an option is.
 */
function Rating({ choices }: { choices: Choice[] }) {
  return (
    <ButtonGroup orientation="vertical" className="w-full max-w-sm">
      {choices.map((c, i) => (
        <Pick
          key={c.option.id}
          choice={c}
          className="justify-start gap-2 px-1.5 py-1"
        >
          <span
            className={cn(
              "flex h-6 items-center bg-muted-foreground/25 pr-4 pl-2 font-medium text-foreground",
              c.current && "bg-foreground text-background",
              c.conflicts && "border border-dashed border-muted-foreground bg-transparent",
            )}
            style={{
              width: `${34 + (i * 54) / Math.max(1, choices.length - 1)}%`,
              clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%)",
            }}
          >
            {c.option.label}
          </span>
          <Mark choice={c} />
          <Figures choice={c} className="ml-auto" />
        </Pick>
      ))}
    </ButtonGroup>
  );
}

/** A few short words, side by side as one control: the choice is one of a
 * pair or a small set, and all of it is read at once. */
function Segments({ choices }: { choices: Choice[] }) {
  return (
    <ButtonGroup className="w-full max-w-xl">
      {choices.map((c) => (
        <Pick
          key={c.option.id}
          choice={c}
          className="min-w-0 flex-1 flex-col items-start justify-start gap-0.5 px-2 py-1.5 text-left whitespace-normal"
        >
          <span className="flex w-full items-start gap-1">
            <Label text={c.option.label} />
            <Mark choice={c} className="mt-0.5 ml-auto" />
          </span>
          <Figures choice={c} />
        </Pick>
      ))}
    </ButtonGroup>
  );
}

/**
 * Options that are sentences — a service level, a way of rescuing a
 * passenger, who removes the old lift — are read one under another, each a
 * full line, with what it adds set against the right edge where the eye
 * runs down the figures.
 */
function List({ choices }: { choices: Choice[] }) {
  return (
    <ButtonGroup orientation="vertical" className="w-full">
      {choices.map((c) => (
        <Pick
          key={c.option.id}
          choice={c}
          className="w-full items-start justify-start gap-2 px-2 py-1.5 text-left whitespace-normal"
        >
          <span aria-hidden className="mt-0.5 flex size-3 shrink-0 items-center justify-center">
            {c.current || c.conflicts ? (
              <Mark choice={c} />
            ) : (
              <span className="size-2.5 rounded-full border border-muted-foreground" />
            )}
          </span>
          <Label text={c.option.label} className="min-w-0 flex-1" />
          <Figures choice={c} className="shrink-0 justify-end" />
        </Pick>
      ))}
    </ButtonGroup>
  );
}

// -- which control ---------------------------------------------------------------

type Kind = Glyph | "plan" | "swatch" | "tile" | "rating" | "segments" | "list";

const KINDS: Record<string, Kind> = {
  building_type: "tile",
  region: "segments",
  installation: "segments",
  accessibility: "list",
  rated_load: "people",
  rated_speed: "dial",
  travel: "rise",
  stops: "floors",
  platform: "list",
  drive: "list",
  energy_package: "list",
  energy_class: "rating",
  dispatch_control: "list",
  car_size: "plan",
  car_height: "height",
  shaft: "plan",
  pit_depth: "height",
  headroom: "height",
  door_type: "tile",
  door_width: "opening",
  door_finish: "swatch",
  fire_rating: "segments",
  rescue_operation: "list",
  firefighters_operation: "list",
  wall_finish: "swatch",
  floor: "swatch",
  cop: "list",
  mirror: "tile",
  handrail: "tile",
  access_control: "list",
  lead_time: "segments",
  existing_equipment: "list",
  site_hours: "list",
  service_level: "list",
  contract_term: "years",
  usage_profile: "segments",
  connectivity_package: "list",
  maintenance_scope: "list",
  maintainability: "list",
  end_of_life: "list",
};

export function Control({ variable, choices }: { variable: Variable; choices: Choice[] }) {
  const kind = KINDS[variable.name];
  const control =
    kind === "people" ||
    kind === "dial" ||
    kind === "rise" ||
    kind === "floors" ||
    kind === "opening" ||
    kind === "height" ||
    kind === "years" ? (
      <Scale choices={choices} glyph={kind} />
    ) : kind === "plan" ? (
      <Plans choices={choices} />
    ) : kind === "swatch" ? (
      <Swatches choices={choices} />
    ) : kind === "tile" ? (
      <Tiles choices={choices} variable={variable.name} />
    ) : kind === "rating" ? (
      <Rating choices={choices} />
    ) : kind === "segments" ? (
      <Segments choices={choices} />
    ) : kind === "list" ? (
      <List choices={choices} />
    ) : (
      <Chips choices={choices} />
    );
  return (
    <div role="group" aria-label={variable.heading} className="text-xs text-foreground">
      {control}
    </div>
  );
}
