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

export type RockPatch = {
  id: string;
  fill: string;
  points: Point[];
  opacity: number;
};

export type RockScene = {
  silhouette: string;
  shadow: string;
  baseFill: string;
  faces: RockFace[];
  surfacePatches: RockPatch[];
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
  const outer = roughenPolygon(getOuterShape(params.form), params.erosion + params.fracture * 0.22, random);
  const silhouettePoints = outer.map((point) => scalePoint(point, dimension));
  const silhouette = pointsToPath(silhouettePoints);
  const shadow = createShadow(silhouettePoints, dimension);
  const faces = createFaces(params);

  return {
    silhouette,
    shadow,
    baseFill: gray(0.48 + params.light * 0.025),
    faces,
    surfacePatches: createSurfacePatches(params, random),
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
  const chips = Math.min(4, Math.max(1, Math.floor((erosion + 1) / 2)));

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    roughened.push(jitterPoint(current, amount * 0.55, random));

    if (erosion < 2) continue;

    const dx = next.x - current.x;
    const dy = next.y - current.y;
    const length = Math.hypot(dx, dy) || 1;
    const normal = { x: -dy / length, y: dx / length };

    for (let chip = 1; chip <= chips; chip += 1) {
      const t = clamp((chip / (chips + 1)) + signed(random) * 0.045, 0.12, 0.88);
      const mid = {
        x: current.x + dx * t,
        y: current.y + dy * t,
      };
      const push = signed(random) * amount * (0.55 + random() * 1.15);

      roughened.push({
        x: clamp01(mid.x + normal.x * push),
        y: clamp01(mid.y + normal.y * push),
      });
    }
  }

  return roughened;
}

function createFaces(params: Params): RockFace[] {
  const dimension = params.dimension;
  const lightVector = getLightVector(params.light);
  const templates = getFaceTemplates(params.form);

  return templates.map((face, index) => {
    const centroid = getCentroid(face.points);
    const faceNormal = normalizeVector({ x: centroid.x - 0.51, y: centroid.y - 0.5 });
    const illumination = dot(faceNormal, lightVector);
    const altitude = (0.6 - centroid.y) * 0.045;
    const directedTone = face.tone + illumination * 0.115 + altitude + face.response * params.light * 0.022;

    return {
      id: `face-${index}`,
      points: face.points.map((point) => scalePoint(point, dimension)),
      fill: gray(directedTone),
    };
  });
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

function createSurfacePatches(params: Params, random: () => number): RockPatch[] {
  const dimension = params.dimension;
  const patches: RockPatch[] = [];
  const count = 8 + params.fracture * 3 + params.grain * 2;

  for (let index = 0; index < count; index += 1) {
    const cx = dimension * (0.15 + random() * 0.7);
    const cy = dimension * (0.12 + random() * 0.78);
    const radiusX = dimension * (0.008 + random() * 0.038);
    const radiusY = dimension * (0.004 + random() * 0.025);
    const sides = 3 + Math.floor(random() * 4);
    const angle = (signed(random) * 42 + params.light * -5) * (Math.PI / 180);
    const points: Point[] = [];

    for (let side = 0; side < sides; side += 1) {
      const t = (side / sides) * TAU + signed(random) * 0.28;
      const radius = 0.55 + random() * 0.72;
      const localX = Math.cos(t) * radiusX * radius;
      const localY = Math.sin(t) * radiusY * radius;

      points.push({
        x: cx + Math.cos(angle) * localX - Math.sin(angle) * localY,
        y: cy + Math.sin(angle) * localX + Math.cos(angle) * localY,
      });
    }

    const bright = random() > 0.76;
    patches.push({
      id: `surface-patch-${index}`,
      fill: bright ? gray(0.9) : gray(0.1 + random() * 0.28),
      points,
      opacity: bright ? 0.05 + random() * 0.08 : 0.055 + random() * 0.11,
    });
  }

  return patches;
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

function getCentroid(points: Point[]): Point {
  const total = points.reduce(
    (sum, point) => ({
      x: sum.x + point.x,
      y: sum.y + point.y,
    }),
    { x: 0, y: 0 },
  );

  return { x: total.x / points.length, y: total.y / points.length };
}

function getLightVector(light: number): Point {
  return normalizeVector({
    x: -0.72 + light * 0.12,
    y: -0.92,
  });
}

function normalizeVector(vector: Point): Point {
  const length = Math.hypot(vector.x, vector.y) || 1;
  return { x: vector.x / length, y: vector.y / length };
}

function dot(a: Point, b: Point) {
  return a.x * b.x + a.y * b.y;
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
