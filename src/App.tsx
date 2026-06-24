import { NumberField } from "@base-ui/react/number-field";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Toolbar } from "@base-ui/react/toolbar";
import {
  AlignJustify,
  Circle,
  Clipboard,
  Download,
  FileDown,
  Grid3X3,
  Layers,
  Minus,
  Orbit,
  Plus,
  Slash,
  Shuffle,
  Square,
  Triangle,
} from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { BASE_PARAMS, INK, PAPER, createMarks, getApertureRadius, round } from "./geometry";
import type { MarkInstance, MarkShape, Params, SystemMode } from "./geometry";

type Option<T extends string> = {
  icon: ReactNode;
  label: string;
  value: T;
};

const SYSTEM_OPTIONS: Option<SystemMode>[] = [
  { value: "radial", label: "Radial", icon: <Orbit /> },
  { value: "rail", label: "Rail", icon: <AlignJustify /> },
  { value: "stack", label: "Stack", icon: <Layers /> },
  { value: "field", label: "Field", icon: <Grid3X3 /> },
];

const MARK_OPTIONS: Option<MarkShape>[] = [
  { value: "block", label: "Block", icon: <Square /> },
  { value: "wedge", label: "Wedge", icon: <Triangle /> },
  { value: "dot", label: "Dot", icon: <Circle /> },
  { value: "line", label: "Line", icon: <Slash /> },
];

function App() {
  const [params, setParams] = useState<Params>(BASE_PARAMS);
  const [message, setMessage] = useState("ready");
  const svgRef = useRef<SVGSVGElement>(null);
  const marks = useMemo(() => createMarks(params), [params]);
  const apertureRadius = getApertureRadius(params);

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
    setMessage("mutated");
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
            {params.system} / #{params.seed}
          </span>
        </div>
        {message !== "ready" ? <span className="status-pill">{message}</span> : null}
      </header>

      <section className="viewport" aria-label="Generated vector">
        <svg
          aria-label="Geomac composition"
          className="composition"
          data-geomac="composition"
          ref={svgRef}
          role="img"
          viewBox={`0 0 ${params.dimension} ${params.dimension}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect fill={PAPER} height={params.dimension} width={params.dimension} />
          <g fill={INK}>{marks.map((mark) => renderMark(mark, params.mark))}</g>
          {apertureRadius > 0 ? (
            <circle cx={params.dimension / 2} cy={params.dimension / 2} fill={PAPER} r={apertureRadius} />
          ) : null}
        </svg>
      </section>

      <Toolbar.Root aria-label="Geomac controls" className="control-rail">
        <SegmentedControl
          label="System"
          onChange={(value) => updateParam("system", value)}
          options={SYSTEM_OPTIONS}
          value={params.system}
        />

        <SegmentedControl
          label="Mark"
          onChange={(value) => updateParam("mark", value)}
          options={MARK_OPTIONS}
          value={params.mark}
        />

        <NumberControl
          label="Level"
          max={7}
          min={1}
          onChange={(value) => updateParam("level", value)}
          step={1}
          value={params.level}
        />
        <NumberControl
          label="Phase"
          max={180}
          min={-180}
          onChange={(value) => updateParam("phase", value)}
          step={15}
          value={params.phase}
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

function renderMark(mark: MarkInstance, shape: MarkShape) {
  const transform = `translate(${round(mark.x)} ${round(mark.y)}) rotate(${round(mark.angle)})`;
  const length = Math.max(1, mark.length);
  const width = Math.max(0.6, mark.width);
  const radius = (mark.smooth / 100) * (width / 2);
  const taper = mark.taper / 100;
  const innerWidth = width * (0.18 + (1 - taper) * 0.68);

  if (shape === "dot") {
    const dotRadius = Math.max(width * 0.62, Math.min(length * 0.2, width * 1.08));
    return <circle key={mark.id} opacity={mark.opacity} r={round(dotRadius)} transform={transform} />;
  }

  if (shape === "line") {
    const lineWidth = Math.max(1, width * 0.28);
    return (
      <rect
        height={round(lineWidth)}
        key={mark.id}
        opacity={mark.opacity}
        transform={transform}
        width={round(length)}
        x={round(-length / 2)}
        y={round(-lineWidth / 2)}
      />
    );
  }

  if (shape === "block") {
    return (
      <rect
        height={round(width)}
        key={mark.id}
        opacity={mark.opacity}
        rx={round(radius)}
        transform={transform}
        width={round(length)}
        x={round(-length / 2)}
        y={round(-width / 2)}
      />
    );
  }

  const nose = length / 2;
  const tail = -length / 2;
  const d = [`M ${round(tail)} ${round(-innerWidth / 2)}`, `L ${round(nose)} 0`, `L ${round(tail)} ${round(innerWidth / 2)}`, "Z"].join(
    " ",
  );

  return <path d={d} key={mark.id} opacity={mark.opacity} transform={transform} />;
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
  return `geomac-${params.system}-${params.seed}.${extension}`;
}

export default App;
