import { NumberField } from "@base-ui/react/number-field";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Toolbar } from "@base-ui/react/toolbar";
import {
  Clipboard,
  Cuboid,
  Download,
  FileDown,
  Gem,
  Minus,
  Mountain,
  MountainSnow,
  Plus,
  Shuffle,
} from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { BASE_PARAMS, INK, PAPER, createRock, round } from "./geometry";
import type { GrainMark, Params, Point, RockFace, RockForm, RockPatch, RockStroke } from "./geometry";

type Option<T extends string> = {
  icon: ReactNode;
  label: string;
  value: T;
};

const FORM_OPTIONS: Option<RockForm>[] = [
  { value: "monolith", label: "Monolith", icon: <Mountain /> },
  { value: "shard", label: "Shard", icon: <Gem /> },
  { value: "ridge", label: "Ridge", icon: <MountainSnow /> },
  { value: "quarry", label: "Quarry", icon: <Cuboid /> },
];

function App() {
  const [params, setParams] = useState<Params>(BASE_PARAMS);
  const [message, setMessage] = useState("ready");
  const svgRef = useRef<SVGSVGElement>(null);
  const rock = useMemo(() => createRock(params), [params]);
  const clipId = `rock-clip-${params.form}-${params.seed}`;
  const lightId = `${clipId}-light`;
  const stoneTextureId = `${clipId}-stone-texture`;
  const dustTextureId = `${clipId}-dust-texture`;
  const reliefTextureId = `${clipId}-relief-texture`;
  const lightStartX = round(params.dimension * (0.14 + params.light * 0.025));
  const lightEndX = round(params.dimension * (0.86 - params.light * 0.018));
  const lightAzimuth = round(232 - params.light * 8);

  useEffect(() => {
    if (message === "ready") return;
    const timer = window.setTimeout(() => setMessage("ready"), 1800);
    return () => window.clearTimeout(timer);
  }, [message]);

  const updateParam = <K extends keyof Params>(key: K, value: Params[K]) => {
    setParams((current) => ({ ...current, [key]: value }));
  };

  const mutate = () => {
    setParams((current) => ({ ...current, seed: nextSeed(current.seed) }));
    setMessage("new rock");
  };

  const copySvg = async () => {
    try {
      await navigator.clipboard.writeText(getSvgText(svgRef.current));
      setMessage("copied");
    } catch {
      setMessage("copy failed");
    }
  };

  const downloadSvg = () => {
    const svgText = getSvgText(svgRef.current);
    const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
    downloadBlob(blob, fileName(params, "svg"));
    setMessage("svg saved");
  };

  const downloadPng = async () => {
    const svgText = getSvgText(svgRef.current);
    const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    try {
      const image = new Image();
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = reject;
        image.src = url;
      });

      const canvas = document.createElement("canvas");
      canvas.width = params.dimension;
      canvas.height = params.dimension;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas unavailable");

      context.fillStyle = PAPER;
      context.fillRect(0, 0, params.dimension, params.dimension);
      context.drawImage(image, 0, 0, params.dimension, params.dimension);

      const pngBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((nextBlob) => {
          if (nextBlob) resolve(nextBlob);
          else reject(new Error("PNG unavailable"));
        }, "image/png");
      });

      downloadBlob(pngBlob, fileName(params, "png"));
      setMessage("png saved");
    } catch {
      setMessage("png failed");
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  return (
    <main className="machine">
      <header className="machine-top">
        <div className="identity">
          <span className="wordmark">geomac</span>
          <span className="seed-label">
            {params.form} / #{params.seed}
          </span>
        </div>
        {message !== "ready" ? <span className="status-pill">{message}</span> : null}
      </header>

      <section className="viewport" aria-label="Generated rock">
        <svg
          aria-label="Geomac rock"
          className="composition rock-composition"
          data-geomac="rock"
          ref={svgRef}
          role="img"
          viewBox={`0 0 ${params.dimension} ${params.dimension}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <clipPath id={clipId}>
              <path d={rock.silhouette} />
            </clipPath>
            <linearGradient
              gradientUnits="userSpaceOnUse"
              id={lightId}
              x1={lightStartX}
              x2={lightEndX}
              y1={round(params.dimension * 0.02)}
              y2={round(params.dimension * 0.94)}
            >
              <stop offset="0" stopColor="#fffefa" stopOpacity="0.34" />
              <stop offset="0.46" stopColor="#d4d0c8" stopOpacity="0.02" />
              <stop offset="1" stopColor={INK} stopOpacity="0.24" />
            </linearGradient>
            <filter
              colorInterpolationFilters="sRGB"
              height="100%"
              id={stoneTextureId}
              width="100%"
              x="0"
              y="0"
            >
              <feTurbulence
                baseFrequency="0.018 0.12"
                numOctaves="5"
                result="stoneNoise"
                seed={params.seed}
                type="fractalNoise"
              />
              <feColorMatrix
                in="stoneNoise"
                result="stoneAlpha"
                type="matrix"
                values="0 0 0 0 0.055 0 0 0 0 0.055 0 0 0 0 0.055 0.48 0.48 0.48 0 -0.38"
              />
            </filter>
            <filter
              colorInterpolationFilters="sRGB"
              height="100%"
              id={dustTextureId}
              width="100%"
              x="0"
              y="0"
            >
              <feTurbulence
                baseFrequency="0.095 0.42"
                numOctaves="3"
                result="dustNoise"
                seed={params.seed + 71}
                type="fractalNoise"
              />
              <feColorMatrix
                in="dustNoise"
                result="dustAlpha"
                type="matrix"
                values="0 0 0 0 0.88 0 0 0 0 0.88 0 0 0 0 0.86 0.55 0.55 0.55 0 -0.6"
              />
            </filter>
            <filter
              colorInterpolationFilters="sRGB"
              height="100%"
              id={reliefTextureId}
              width="100%"
              x="0"
              y="0"
            >
              <feTurbulence
                baseFrequency="0.03 0.16"
                numOctaves="4"
                result="reliefHeight"
                seed={params.seed + 139}
                type="fractalNoise"
              />
              <feDiffuseLighting
                diffuseConstant="0.72"
                in="reliefHeight"
                lightingColor="#f8f6ef"
                result="reliefLight"
                surfaceScale="5"
              >
                <feDistantLight azimuth={lightAzimuth} elevation="38" />
              </feDiffuseLighting>
              <feColorMatrix in="reliefLight" result="reliefMono" type="saturate" values="0" />
            </filter>
          </defs>
          <rect fill={PAPER} height={params.dimension} width={params.dimension} />
          {rock.shadow ? <path d={rock.shadow} fill={INK} opacity="0.18" /> : null}
          <g clipPath={`url(#${clipId})`}>
            <path d={rock.silhouette} fill={rock.baseFill} />
            {rock.faces.map(renderFace)}
            <path d={rock.silhouette} fill={`url(#${lightId})`} />
            <rect
              filter={`url(#${stoneTextureId})`}
              height={params.dimension}
              opacity="0.32"
              style={{ mixBlendMode: "multiply" }}
              width={params.dimension}
            />
            <rect
              filter={`url(#${reliefTextureId})`}
              height={params.dimension}
              opacity="0.16"
              style={{ mixBlendMode: "overlay" }}
              width={params.dimension}
            />
            <rect
              filter={`url(#${dustTextureId})`}
              height={params.dimension}
              opacity="0.14"
              style={{ mixBlendMode: "screen" }}
              width={params.dimension}
            />
            <g style={{ mixBlendMode: "multiply" }}>{rock.surfacePatches.map(renderPatch)}</g>
            <g>{rock.strataLines.map(renderStroke)}</g>
            <g>{rock.edgeLines.map(renderStroke)}</g>
            <g>{rock.cracks.map(renderStroke)}</g>
            <g>{rock.grains.map(renderGrain)}</g>
            <path
              d={rock.silhouette}
              fill="none"
              opacity="0.09"
              stroke={INK}
              strokeLinejoin="round"
              strokeWidth={round(params.dimension * 0.003)}
            />
          </g>
        </svg>
      </section>

      <Toolbar.Root aria-label="Geomac controls" className="control-rail rock-rail">
        <SegmentedControl
          label="Form"
          onChange={(value) => updateParam("form", value)}
          options={FORM_OPTIONS}
          value={params.form}
        />

        <NumberControl
          label="Fracture"
          max={7}
          min={1}
          onChange={(value) => updateParam("fracture", value)}
          step={1}
          value={params.fracture}
        />
        <NumberControl
          label="Strata"
          max={7}
          min={0}
          onChange={(value) => updateParam("strata", value)}
          step={1}
          value={params.strata}
        />
        <NumberControl
          label="Erode"
          max={7}
          min={1}
          onChange={(value) => updateParam("erosion", value)}
          step={1}
          value={params.erosion}
        />
        <NumberControl
          label="Light"
          max={3}
          min={-3}
          onChange={(value) => updateParam("light", value)}
          step={1}
          value={params.light}
        />
        <NumberControl
          label="Grain"
          max={7}
          min={0}
          onChange={(value) => updateParam("grain", value)}
          step={1}
          value={params.grain}
        />
        <NumberControl
          label="Size"
          max={1600}
          min={512}
          onChange={(value) => updateParam("dimension", value)}
          step={128}
          value={params.dimension}
        />

        <Toolbar.Group aria-label="Actions" className="rail-actions">
          <RailButton icon={<Shuffle />} label="Mutate" onClick={mutate} />
          <RailButton icon={<Clipboard />} label="Copy SVG" onClick={copySvg} />
          <RailButton icon={<FileDown />} label="Download SVG" onClick={downloadSvg} />
          <RailButton icon={<Download />} label="Download PNG" onClick={downloadPng} />
        </Toolbar.Group>
      </Toolbar.Root>
    </main>
  );
}

function SegmentedControl<T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: T) => void;
  options: Option<T>[];
  value: T;
}) {
  return (
    <Toolbar.Group className="rail-group" aria-label={label}>
      <span className="rail-label">{label}</span>
      <ToggleGroup
        aria-label={label}
        className="toggle-set"
        onValueChange={(nextValue) => {
          const selected = nextValue[0];
          if (selected) onChange(selected as T);
        }}
        value={[value]}
      >
        {options.map((option) => (
          <Toggle
            aria-label={option.label}
            className="rail-toggle"
            key={option.value}
            title={option.label}
            value={option.value}
          >
            {option.icon}
          </Toggle>
        ))}
      </ToggleGroup>
    </Toolbar.Group>
  );
}

function NumberControl({
  label,
  max,
  min,
  onChange,
  step,
  value,
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step: number;
  value: number;
}) {
  const id = useId();

  return (
    <NumberField.Root
      className="number-control"
      max={max}
      min={min}
      onValueChange={(nextValue) => {
        if (nextValue == null) return;
        onChange(clampToStep(nextValue, min, max, step));
      }}
      snapOnStep
      step={step}
      value={value}
    >
      <label className="rail-label" htmlFor={id}>
        {label}
      </label>
      <NumberField.Group className="number-field">
        <NumberField.Decrement aria-label={`Decrease ${label}`} className="number-button" title={`Decrease ${label}`}>
          <Minus />
        </NumberField.Decrement>
        <NumberField.Input aria-label={label} className="number-input" id={id} />
        <NumberField.Increment aria-label={`Increase ${label}`} className="number-button" title={`Increase ${label}`}>
          <Plus />
        </NumberField.Increment>
      </NumberField.Group>
    </NumberField.Root>
  );
}

function RailButton({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <Toolbar.Button aria-label={label} className="icon-button" onClick={onClick} title={label} type="button">
      {icon}
    </Toolbar.Button>
  );
}

function renderFace(face: RockFace) {
  return <polygon fill={face.fill} key={face.id} points={pointList(face.points)} />;
}

function renderPatch(patch: RockPatch) {
  return <polygon fill={patch.fill} key={patch.id} opacity={patch.opacity} points={pointList(patch.points)} />;
}

function renderStroke(stroke: RockStroke) {
  return (
    <path
      d={stroke.d}
      fill="none"
      key={stroke.id}
      opacity={stroke.opacity}
      stroke={stroke.stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={round(stroke.width)}
    />
  );
}

function renderGrain(grain: GrainMark) {
  return (
    <rect
      fill={grain.fill}
      height={round(grain.width)}
      key={grain.id}
      opacity={grain.opacity}
      transform={`translate(${round(grain.x)} ${round(grain.y)}) rotate(${round(grain.angle)})`}
      width={round(grain.length)}
      x={round(-grain.length / 2)}
      y={round(-grain.width / 2)}
    />
  );
}

function pointList(points: Point[]) {
  return points.map((point) => `${round(point.x)},${round(point.y)}`).join(" ");
}

function nextSeed(currentSeed: number) {
  const next = Math.floor(1000 + Math.random() * 8999);
  return next === currentSeed ? ((next + 1 - 1000) % 9000) + 1000 : next;
}

function clampToStep(value: number, min: number, max: number, step: number) {
  const stepped = Math.round(value / step) * step;
  return Math.min(max, Math.max(min, stepped));
}

function getSvgText(svg: SVGSVGElement | null) {
  if (!svg) return "";
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", svg.viewBox.baseVal.width.toString());
  clone.setAttribute("height", svg.viewBox.baseVal.height.toString());
  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}`;
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function fileName(params: Params, extension: "png" | "svg") {
  return `geomac-rock-${params.form}-${params.seed}.${extension}`;
}

export default App;
