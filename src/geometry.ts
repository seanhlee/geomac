export type SystemMode = "glyph" | "burst" | "band" | "field";
export type MarkShape = "needle" | "pill" | "slab" | "wedge";

export type Params = {
  system: SystemMode;
  mark: MarkShape;
  dimension: number;
  count: number;
  levels: number;
  rotation: number;
  void: number;
  spread: number;
  length: number;
  weight: number;
  taper: number;
  jitter: number;
  drift: number;
  smooth: number;
  compound: boolean;
  seed: number;
};

export type MarkInstance = {
  id: string;
  x: number;
  y: number;
  angle: number;
  length: number;
  width: number;
  taper: number;
  smooth: number;
  opacity: number;
};

export type Preset = {
  name: string;
  params: Params;
};

export const PAPER = "#ede9e2";
export const INK = "#11110f";

const TAU = Math.PI * 2;

export const BASE_PARAMS: Params = {
  system: "burst",
  mark: "slab",
  dimension: 1024,
  count: 40,
  levels: 3,
  rotation: 0,
  void: 24,
  spread: 78,
  length: 28,
  weight: 2,
  taper: 18,
  jitter: 0,
  drift: 0,
  smooth: 0,
  compound: false,
  seed: 2908,
};

export const PRESETS: Preset[] = [
  {
    name: "Aperture",
    params: BASE_PARAMS,
  },
  {
    name: "Triptych",
    params: {
      ...BASE_PARAMS,
      system: "band",
      mark: "slab",
      count: 3,
      levels: 1,
      rotation: -90,
      void: 12,
      spread: 58,
      length: 12,
      weight: 2,
      taper: 38,
      jitter: 0,
      drift: 0,
      smooth: 4,
      seed: 6140,
    },
  },
  {
    name: "Signal",
    params: {
      ...BASE_PARAMS,
      system: "band",
      mark: "pill",
      count: 24,
      levels: 5,
      rotation: -12,
      void: 18,
      spread: 76,
      length: 18,
      weight: 4,
      taper: 50,
      jitter: 2,
      drift: 28,
      smooth: 96,
      compound: true,
      seed: 8242,
    },
  },
  {
    name: "Survey",
    params: {
      ...BASE_PARAMS,
      system: "field",
      mark: "wedge",
      count: 30,
      levels: 4,
      rotation: 0,
      void: 10,
      spread: 74,
      length: 14,
      weight: 5,
      taper: 82,
      jitter: 6,
      drift: 42,
      smooth: 12,
      seed: 1149,
    },
  },
];

export function createMarks(params: Params): MarkInstance[] {
  if (params.system === "glyph") return createGlyphMarks(params);
  if (params.system === "burst") return createBurstMarks(params);
  if (params.system === "band") return createBandMarks(params);
  return createFieldMarks(params);
}

function createGlyphMarks(params: Params): MarkInstance[] {
  const random = mulberry32(params.seed);
  const marks: MarkInstance[] = [];
  const dimension = params.dimension;
  const center = dimension / 2;
  const unit = dimension / 15;
  const span = Math.max(2, params.levels);
  const baseLength = unit * (1.08 + params.length / 120);
  const baseWidth = unit * (0.22 + params.weight / 80);
  const sideSpan = unit * (1.35 + span * 0.08);
  const height = unit * (3.4 + span * 0.36);
  const rows = span + 4;
  const irregularity = params.jitter / 60;

  const addLocal = (
    id: string,
    x: number,
    y: number,
    angle: number,
    lengthScale = 1,
    widthScale = 1,
    opacity = 1,
  ) => {
    const rotated = rotatePoint(x, y, params.rotation);
    marks.push({
      id,
      x: center + rotated.x,
      y: center + rotated.y,
      angle: angle + params.rotation,
      length: baseLength * lengthScale * (1 + signed(random) * 0.04 * irregularity),
      width: baseWidth * widthScale * (1 + signed(random) * 0.05 * irregularity),
      taper: params.taper,
      smooth: params.smooth,
      opacity,
    });
  };

  for (let row = 0; row < rows; row += 1) {
    const progress = rows === 1 ? 0.5 : row / (rows - 1);
    const t = progress * 2 - 1;
    const y = t * (height / 2);
    const shoulder = Math.sin(progress * Math.PI);
    const curve = sideSpan * (0.34 + shoulder * 0.66);
    const sideLength = 0.54 + shoulder * 0.34;

    addLocal(`g-left-${row}`, -curve, y, 90, sideLength, 0.74);
    addLocal(`g-right-${row}`, curve, y, 90, sideLength, 0.74);

    if (row % 2 === 0) {
      addLocal(`g-spine-${row}`, 0, y, 90, 0.64, 0.86);
    }

    if (span >= 4 && row % 3 === 1) {
      addLocal(`g-bridge-${row}`, 0, y, 0, 0.74, 0.52, 0.94);
    }
  }

  const capY = height / 2 + unit * 0.56;
  addLocal("g-top", 0, -capY, 0, 1.5, 0.78);
  addLocal("g-bottom", 0, capY, 0, 1.5, 0.78);

  if (span >= 5) {
    addLocal("g-axis-a", 0, -unit * 0.52, 0, 0.42, 0.5, 0.9);
    addLocal("g-axis-b", 0, unit * 0.52, 0, 0.42, 0.5, 0.9);
  }

  return marks;
}

function createBurstMarks(params: Params): MarkInstance[] {
  const marks: MarkInstance[] = [];
  const dimension = params.dimension;
  const center = dimension / 2;
  const half = dimension / 2;
  const inner = (params.void / 100) * half;
  const outer = (params.spread / 100) * half;
  const rayCount = Math.max(8, params.count);
  const baseWidth = Math.max(2, (params.weight / 100) * half);
  const rayLength = Math.max(1, outer - inner);
  const segmentLength = rayLength * (0.28 + params.levels * 0.035);
  const hairlineLength = rayLength * (0.62 + params.levels * 0.035);
  const phase = params.rotation;

  for (let index = 0; index < rayCount; index += 1) {
    const normalized = index / rayCount;
    const angle = normalized * 360 + phase;
    const wave = Math.sin(normalized * TAU * 3);
    const alternator = index % 4;
    const segmentOffset = rayLength * (0.28 + alternator * 0.055);
    const hairStart = inner + rayLength * 0.18;
    const segmentStart = inner + segmentOffset;
    const tickStart = inner + rayLength * (0.48 + ((index + 1) % 3) * 0.055);
    const widthScale = 1 + (index % 5) * 0.1;

    pushRadialMark(marks, {
      id: `hair-${index}`,
      center,
      angle,
      radius: hairStart + hairlineLength / 2,
      length: hairlineLength * (0.92 + wave * 0.04),
      width: baseWidth * 0.42,
      taper: 0,
      smooth: 0,
      opacity: 1,
    });

    pushRadialMark(marks, {
      id: `body-${index}`,
      center,
      angle,
      radius: segmentStart + segmentLength / 2,
      length: segmentLength * (0.96 + (alternator - 1.5) * 0.025),
      width: baseWidth * (1.58 + widthScale * 0.2),
      taper: params.taper,
      smooth: params.smooth,
      opacity: 1,
    });

    if (params.levels >= 2) {
      pushRadialMark(marks, {
        id: `tick-${index}`,
        center,
        angle,
        radius: tickStart,
        length: baseWidth * (1.7 + (index % 2) * 0.45),
        width: baseWidth * 0.82,
        taper: 0,
        smooth: 0,
        opacity: 1,
      });
    }

    if (params.levels >= 4 && index % 2 === 0) {
      const outerStart = inner + rayLength * 0.74;
      pushRadialMark(marks, {
        id: `outer-${index}`,
        center,
        angle,
        radius: outerStart + segmentLength * 0.18,
        length: segmentLength * 0.36,
        width: baseWidth * 1.04,
        taper: Math.max(0, params.taper - 8),
        smooth: params.smooth,
        opacity: 1,
      });
    }
  }

  return marks;
}

function pushRadialMark(
  marks: MarkInstance[],
  mark: {
    id: string;
    center: number;
    angle: number;
    radius: number;
    length: number;
    width: number;
    taper: number;
    smooth: number;
    opacity: number;
  },
) {
  const point = polarToPoint(mark.center, mark.center, mark.radius, mark.angle);
  marks.push({
    id: mark.id,
    x: point.x,
    y: point.y,
    angle: mark.angle,
    length: mark.length,
    width: mark.width,
    taper: mark.taper,
    smooth: mark.smooth,
    opacity: mark.opacity,
  });
}

function createBandMarks(params: Params): MarkInstance[] {
  const random = mulberry32(params.seed);
  const marks: MarkInstance[] = [];
  const dimension = params.dimension;
  const margin = dimension * 0.14;
  const usable = dimension - margin * 2;
  const baseLength = (params.length / 100) * (dimension / 2);
  const baseWidth = (params.weight / 100) * (dimension / 2);
  const rowGap = Math.max(baseWidth * 2.4, dimension * 0.052);
  const rows = params.levels;
  const irregularity = params.jitter / 60;

  for (let row = 0; row < rows; row += 1) {
    const rowOffset = (row - (rows - 1) / 2) * rowGap;
    const rowPhase = params.rotation + params.drift * (row / Math.max(1, rows - 1) - 0.5);

    for (let index = 0; index < params.count; index += 1) {
      const step = params.count === 1 ? 0.5 : index / (params.count - 1);
      const wave = Math.sin(step * TAU * (1.2 + rows * 0.18) + params.seed * 0.001 + row);
      const x = margin + usable * step + signed(random) * params.jitter * (dimension / 600);
      const y = dimension / 2 + rowOffset + wave * params.drift * (dimension / 1400);
      const localScale = 1 + Math.abs(wave) * 0.12 * irregularity + signed(random) * 0.18 * irregularity;

      marks.push({
        id: `m-${row}-${index}`,
        x,
        y,
        angle: rowPhase + wave * 22 + signed(random) * params.jitter * 0.75,
        length: baseLength * localScale,
        width: baseWidth * (1 + signed(random) * 0.12 * irregularity),
        taper: params.taper,
        smooth: params.smooth,
        opacity: 1 - random() * 0.12 * irregularity,
      });

      if (params.compound && index % 4 === 0) {
        marks.push({
          id: `mc-${row}-${index}`,
          x: x + baseLength * 0.18,
          y: y + baseWidth * 2.2,
          angle: rowPhase - 46 + wave * 12,
          length: baseLength * 0.28,
          width: baseWidth * 0.5,
          taper: params.taper,
          smooth: params.smooth,
          opacity: 0.58,
        });
      }
    }
  }

  return marks;
}

function createFieldMarks(params: Params): MarkInstance[] {
  const random = mulberry32(params.seed);
  const marks: MarkInstance[] = [];
  const dimension = params.dimension;
  const total = Math.max(1, params.count * params.levels);
  const columns = Math.max(1, Math.round(Math.sqrt(total * 1.12)));
  const rows = Math.max(1, Math.ceil(total / columns));
  const margin = dimension * (0.1 + params.void / 700);
  const cellWidth = columns === 1 ? 0 : (dimension - margin * 2) / (columns - 1);
  const cellHeight = rows === 1 ? 0 : (dimension - margin * 2) / (rows - 1);
  const baseLength = (params.length / 100) * (dimension / 2);
  const baseWidth = (params.weight / 100) * (dimension / 2);
  const irregularity = params.jitter / 60;

  for (let index = 0; index < total; index += 1) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const columnRatio = columns === 1 ? 0.5 : column / (columns - 1);
    const rowRatio = rows === 1 ? 0.5 : row / (rows - 1);
    const pulse = Math.sin((columnRatio + rowRatio) * TAU + params.seed * 0.001);
    const x = margin + column * cellWidth + signed(random) * params.jitter * (dimension / 650);
    const y = margin + row * cellHeight + signed(random) * params.jitter * (dimension / 650);

    marks.push({
      id: `f-${index}`,
      x,
      y,
      angle: params.rotation + (columnRatio - 0.5) * params.drift + pulse * 28,
      length: baseLength * (1 + signed(random) * 0.32 * irregularity),
      width: baseWidth * (1 + signed(random) * 0.18 * irregularity),
      taper: params.taper,
      smooth: params.smooth,
      opacity: 1 - random() * 0.14 * irregularity,
    });

    if (params.compound && random() > 0.74) {
      marks.push({
        id: `fc-${index}`,
        x: x + baseWidth * 2,
        y: y - baseWidth * 1.4,
        angle: params.rotation + 90 + pulse * 18,
        length: baseLength * 0.32,
        width: baseWidth * 0.46,
        taper: Math.max(0, params.taper - 18),
        smooth: params.smooth,
        opacity: 0.52,
      });
    }
  }

  return marks;
}

function polarToPoint(cx: number, cy: number, radius: number, angleDegrees: number) {
  const angle = (angleDegrees / 180) * Math.PI;
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius,
  };
}

function rotatePoint(x: number, y: number, angleDegrees: number) {
  const angle = (angleDegrees / 180) * Math.PI;
  return {
    x: x * Math.cos(angle) - y * Math.sin(angle),
    y: x * Math.sin(angle) + y * Math.cos(angle),
  };
}

export function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let next = state;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function signed(random: () => number) {
  return random() * 2 - 1;
}

export function pick<T>(items: T[], random: () => number) {
  return items[Math.floor(random() * items.length)] ?? items[0];
}

export function round(value: number) {
  return Math.round(value * 1000) / 1000;
}
