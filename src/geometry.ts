export type SystemMode = "radial" | "rail" | "stack" | "field";
export type MarkShape = "block" | "wedge" | "dot" | "line";

export type Params = {
  system: SystemMode;
  mark: MarkShape;
  dimension: number;
  level: number;
  phase: number;
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

export const PAPER = "#ede9e2";
export const INK = "#11110f";

const TAU = Math.PI * 2;

export const BASE_PARAMS: Params = {
  system: "radial",
  mark: "block",
  dimension: 1024,
  level: 3,
  phase: 0,
  seed: 2908,
};

export function createMarks(params: Params): MarkInstance[] {
  if (params.system === "radial") return createRadialMarks(params);
  if (params.system === "rail") return createRailMarks(params);
  if (params.system === "stack") return createStackMarks(params);
  return createFieldMarks(params);
}

export function getApertureRadius(params: Params) {
  if (params.system !== "radial") return 0;
  return params.dimension * (0.115 + params.level * 0.005);
}

function createRadialMarks(params: Params): MarkInstance[] {
  const random = mulberry32(params.seed);
  const marks: MarkInstance[] = [];
  const dimension = params.dimension;
  const center = dimension / 2;
  const half = dimension / 2;
  const count = 24 + params.level * 6;
  const inner = half * (0.22 + params.level * 0.012);
  const outer = half * Math.min(0.9, 0.76 + params.level * 0.026);
  const span = outer - inner;
  const baseWidth = dimension * (0.011 + params.level * 0.0012);
  const bodyLength = span * (0.24 + params.level * 0.028);
  const hairLength = span * (0.58 + params.level * 0.032);

  for (let index = 0; index < count; index += 1) {
    const t = index / count;
    const angle = t * 360 + params.phase;
    const variant = (index * 5 + params.seed) % 7;
    const wave = Math.sin(t * TAU * (2 + params.level * 0.5) + params.seed * 0.001);
    const offsetNoise = signed(random) * span * 0.018;
    const bodyStart = inner + span * (0.26 + variant * 0.032) + offsetNoise;
    const hairStart = inner + span * 0.18;

    pushRadialMark(marks, {
      id: `radial-hair-${index}`,
      center,
      angle,
      radius: hairStart + hairLength / 2,
      length: hairLength * (0.92 + wave * 0.035),
      width: baseWidth * 0.32,
      taper: 0,
      smooth: 0,
      opacity: 1,
    });

    pushRadialMark(marks, {
      id: `radial-body-${index}`,
      center,
      angle,
      radius: bodyStart + bodyLength / 2,
      length: bodyLength * (0.9 + (variant % 4) * 0.045),
      width: baseWidth * (1.45 + (variant % 3) * 0.18),
      taper: 14,
      smooth: params.mark === "dot" ? 100 : 0,
      opacity: 1,
    });

    if (params.level >= 2) {
      pushRadialMark(marks, {
        id: `radial-tick-${index}`,
        center,
        angle,
        radius: inner + span * (0.52 + (variant % 3) * 0.055),
        length: baseWidth * (1.65 + (index % 2) * 0.45),
        width: baseWidth * 0.72,
        taper: 0,
        smooth: 0,
        opacity: 1,
      });
    }

    if (params.level >= 5 && index % 3 === 0) {
      pushRadialMark(marks, {
        id: `radial-outer-${index}`,
        center,
        angle,
        radius: inner + span * 0.82,
        length: bodyLength * 0.32,
        width: baseWidth * 0.86,
        taper: 0,
        smooth: 0,
        opacity: 1,
      });
    }
  }

  return marks;
}

function createRailMarks(params: Params): MarkInstance[] {
  const marks: MarkInstance[] = [];
  const dimension = params.dimension;
  const margin = dimension * 0.15;
  const span = dimension - margin * 2;
  const rows = params.level + 1;
  const columns = 5 + params.level * 2;
  const rowGap = dimension * (0.072 - Math.min(4, params.level) * 0.004);
  const baseLength = dimension * (0.038 + params.level * 0.003);
  const baseWidth = dimension * (0.012 + params.level * 0.001);
  const phaseShift = (params.phase / 360) * (span / columns);
  const center = dimension / 2;

  for (let row = 0; row < rows; row += 1) {
    const y = center + (row - (rows - 1) / 2) * rowGap;
    const rowOffset = (row % 2 === 0 ? phaseShift : -phaseShift) + (row % 2) * (span / columns) * 0.48;
    const rowAngle = params.phase * 0.1 + (row - (rows - 1) / 2) * 2.8;

    for (let column = 0; column < columns; column += 1) {
      const t = columns === 1 ? 0.5 : column / (columns - 1);
      const pattern = (column + row * 2 + params.seed) % 6;
      const x = margin + t * span + rowOffset;
      const wrappedX = wrap(x, margin, dimension - margin);
      const pulse = Math.sin(t * TAU * 1.5 + row + params.seed * 0.001);

      marks.push({
        id: `rail-${row}-${column}`,
        x: wrappedX,
        y: y + pulse * dimension * 0.006,
        angle: rowAngle + pulse * 6,
        length: baseLength * (0.72 + pattern * 0.075),
        width: baseWidth * (0.82 + (pattern % 3) * 0.22),
        taper: 0,
        smooth: params.mark === "dot" ? 100 : 0,
        opacity: 1,
      });

      if (params.level >= 5 && column % 3 === row % 3) {
        marks.push({
          id: `rail-register-${row}-${column}`,
          x: wrappedX + baseLength * 0.18,
          y: y + baseWidth * 2.7,
          angle: rowAngle,
          length: baseLength * 0.28,
          width: baseWidth * 0.52,
          taper: 0,
          smooth: 0,
          opacity: 1,
        });
      }
    }
  }

  return marks;
}

function createStackMarks(params: Params): MarkInstance[] {
  const marks: MarkInstance[] = [];
  const dimension = params.dimension;
  const center = dimension / 2;
  const unit = dimension * (0.044 + params.level * 0.003);
  const count = params.level * 2 + 5;
  const baseWidth = dimension * (0.013 + params.level * 0.001);
  const height = unit * (count - 1);

  for (let index = 0; index < count; index += 1) {
    const t = count === 1 ? 0.5 : index / (count - 1);
    const local = t * 2 - 1;
    const y = center - height / 2 + index * unit;
    const shoulder = Math.sin(t * Math.PI);
    const length = unit * (1.1 + shoulder * (1.8 + params.level * 0.16));
    const angle = params.phase + (index % 2 === 0 ? 0 : 90);

    marks.push({
      id: `stack-spine-${index}`,
      x: center,
      y,
      angle,
      length,
      width: baseWidth * (1 + shoulder * 0.38),
      taper: 0,
      smooth: params.mark === "dot" ? 100 : 0,
      opacity: 1,
    });

    if (params.level >= 2 && index % 2 === 0) {
      const spread = unit * (0.72 + shoulder * 0.7);
      marks.push({
        id: `stack-left-${index}`,
        x: center - spread,
        y: y + local * unit * 0.08,
        angle: params.phase + 90,
        length: unit * (0.56 + shoulder * 0.52),
        width: baseWidth * 0.78,
        taper: 0,
        smooth: 0,
        opacity: 0.92,
      });
      marks.push({
        id: `stack-right-${index}`,
        x: center + spread,
        y: y - local * unit * 0.08,
        angle: params.phase + 90,
        length: unit * (0.56 + shoulder * 0.52),
        width: baseWidth * 0.78,
        taper: 0,
        smooth: 0,
        opacity: 0.92,
      });
    }
  }

  if (params.level >= 5) {
    const capLength = unit * (2.8 + params.level * 0.1);
    marks.push({
      id: "stack-cap-top",
      x: center,
      y: center - height / 2 - unit * 0.72,
      angle: params.phase,
      length: capLength,
      width: baseWidth * 0.72,
      taper: 0,
      smooth: 0,
      opacity: 1,
    });
    marks.push({
      id: "stack-cap-bottom",
      x: center,
      y: center + height / 2 + unit * 0.72,
      angle: params.phase,
      length: capLength,
      width: baseWidth * 0.72,
      taper: 0,
      smooth: 0,
      opacity: 1,
    });
  }

  return marks;
}

function createFieldMarks(params: Params): MarkInstance[] {
  const random = mulberry32(params.seed);
  const marks: MarkInstance[] = [];
  const dimension = params.dimension;
  const columns = params.level + 4;
  const rows = params.level + 3;
  const margin = dimension * 0.16;
  const cellWidth = (dimension - margin * 2) / Math.max(1, columns - 1);
  const cellHeight = (dimension - margin * 2) / Math.max(1, rows - 1);
  const baseLength = dimension * (0.042 + params.level * 0.004);
  const baseWidth = dimension * (0.011 + params.level * 0.001);

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column;
      const gate = (index + params.seed + row * 3) % 8;
      if (params.level < 3 && gate === 0) continue;

      const columnRatio = columns === 1 ? 0.5 : column / (columns - 1);
      const rowRatio = rows === 1 ? 0.5 : row / (rows - 1);
      const drift = Math.sin((columnRatio - rowRatio) * TAU + params.seed * 0.001);
      const x = margin + column * cellWidth + signed(random) * dimension * 0.006;
      const y = margin + row * cellHeight + signed(random) * dimension * 0.006;

      marks.push({
        id: `field-${row}-${column}`,
        x,
        y,
        angle: params.phase + (column - row) * 5 + drift * 9,
        length: baseLength * (0.72 + gate * 0.06),
        width: baseWidth * (0.76 + (gate % 4) * 0.16),
        taper: 0,
        smooth: params.mark === "dot" ? 100 : 0,
        opacity: 1,
      });

      if (params.level >= 6 && gate > 4) {
        marks.push({
          id: `field-secondary-${row}-${column}`,
          x: x + baseLength * 0.32,
          y: y - baseWidth * 2.1,
          angle: params.phase + 90 + drift * 6,
          length: baseLength * 0.36,
          width: baseWidth * 0.54,
          taper: 0,
          smooth: 0,
          opacity: 1,
        });
      }
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

function polarToPoint(cx: number, cy: number, radius: number, angleDegrees: number) {
  const angle = (angleDegrees / 180) * Math.PI;
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius,
  };
}

function wrap(value: number, min: number, max: number) {
  const range = max - min;
  return ((((value - min) % range) + range) % range) + min;
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

export function round(value: number) {
  return Math.round(value * 1000) / 1000;
}
