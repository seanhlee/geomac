export type RockForm = "monolith" | "shard" | "ridge" | "quarry";

export type Params = {
  form: RockForm;
  dimension: number;
  fracture: number;
  strata: number;
  erosion: number;
  grain: number;
  light: number;
  seed: number;
};

export type Point = {
  x: number;
  y: number;
};

export type RockFace = {
  id: string;
  points: Point[];
  fill: string;
};

export type RockStroke = {
  id: string;
  d: string;
  stroke: string;
  width: number;
  opacity: number;
};

export type GrainMark = {
  id: string;
  x: number;
  y: number;
  angle: number;
  length: number;
  width: number;
  opacity: number;
};

export type RockScene = {
  silhouette: string;
  shadow: string;
  baseFill: string;
  faces: RockFace[];
  strataLines: RockStroke[];
  cracks: RockStroke[];
  grains: GrainMark[];
};

export const PAPER = "#ede9e2";
export const INK = "#11110f";

const TAU = Math.PI * 2;

export const BASE_PARAMS: Params = {
  form: "monolith",
  dimension: 1024,
  fracture: 4,
  strata: 5,
  erosion: 4,
  grain: 5,
  light: 2,
  seed: 2908,
};

export function createRock(params: Params): RockScene {
  const random = mulberry32(params.seed);
  const dimension = params.dimension;
  const outer = roughenPolygon(getOuterShape(params.form), params.erosion, random);
  const silhouettePoints = outer.map((point) => scalePoint(point, dimension));
  const silhouette = pointsToPath(silhouettePoints);
  const shadow = createShadow(silhouettePoints, dimension);

  return {
    silhouette,
    shadow,
    baseFill: gray(0.48 + params.light * 0.025),
    faces: createFaces(params),
    strataLines: createStrata(params, random),
    cracks: createCracks(params, random),
    grains: createGrains(params, random),
  };
}

function getOuterShape(form: RockForm): Point[] {
  if (form === "shard") {
    return [
      { x: 0.5, y: 0.05 },
      { x: 0.63, y: 0.2 },
      { x: 0.72, y: 0.17 },
      { x: 0.82, y: 0.45 },
      { x: 0.77, y: 0.68 },
      { x: 0.88, y: 0.85 },
      { x: 0.61, y: 0.93 },
      { x: 0.42, y: 0.88 },
      { x: 0.24, y: 0.95 },
      { x: 0.13, y: 0.68 },
      { x: 0.19, y: 0.42 },
      { x: 0.32, y: 0.18 },
    ];
  }

  if (form === "ridge") {
    return [
      { x: 0.17, y: 0.46 },
      { x: 0.31, y: 0.23 },
      { x: 0.46, y: 0.18 },
      { x: 0.58, y: 0.25 },
      { x: 0.74, y: 0.27 },
      { x: 0.88, y: 0.55 },
      { x: 0.82, y: 0.74 },
      { x: 0.66, y: 0.84 },
      { x: 0.41, y: 0.87 },
      { x: 0.2, y: 0.75 },
      { x: 0.11, y: 0.62 },
    ];
  }

  if (form === "quarry") {
    return [
      { x: 0.27, y: 0.18 },
      { x: 0.48, y: 0.1 },
      { x: 0.56, y: 0.2 },
      { x: 0.73, y: 0.22 },
      { x: 0.74, y: 0.38 },
      { x: 0.83, y: 0.46 },
      { x: 0.86, y: 0.75 },
      { x: 0.7, y: 0.86 },
      { x: 0.52, y: 0.92 },
      { x: 0.31, y: 0.84 },
      { x: 0.18, y: 0.67 },
      { x: 0.19, y: 0.4 },
    ];
  }

  return [
    { x: 0.46, y: 0.06 },
    { x: 0.61, y: 0.17 },
    { x: 0.69, y: 0.18 },
    { x: 0.77, y: 0.31 },
    { x: 0.84, y: 0.58 },
    { x: 0.92, y: 0.77 },
    { x: 0.74, y: 0.87 },
    { x: 0.55, y: 0.94 },
    { x: 0.36, y: 0.88 },
    { x: 0.2, y: 0.76 },
    { x: 0.12, y: 0.58 },
    { x: 0.1, y: 0.45 },
    { x: 0.23, y: 0.26 },
    { x: 0.34, y: 0.16 },
  ];
}

function roughenPolygon(points: Point[], erosion: number, random: () => number): Point[] {
  const roughened: Point[] = [];
  const amount = 0.006 + erosion * 0.0045;

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    roughened.push(jitterPoint(current, amount * 0.55, random));

    if (erosion < 2) continue;

    const mid = {
      x: current.x + (next.x - current.x) * (0.42 + random() * 0.18),
      y: current.y + (next.y - current.y) * (0.42 + random() * 0.18),
    };
    const dx = next.x - current.x;
    const dy = next.y - current.y;
    const length = Math.hypot(dx, dy) || 1;
    const normal = { x: -dy / length, y: dx / length };
    const push = signed(random) * amount * (0.8 + random() * 1.2);

    roughened.push({
      x: clamp01(mid.x + normal.x * push),
      y: clamp01(mid.y + normal.y * push),
    });
  }

  return roughened;
}

function createFaces(params: Params): RockFace[] {
  const dimension = params.dimension;
  const light = params.light;
  const templates = getFaceTemplates(params.form);

  return templates.map((face, index) => ({
    id: `face-${index}`,
    points: face.points.map((point) => scalePoint(point, dimension)),
    fill: gray(face.tone + face.response * light * 0.055),
  }));
}

function getFaceTemplates(form: RockForm): Array<{ points: Point[]; tone: number; response: number }> {
  const common = [
    {
      tone: 0.25,
      response: -0.9,
      points: [
        { x: 0.09, y: 0.43 },
        { x: 0.24, y: 0.25 },
        { x: 0.44, y: 0.08 },
        { x: 0.39, y: 0.54 },
        { x: 0.28, y: 0.82 },
        { x: 0.13, y: 0.7 },
      ],
    },
    {
      tone: 0.72,
      response: 0.75,
      points: [
        { x: 0.34, y: 0.1 },
        { x: 0.53, y: 0.04 },
        { x: 0.66, y: 0.22 },
        { x: 0.47, y: 0.3 },
        { x: 0.33, y: 0.22 },
      ],
    },
    {
      tone: 0.42,
      response: 0.35,
      points: [
        { x: 0.38, y: 0.3 },
        { x: 0.54, y: 0.27 },
        { x: 0.55, y: 0.56 },
        { x: 0.4, y: 0.68 },
        { x: 0.35, y: 0.48 },
      ],
    },
    {
      tone: 0.18,
      response: -0.8,
      points: [
        { x: 0.43, y: 0.32 },
        { x: 0.58, y: 0.45 },
        { x: 0.44, y: 0.51 },
      ],
    },
    {
      tone: 0.58,
      response: 0.62,
      points: [
        { x: 0.53, y: 0.2 },
        { x: 0.78, y: 0.27 },
        { x: 0.88, y: 0.67 },
        { x: 0.62, y: 0.74 },
        { x: 0.52, y: 0.52 },
      ],
    },
    {
      tone: 0.68,
      response: 0.25,
      points: [
        { x: 0.41, y: 0.56 },
        { x: 0.62, y: 0.72 },
        { x: 0.74, y: 0.88 },
        { x: 0.47, y: 0.93 },
        { x: 0.27, y: 0.78 },
      ],
    },
    {
      tone: 0.12,
      response: -0.7,
      points: [
        { x: 0.55, y: 0.68 },
        { x: 0.88, y: 0.65 },
        { x: 0.8, y: 0.78 },
        { x: 0.56, y: 0.79 },
      ],
    },
    {
      tone: 0.34,
      response: -0.55,
      points: [
        { x: 0.13, y: 0.57 },
        { x: 0.31, y: 0.55 },
        { x: 0.28, y: 0.83 },
        { x: 0.13, y: 0.7 },
      ],
    },
  ];

  if (form === "ridge") {
    return common.map((face) => ({
      ...face,
      points: face.points.map((point) => ({ x: 0.5 + (point.x - 0.5) * 1.12, y: 0.17 + point.y * 0.76 })),
    }));
  }

  if (form === "shard") {
    return common.map((face) => ({
      ...face,
      points: face.points.map((point) => ({ x: 0.5 + (point.x - 0.5) * 0.82, y: point.y })),
    }));
  }

  if (form === "quarry") {
    return [
      ...common,
      {
        tone: 0.2,
        response: -0.85,
        points: [
          { x: 0.57, y: 0.2 },
          { x: 0.75, y: 0.22 },
          { x: 0.74, y: 0.38 },
          { x: 0.59, y: 0.42 },
        ],
      },
      {
        tone: 0.78,
        response: 0.7,
        points: [
          { x: 0.25, y: 0.18 },
          { x: 0.48, y: 0.1 },
          { x: 0.58, y: 0.21 },
          { x: 0.35, y: 0.28 },
        ],
      },
    ];
  }

  return common;
}

function createStrata(params: Params, random: () => number): RockStroke[] {
  const dimension = params.dimension;
  const lines: RockStroke[] = [];
  const count = params.strata * 6;
  const startY = dimension * 0.16;
  const endY = dimension * 0.84;

  for (let index = 0; index < count; index += 1) {
    const t = count <= 1 ? 0.5 : index / (count - 1);
    const y = startY + (endY - startY) * t + signed(random) * dimension * 0.01;
    const inset = dimension * (0.13 + random() * 0.12);
    const steps = 7;
    const points: Point[] = [];

    for (let step = 0; step <= steps; step += 1) {
      const p = step / steps;
      const wave = Math.sin((p + t) * TAU * 1.3 + params.seed * 0.01);
      points.push({
        x: inset + (dimension - inset * 2) * p,
        y: y + wave * dimension * (0.006 + params.erosion * 0.0018) + signed(random) * dimension * 0.004,
      });
    }

    lines.push({
      id: `strata-${index}`,
      d: smoothPath(points),
      stroke: index % 3 === 0 ? gray(0.86) : gray(0.18),
      width: dimension * (0.0014 + (index % 2) * 0.0009),
      opacity: index % 3 === 0 ? 0.26 : 0.18,
    });
  }

  return lines;
}

function createCracks(params: Params, random: () => number): RockStroke[] {
  const dimension = params.dimension;
  const cracks: RockStroke[] = [];
  const count = params.fracture * 7;

  for (let index = 0; index < count; index += 1) {
    const start = {
      x: dimension * (0.18 + random() * 0.64),
      y: dimension * (0.18 + random() * 0.64),
    };
    const angle = (params.light * -13 + signed(random) * 70 + (index % 4) * 28) * (Math.PI / 180);
    const length = dimension * (0.045 + random() * 0.14);
    const segments = 2 + Math.floor(random() * 3);
    const points: Point[] = [start];

    for (let segment = 1; segment <= segments; segment += 1) {
      const progress = segment / segments;
      points.push({
        x: start.x + Math.cos(angle) * length * progress + signed(random) * dimension * 0.018,
        y: start.y + Math.sin(angle) * length * progress + signed(random) * dimension * 0.018,
      });
    }

    cracks.push({
      id: `crack-${index}`,
      d: polylinePath(points),
      stroke: index % 5 === 0 ? gray(0.88) : INK,
      width: dimension * (0.0014 + random() * 0.0028),
      opacity: index % 5 === 0 ? 0.36 : 0.44,
    });
  }

  return cracks;
}

function createGrains(params: Params, random: () => number): GrainMark[] {
  const dimension = params.dimension;
  const grains: GrainMark[] = [];
  const count = params.grain * 110;

  for (let index = 0; index < count; index += 1) {
    grains.push({
      id: `grain-${index}`,
      x: dimension * (0.13 + random() * 0.74),
      y: dimension * (0.1 + random() * 0.82),
      angle: signed(random) * 24 + params.light * -3,
      length: dimension * (0.003 + random() * 0.022),
      width: dimension * (0.001 + random() * 0.0022),
      opacity: 0.1 + random() * 0.26,
    });
  }

  return grains;
}

function createShadow(points: Point[], dimension: number) {
  const bottom = points.filter((point) => point.y > dimension * 0.68);
  if (bottom.length < 2) return "";
  const lower = bottom.map((point) => ({ x: point.x + dimension * 0.02, y: point.y + dimension * 0.035 }));
  return pointsToPath(lower);
}

function scalePoint(point: Point, dimension: number): Point {
  return { x: point.x * dimension, y: point.y * dimension };
}

function jitterPoint(point: Point, amount: number, random: () => number): Point {
  return {
    x: clamp01(point.x + signed(random) * amount),
    y: clamp01(point.y + signed(random) * amount),
  };
}

function pointsToPath(points: Point[]) {
  return `${points.map((point, index) => `${index === 0 ? "M" : "L"} ${round(point.x)} ${round(point.y)}`).join(" ")} Z`;
}

function polylinePath(points: Point[]) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${round(point.x)} ${round(point.y)}`).join(" ");
}

function smoothPath(points: Point[]) {
  if (points.length < 2) return "";
  return points
    .map((point, index) => {
      if (index === 0) return `M ${round(point.x)} ${round(point.y)}`;
      const previous = points[index - 1];
      const cx = (previous.x + point.x) / 2;
      return `Q ${round(cx)} ${round(previous.y)} ${round(point.x)} ${round(point.y)}`;
    })
    .join(" ");
}

function gray(value: number) {
  const channel = Math.round(clamp(value, 0.06, 0.88) * 255);
  const hex = channel.toString(16).padStart(2, "0");
  return `#${hex}${hex}${hex}`;
}

function clamp01(value: number) {
  return clamp(value, 0, 1);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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
