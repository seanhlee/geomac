import {
  Circle,
  Clipboard,
  Download,
  FileDown,
  Minus,
  Plus,
  Slash,
  Shuffle,
  Square,
  Triangle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  BASE_PARAMS,
  INK,
  PAPER,
  createMarks,
  mulberry32,
  pick,
  round,
} from "./geometry";
import type { MarkInstance, MarkShape, Params, SystemMode } from "./geometry";

function App() {
  const [params, setParams] = useState<Params>(BASE_PARAMS);
  const [message, setMessage] = useState("ready");
  const svgRef = useRef<SVGSVGElement>(null);
  const marks = useMemo(() => createMarks(params), [params]);
  const innerVoid = (params.void / 100) * (params.dimension / 2);

  useEffect(() => {
    if (message === "ready") return;
    const timer = window.setTimeout(() => setMessage("ready"), 1800);
    return () => window.clearTimeout(timer);
  }, [message]);

  const updateParam = <K extends keyof Params>(key: K, value: Params[K]) => {
    setParams((current) => ({ ...current, [key]: value }));
  };

  const stepParam = (key: "levels" | "rotation" | "dimension", delta: number, min: number, max: number) => {
    setParams((current) => ({
      ...current,
      [key]: clamp(Number(current[key]) + delta, min, max),
    }));
  };

  const randomize = () => {
    const seed = nextSeed();
    const random = mulberry32(seed);
    const systems: SystemMode[] = ["glyph", "band", "field", "burst"];

    setParams((current) => ({
      ...current,
      system: pick(systems, random),
      count: Math.round(18 + random() * 58),
      levels: Math.round(1 + random() * 6),
      rotation: Math.round((-90 + random() * 180) / 15) * 15,
      void: Math.round(14 + random() * 20),
      spread: Math.round(58 + random() * 30),
      length: Math.round(10 + random() * 20),
      weight: Math.round(2 + random() * 5),
      taper: Math.round(12 + random() * 82),
      jitter: Math.round(random() * 8),
      drift: Math.round((-54 + random() * 108) / 6) * 6,
      smooth: Math.round(random() * 72),
      compound: random() > 0.78,
      seed,
    }));
    setMessage("new form");
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
          <span className="seed-label">#{params.seed}</span>
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
          {params.system === "burst" && innerVoid > 0 ? (
            <circle
              cx={params.dimension / 2}
              cy={params.dimension / 2}
              fill={PAPER}
              r={Math.max(0, innerVoid - params.dimension * 0.002)}
            />
          ) : null}
        </svg>
      </section>

      <section className="control-rail" aria-label="Controls">
        <IconSegmented
          label="Mark"
          onChange={(value) => updateParam("mark", value)}
          options={[
            ["slab", "Slab"],
            ["wedge", "Triangle"],
            ["pill", "Pill"],
            ["needle", "Needle"],
          ]}
          value={params.mark}
        />

        <Stepper
          label="Level"
          onDecrement={() => stepParam("levels", -1, 1, 7)}
          onIncrement={() => stepParam("levels", 1, 1, 7)}
          value={params.levels}
        />
        <Stepper
          label="Turn"
          onDecrement={() => stepParam("rotation", -15, -180, 180)}
          onIncrement={() => stepParam("rotation", 15, -180, 180)}
          suffix="deg"
          value={params.rotation}
        />
        <Stepper
          label="Size"
          onDecrement={() => stepParam("dimension", -128, 512, 1600)}
          onIncrement={() => stepParam("dimension", 128, 512, 1600)}
          suffix="px"
          value={params.dimension}
        />

        <div className="rail-actions" aria-label="Actions">
          <IconButton icon={<Shuffle />} label="Randomize" onClick={randomize} />
          <IconButton icon={<Clipboard />} label="Copy SVG" onClick={copySvg} />
          <IconButton icon={<FileDown />} label="Download SVG" onClick={downloadSvg} />
          <IconButton icon={<Download />} label="Download PNG" onClick={downloadPng} />
        </div>
      </section>
    </main>
  );
}

function IconSegmented<T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: T) => void;
  options: [T, string][];
  value: T;
}) {
  return (
    <div className="shape-control">
      <span className="sr-only">{label}</span>
      <div className="icon-segmented">
        {options.map(([optionValue, optionLabel]) => (
          <button
            aria-label={optionLabel}
            data-active={optionValue === value}
            key={optionValue}
            onClick={() => onChange(optionValue)}
            title={optionLabel}
            type="button"
          >
            {markIcon(optionValue)}
          </button>
        ))}
      </div>
    </div>
  );
}

function Stepper({
  label,
  onDecrement,
  onIncrement,
  suffix = "",
  value,
}: {
  label: string;
  onDecrement: () => void;
  onIncrement: () => void;
  suffix?: string;
  value: number;
}) {
  return (
    <div className="stepper" aria-label={label}>
      <span className="stepper-label">{label}</span>
      <div className="stepper-controls">
        <button aria-label={`Decrease ${label}`} onClick={onDecrement} title={`Decrease ${label}`} type="button">
          <Minus />
        </button>
        <output>
          {value}
          {suffix}
        </output>
        <button aria-label={`Increase ${label}`} onClick={onIncrement} title={`Increase ${label}`} type="button">
          <Plus />
        </button>
      </div>
    </div>
  );
}

function markIcon(shape: string) {
  if (shape === "slab") return <Square />;
  if (shape === "wedge") return <Triangle />;
  if (shape === "pill") return <Circle />;
  return <Slash />;
}

function IconButton({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button aria-label={label} className="icon-button" onClick={onClick} title={label} type="button">
      {icon}
    </button>
  );
}

function renderMark(mark: MarkInstance, shape: MarkShape) {
  const transform = `translate(${round(mark.x)} ${round(mark.y)}) rotate(${round(mark.angle)})`;
  const length = Math.max(1, mark.length);
  const width = Math.max(0.6, mark.width);
  const radius = (mark.smooth / 100) * (width / 2);
  const taper = mark.taper / 100;
  const innerWidth = width * (0.08 + (1 - taper) * 0.74);

  if (shape === "pill") {
    return (
      <rect
        height={round(width)}
        key={mark.id}
        opacity={mark.opacity}
        rx={round(width / 2)}
        transform={transform}
        width={round(length)}
        x={round(-length / 2)}
        y={round(-width / 2)}
      />
    );
  }

  if (shape === "slab") {
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

  if (shape === "wedge") {
    const nose = length / 2;
    const tail = -length / 2;
    const d = [
      `M ${round(tail)} ${round(-innerWidth / 2)}`,
      `L ${round(nose)} 0`,
      `L ${round(tail)} ${round(innerWidth / 2)}`,
      "Z",
    ].join(" ");

    return <path d={d} key={mark.id} opacity={mark.opacity} transform={transform} />;
  }

  const nose = length / 2;
  const tail = -length / 2;
  const d = [
    `M ${round(tail)} ${round(-innerWidth / 2)}`,
    `L ${round(nose)} ${round(-width / 2)}`,
    `Q ${round(nose + radius)} 0 ${round(nose)} ${round(width / 2)}`,
    `L ${round(tail)} ${round(innerWidth / 2)}`,
    `Q ${round(tail - radius * 0.5)} 0 ${round(tail)} ${round(-innerWidth / 2)}`,
    "Z",
  ].join(" ");

  return <path d={d} key={mark.id} opacity={mark.opacity} transform={transform} />;
}

function nextSeed() {
  return Math.floor(1000 + Math.random() * 8999);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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
