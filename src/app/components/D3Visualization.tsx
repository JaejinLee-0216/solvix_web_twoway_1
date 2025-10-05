"use client";

import {
  Dispatch,
  SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as d3 from "d3";

type SliderControl = {
  type: "slider";
  label: string;
  key?: string;
  min: number;
  max: number;
  step?: number;
  initial?: number;
  unit?: string;
};

type SelectControl = {
  type: "select";
  label: string;
  key?: string;
  options: { label: string; value: string | number }[];
  initial?: string | number;
};

type ToggleControl = {
  type: "toggle";
  label: string;
  key?: string;
  initial?: boolean;
};

type VisualizationControl = SliderControl | SelectControl | ToggleControl;

export type VisualizationData = {
  type: "graph" | "diagram" | "coordinate" | "chart" | "dynamic_d3";
  description?: string;
  width?: number;
  height?: number;
  data?: any;
  interactive?: boolean;
  controls?: VisualizationControl[];
  /**
   * LLM 이 생성한 D3 실행 코드. renderVisualization(...) 함수를 export 해야 한다.
   */
  d3Code?: string | string[];
};

type Props = {
  visualData: VisualizationData | null;
  width?: number;
  height?: number;
};

type ControlState = Record<string, number | string | boolean>;

type DynamicHelpers = {
  registerCleanup: (fn: () => void) => void;
  setError: (message: string) => void;
  setZoomLevel: (value: number) => void;
  clamp: (value: number, min: number, max: number) => number;
  toRadians: (deg: number) => number;
  toDegrees: (rad: number) => number;
  formatNumber: (value: number, digits?: number) => string;
  width: number;
  height: number;
  data: any;
  interactiveValues: ControlState;
};

export default function D3Visualization({
  visualData,
  width = 600,
  height = 400,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dynamicCleanupRef = useRef<(() => void) | null>(null);

  const [zoom, setZoom] = useState(1);
  const [isZoomed, setIsZoomed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [interactiveValues, setInteractiveValues] = useState<ControlState>({});
  const MAX_DISPLAY_HEIGHT = 360;

  const resolveControlKey = (control: VisualizationControl, index: number) => {
    if (control.key && control.key.trim().length > 0) return control.key.trim();
    return control.label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, "_")
      .replace(/^_+|_+$/g, "")
      .concat(`_${index}`);
  };

  useEffect(() => {
    if (!visualData?.controls || visualData.controls.length === 0) {
      setInteractiveValues({});
      return;
    }

    setInteractiveValues((prev) => {
      const next: ControlState = {};
      visualData.controls?.forEach((control, index) => {
        const key = resolveControlKey(control, index);

        if (Object.prototype.hasOwnProperty.call(prev, key)) {
          next[key] = prev[key];
          return;
        }

        if (control.type === "slider") {
          const initial = control.initial ?? control.min ?? 0;
          next[key] = typeof initial === "number" ? initial : Number(initial) || 0;
        } else if (control.type === "toggle") {
          const initial = control.initial ?? false;
          next[key] = typeof initial === "boolean" ? initial : Boolean(initial);
        } else if (control.type === "select") {
          if (control.initial !== undefined) {
            next[key] = control.initial;
          } else if (control.options.length > 0) {
            next[key] = control.options[0].value;
          } else {
            next[key] = "";
          }
        }
      });
      return next;
    });
  }, [visualData?.controls]);

  useEffect(() => {
    if (!visualData || visualData.type !== "dynamic_d3") return;
    if (!svgRef.current) return;

    const svgElement = svgRef.current;
    const svg = d3.select(svgElement);

    const renderWidth = visualData.width ?? width;
    const renderHeight = visualData.height ?? height;

    const executeDynamic = () => {
      if (dynamicCleanupRef.current) {
        try {
          dynamicCleanupRef.current();
        } catch (cleanupError) {
          console.warn("Dynamic cleanup failed:", cleanupError);
        }
        dynamicCleanupRef.current = null;
      }

      svg.selectAll("*").remove();
      setErrorMessage(null);

      svg
        .attr("width", renderWidth)
        .attr("height", renderHeight)
        .attr("viewBox", `0 0 ${renderWidth} ${renderHeight}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("transform", `scale(${zoom})`)
        .style("transform-origin", "center center")
        .style("border", "1px solid #ddd")
        .style("width", "100%")
        .style("height", "auto")
        .style("max-height", `${MAX_DISPLAY_HEIGHT}px`)
        .style("max-width", "100%");

      const cleanup = runDynamicD3(
        svg,
        visualData,
        renderWidth,
        renderHeight,
        interactiveValues,
        setErrorMessage,
        setZoom,
        setIsZoomed
      );

      if (typeof cleanup === "function") {
        dynamicCleanupRef.current = cleanup;
      }
    };

    executeDynamic();

    return () => {
      if (dynamicCleanupRef.current) {
        try {
          dynamicCleanupRef.current();
        } catch (cleanupError) {
          console.warn("Dynamic cleanup failed:", cleanupError);
        }
        dynamicCleanupRef.current = null;
      }
    };
  }, [visualData, width, height, zoom, interactiveValues]);

  useEffect(() => {
    if (!visualData || visualData.type === "dynamic_d3") return;
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    setErrorMessage(null);

    const renderWidth = visualData.width ?? width;
    const renderHeight = visualData.height ?? height;

    svg
      .attr("width", renderWidth)
      .attr("height", renderHeight)
      .attr("viewBox", `0 0 ${renderWidth} ${renderHeight}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .style("transform", `scale(${zoom})`)
      .style("transform-origin", "center center")
      .style("border", "1px solid #ddd")
      .style("width", "100%")
      .style("height", "auto")
      .style("max-height", `${MAX_DISPLAY_HEIGHT}px`)
      .style("max-width", "100%");

    if (!visualData.data) {
      svg
        .append("text")
        .attr("x", renderWidth / 2)
        .attr("y", renderHeight / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .attr("fill", "red")
        .text("시각화 데이터를 찾을 수 없습니다");
      setErrorMessage("시각화 데이터가 부족하여 렌더링할 수 없습니다.");
      return;
    }

    try {
      switch (visualData.type) {
        case "graph":
          renderGraph(svg, visualData.data, renderWidth, renderHeight);
          break;
        case "diagram":
          renderDiagram(svg, visualData.data);
          break;
        case "coordinate":
          renderCoordinate(svg, visualData.data, renderWidth, renderHeight);
          break;
        case "chart":
          renderChart(svg, visualData.data, renderWidth, renderHeight);
          break;
        default:
          svg
            .append("text")
            .attr("x", renderWidth / 2)
            .attr("y", renderHeight / 2)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .attr("fill", "red")
            .text(`지원되지 않는 타입: ${visualData.type}`);
          setErrorMessage(`지원되지 않는 시각화 타입입니다: ${visualData.type}`);
      }
    } catch (error: any) {
      console.error("Rendering error:", error);
      svg
        .append("text")
        .attr("x", renderWidth / 2)
        .attr("y", renderHeight / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .attr("fill", "red")
        .text("렌더링 오류 발생");
      setErrorMessage("시각화 렌더링 중 오류가 발생했습니다.");
    }
  }, [visualData, width, height, zoom]);

  const handleControlChange = (key: string, value: number | string | boolean) => {
    setInteractiveValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev * 1.5, 3));
    setIsZoomed(true);
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev / 1.5, 0.5));
    if (zoom <= 1.1) setIsZoomed(false);
  };

  const handleResetZoom = () => {
    setZoom(1);
    setIsZoomed(false);
  };

  const resolvedWidth = useMemo(
    () => Math.max(visualData?.width ?? width, 200),
    [visualData?.width, width]
  );

  const resolvedHeight = useMemo(
    () => Math.max(visualData?.height ?? height, 200),
    [visualData?.height, height]
  );

  return (
    <div className="my-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      {visualData?.description && (
        <p className="mb-3 text-sm text-gray-600">{visualData.description}</p>
      )}

      {errorMessage && (
        <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          {errorMessage}
        </div>
      )}

      {visualData?.controls && visualData.controls.length > 0 && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
          <h4 className="mb-2 text-sm font-semibold text-blue-800">인터랙티브 컨트롤</h4>
          <div className="space-y-3">
            {visualData.controls.map((control, index) => {
              const key = resolveControlKey(control, index);
              const value = interactiveValues[key];

              if (control.type === "slider") {
                const numericValue =
                  typeof value === "number"
                    ? value
                    : typeof value === "string"
                    ? Number(value) || 0
                    : Number(control.initial ?? control.min ?? 0);
                const decimals =
                  control.step && control.step < 1
                    ? Math.min(3, `${control.step}`.split(".")[1]?.length ?? 0)
                    : 0;
                return (
                  <div key={key} className="flex items-center gap-3">
                    <label className="min-w-[120px] text-sm font-medium text-gray-700">
                      {control.label}
                    </label>
                    <input
                      type="range"
                      min={control.min}
                      max={control.max}
                      step={control.step ?? 1}
                      value={numericValue}
                      onChange={(e) => handleControlChange(key, parseFloat(e.target.value))}
                      className="flex-1 cursor-pointer appearance-none rounded-lg bg-gray-200"
                    />
                    <span className="min-w-[60px] text-right text-sm font-mono text-gray-600">
                      {numericValue.toFixed(decimals)}{control.unit ?? ""}
                    </span>
                  </div>
                );
              }

              if (control.type === "select") {
                const rawCurrent = value ?? control.initial ?? control.options[0]?.value ?? "";
                const current: string | number = typeof rawCurrent === "number" ? rawCurrent : String(rawCurrent);
                return (
                  <div key={key} className="flex items-center gap-3">
                    <label className="min-w-[120px] text-sm font-medium text-gray-700">
                      {control.label}
                    </label>
                    <select
                      value={current}
                      onChange={(e) => handleControlChange(key, e.target.value)}
                      className="flex-1 rounded border border-blue-200 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      {control.options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }

              if (control.type === "toggle") {
                const boolValue = Boolean(value ?? control.initial ?? false);
                return (
                  <div key={key} className="flex items-center gap-3">
                    <label className="min-w-[120px] text-sm font-medium text-gray-700">
                      {control.label}
                    </label>
                    <button
                      type="button"
                      onClick={() => handleControlChange(key, !boolValue)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${boolValue ? "bg-blue-500" : "bg-gray-300"}`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${boolValue ? "translate-x-5" : "translate-x-1"}`}
                      />
                    </button>
                    <span className="text-sm text-gray-600">{boolValue ? "ON" : "OFF"}</span>
                  </div>
                );
              }

              return (
                <div key={key} className="text-xs text-red-500">
                  지원되지 않는 컨트롤 타입입니다.
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mb-3 flex items-center justify-center gap-2">
        <button
          onClick={handleZoomIn}
          className="flex items-center gap-1 rounded bg-blue-500 px-3 py-1.5 text-sm text-white shadow hover:bg-blue-600"
          disabled={zoom >= 3}
        >
          <ZoomIcon /> 확대
        </button>

        <button
          onClick={handleZoomOut}
          className="flex items-center gap-1 rounded bg-gray-500 px-3 py-1.5 text-sm text-white shadow hover:bg-gray-600"
          disabled={zoom <= 0.5}
        >
          <ZoomOutIcon /> 축소
        </button>

        {isZoomed && (
          <button
            onClick={handleResetZoom}
            className="flex items-center gap-1 rounded bg-green-500 px-3 py-1.5 text-sm text-white shadow hover:bg-green-600"
          >
            <ResetIcon /> 원래 크기
          </button>
        )}

        <span className="px-2 text-sm text-gray-600">{Math.round(zoom * 100)}%</span>
      </div>

      <div className="rounded border border-gray-200 bg-white p-2">
        <div className="relative w-full overflow-auto">
          <svg
            ref={svgRef}
            width={resolvedWidth}
            height={resolvedHeight}
            className="w-full max-h-[360px] min-h-[200px] transition-transform duration-200"
            preserveAspectRatio="xMidYMid meet"
          />
        </div>
      </div>
    </div>
  );
}

function renderGraph(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  data: any,
  width: number,
  height: number
) {
  if (!data || typeof data !== "object") {
    showErrorOnSvg(svg, width, height, "유효하지 않은 그래프 데이터 형식입니다.");
    return;
  }

  const { points = [], equation, domain = [-5, 5] } = data;

  if (!Array.isArray(domain) || domain.length !== 2 || domain.some((v) => typeof v !== "number")) {
    showErrorOnSvg(svg, width, height, "그래프 domain 값이 올바르지 않습니다.");
    return;
  }

  const margin = { top: 30, right: 30, bottom: 50, left: 60 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  if (!Array.isArray(points) || points.length < 2) {
    g
      .append("text")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .attr("fill", "#DC2626")
      .text("그래프 데이터가 부족합니다");
    return;
  }

  const sanitizedPoints = points.filter(
    (p: any) => typeof p?.x === "number" && Number.isFinite(p.x) && typeof p?.y === "number" && Number.isFinite(p.y)
  );

  if (sanitizedPoints.length < 2) {
    g
      .append("text")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .attr("fill", "#DC2626")
      .text("유효한 좌표가 없습니다");
    return;
  }

  const sortedPoints = [...sanitizedPoints].sort((a, b) => a.x - b.x);

  const xScale = d3.scaleLinear().domain(domain).range([0, innerWidth]).nice();
  const yExtent = d3.extent(sortedPoints, (d) => d.y as number) as [number, number];
  const [yMin, yMax] = yExtent;
  const padding = yMin != null && yMax != null ? Math.max((yMax - yMin) * 0.1, 0.5) : 1;

  const yScale = d3
    .scaleLinear()
    .domain([(yMin ?? -1) - padding, (yMax ?? 1) + padding])
    .range([innerHeight, 0])
    .nice();

  const gridColor = "#E5E7EB";

  g.append("g")
    .attr("class", "grid grid-x")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(xScale).ticks(10).tickSize(-innerHeight).tickFormat(() => ""))
    .selectAll("line")
    .attr("stroke", gridColor)
    .attr("stroke-opacity", 0.3);

  g.append("g")
    .attr("class", "grid grid-y")
    .call(d3.axisLeft(yScale).ticks(10).tickSize(-innerWidth).tickFormat(() => ""))
    .selectAll("line")
    .attr("stroke", gridColor)
    .attr("stroke-opacity", 0.3);

  g.append("g")
    .attr("class", "axis axis-x")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(xScale))
    .append("text")
    .attr("x", innerWidth)
    .attr("y", 35)
    .attr("fill", "#374151")
    .attr("text-anchor", "end")
    .style("font-size", "14px")
    .text("x");

  g.append("g")
    .attr("class", "axis axis-y")
    .call(d3.axisLeft(yScale))
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", 0)
    .attr("y", -40)
    .attr("fill", "#374151")
    .attr("text-anchor", "end")
    .style("font-size", "14px")
    .text("y");

  const line = d3
    .line<{ x: number; y: number }>()
    .x((d) => xScale(d.x))
    .y((d) => yScale(d.y))
    .curve(d3.curveMonotoneX);

  g.append("path")
    .datum(sortedPoints)
    .attr("fill", "none")
    .attr("stroke", "#2563EB")
    .attr("stroke-width", 3)
    .attr("stroke-linecap", "round")
    .attr("d", line);

  const specialPoints = sortedPoints.filter((p: any) => Boolean(p.label));

  if (specialPoints.length > 0) {
    g.selectAll(".special-point")
      .data(specialPoints)
      .enter()
      .append("circle")
      .attr("class", "special-point")
      .attr("cx", (d) => xScale(d.x))
      .attr("cy", (d) => yScale(d.y))
      .attr("r", 6)
      .attr("fill", "#EF4444")
      .attr("stroke", "white")
      .attr("stroke-width", 2);

    g.selectAll(".special-point-label")
      .data(specialPoints)
      .enter()
      .append("text")
      .attr("class", "special-point-label")
      .attr("x", (d) => xScale(d.x))
      .attr("y", (d) => yScale(d.y) - 10)
      .attr("text-anchor", "middle")
      .attr("fill", "#1F2937")
      .style("font-size", "12px")
      .style("font-weight", "600")
      .text((d: any) => d.label);
  }

  if (equation) {
    g.append("text")
      .attr("x", 10)
      .attr("y", 20)
      .attr("fill", "#2563EB")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .text(equation);
  }
}

function renderDiagram(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  data: any
) {
  const g = svg.append("g");
  const shapes: any[] = data?.shapes ?? [];

  shapes.forEach((shape) => {
    if (!shape?.type) return;

    switch (shape.type) {
      case "line":
        g.append("line")
          .attr("x1", shape.x1)
          .attr("y1", shape.y1)
          .attr("x2", shape.x2)
          .attr("y2", shape.y2)
          .attr("stroke", shape.stroke ?? "#111")
          .attr("stroke-width", shape.strokeWidth ?? 2)
          .attr("stroke-dasharray", shape.dasharray ?? null);
        break;
      case "rect":
        g.append("rect")
          .attr("x", shape.x)
          .attr("y", shape.y)
          .attr("width", shape.width)
          .attr("height", shape.height)
          .attr("rx", shape.rx ?? 0)
          .attr("ry", shape.ry ?? 0)
          .attr("fill", shape.fill ?? "transparent")
          .attr("stroke", shape.stroke ?? "#111")
          .attr("stroke-width", shape.strokeWidth ?? 2);
        break;
      case "circle":
        g.append("circle")
          .attr("cx", shape.cx)
          .attr("cy", shape.cy)
          .attr("r", shape.r)
          .attr("fill", shape.fill ?? "transparent")
          .attr("stroke", shape.stroke ?? "#111")
          .attr("stroke-width", shape.strokeWidth ?? 2);
        break;
      case "polygon":
        if (Array.isArray(shape.points)) {
          const path = d3.line()(shape.points.map((p: any) => [p[0], p[1]]));
          if (path) {
            g.append("path")
              .attr("d", `${path}Z`)
              .attr("fill", shape.fill ?? "transparent")
              .attr("stroke", shape.stroke ?? "#111")
              .attr("stroke-width", shape.strokeWidth ?? 2);
          }
        }
        break;
      case "text":
        g.append("text")
          .attr("x", shape.x)
          .attr("y", shape.y)
          .attr("fill", shape.fill ?? "#111")
          .style("font-size", shape.fontSize ?? "14px")
          .style("font-weight", shape.fontWeight ?? "normal")
          .text(shape.text ?? "");
        break;
      default:
        break;
    }
  });
}

function renderCoordinate(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  data: any,
  width: number,
  height: number
) {
  if (!data || typeof data !== "object") {
    showErrorOnSvg(svg, width, height, "유효하지 않은 좌표 데이터 형식입니다.");
    return;
  }

  const points: any[] = Array.isArray(data.points) ? data.points : [];
  const lines: any[] = Array.isArray(data.lines) ? data.lines : [];
  const vectors: any[] = Array.isArray(data.vectors) ? data.vectors : [];

  const vectorEntries = vectors.filter(
    (vector) =>
      typeof vector?.endX === "number" &&
      typeof vector?.endY === "number"
  );

  const margin = { top: 30, right: 30, bottom: 40, left: 50 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const xValues = [
    0,
    ...points.map((p) => p.x),
    ...lines.flatMap((l) => [l.x1, l.x2]),
    ...vectorEntries.flatMap((v) => [v.startX ?? 0, v.endX]),
  ].filter((v) => typeof v === "number" && Number.isFinite(v));

  const yValues = [
    0,
    ...points.map((p) => p.y),
    ...lines.flatMap((l) => [l.y1, l.y2]),
    ...vectorEntries.flatMap((v) => [v.startY ?? 0, v.endY]),
  ].filter((v) => typeof v === "number" && Number.isFinite(v));

  if (xValues.length === 0 || yValues.length === 0) {
    showErrorOnSvg(svg, width, height, "좌표 데이터를 계산할 수 없습니다.");
    return;
  }

  const xExtent = d3.extent(xValues as number[]) as [number, number];
  const yExtent = d3.extent(yValues as number[]) as [number, number];

  const xScale = d3
    .scaleLinear()
    .domain([(xExtent[0] ?? -5) - 1, (xExtent[1] ?? 5) + 1])
    .range([0, innerWidth]);

  const yScale = d3
    .scaleLinear()
    .domain([(yExtent[0] ?? -5) - 1, (yExtent[1] ?? 5) + 1])
    .range([innerHeight, 0]);

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  g.append("g")
    .attr("class", "grid grid-x")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(xScale).ticks(10).tickSize(-innerHeight).tickFormat(() => ""))
    .selectAll("line")
    .attr("stroke", "#E5E7EB")
    .attr("stroke-opacity", 0.3);

  g.append("g")
    .attr("class", "grid grid-y")
    .call(d3.axisLeft(yScale).ticks(10).tickSize(-innerWidth).tickFormat(() => ""))
    .selectAll("line")
    .attr("stroke", "#E5E7EB")
    .attr("stroke-opacity", 0.3);

  g.append("g")
    .attr("transform", `translate(0,${yScale(0)})`)
    .call(d3.axisBottom(xScale));

  g.append("g")
    .attr("transform", `translate(${xScale(0)},0)`)
    .call(d3.axisLeft(yScale));

  points.forEach((point) => {
    g.append("circle")
      .attr("cx", xScale(point.x))
      .attr("cy", yScale(point.y))
      .attr("r", 5)
      .attr("fill", point.color ?? "#2563EB");

    if (point.label) {
      g.append("text")
        .attr("x", xScale(point.x) + 6)
        .attr("y", yScale(point.y) - 6)
        .style("font-size", "12px")
        .attr("fill", "#1F2937")
        .text(point.label);
    }
  });

  lines.forEach((line) => {
    g.append("line")
      .attr("x1", xScale(line.x1))
      .attr("y1", yScale(line.y1))
      .attr("x2", xScale(line.x2))
      .attr("y2", yScale(line.y2))
      .attr("stroke", line.stroke ?? "#EF4444")
      .attr("stroke-width", line.strokeWidth ?? 2)
      .attr("stroke-dasharray", line.dasharray ?? null);
  });

  if (vectorEntries.length > 0) {
    let defs = svg.select<SVGDefsElement>("defs");
    if (defs.empty()) {
      defs = svg.append<SVGDefsElement>("defs");
    }

    const marker = defs.select<SVGMarkerElement>("#arrow-head");
    if (marker.empty()) {
      defs
        .append("marker")
        .attr("id", "arrow-head")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 8)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "currentColor");
    }

    vectorEntries.forEach((vector) => {
      g.append("line")
        .attr("x1", xScale(vector.startX ?? 0))
        .attr("y1", yScale(vector.startY ?? 0))
        .attr("x2", xScale(vector.endX))
        .attr("y2", yScale(vector.endY))
        .attr("stroke", vector.stroke ?? "#10B981")
        .attr("stroke-width", vector.strokeWidth ?? 2)
        .attr("marker-end", "url(#arrow-head)");
    });
  }
}

function renderChart(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  data: any,
  width: number,
  height: number
) {
  const chartType = data?.chartType ?? "bar";
  const values: number[] = data?.values ?? [];
  const labels: string[] = data?.labels ?? values.map((_, idx: number) => `${idx + 1}`);

  const margin = { top: 30, right: 30, bottom: 40, left: 50 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  if (chartType === "bar") {
    const xScale = d3.scaleBand().domain(labels).range([0, innerWidth]).padding(0.2);
    const yScale = d3.scaleLinear().domain([0, d3.max(values) ?? 0]).nice().range([innerHeight, 0]);

    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale));

    g.append("g").call(d3.axisLeft(yScale));

    g
      .selectAll("rect")
      .data(values)
      .enter()
      .append("rect")
      .attr("x", (_, i) => xScale(labels[i]) ?? 0)
      .attr("y", (d) => yScale(d))
      .attr("width", xScale.bandwidth())
      .attr("height", (d) => innerHeight - yScale(d))
      .attr("rx", 6)
      .attr("fill", "#2563EB");
    return;
  }

  if (chartType === "line") {
    const xScale = d3.scaleLinear().domain([0, labels.length - 1]).range([0, innerWidth]);
    const yScale = d3.scaleLinear().domain([0, d3.max(values) ?? 0]).nice().range([innerHeight, 0]);

    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).ticks(labels.length).tickFormat((d) => labels[d as number] ?? ""));

    g.append("g").call(d3.axisLeft(yScale));

    const line = d3
      .line<number>()
      .x((_, i) => xScale(i))
      .y((d) => yScale(d))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(values)
      .attr("fill", "none")
      .attr("stroke", "#F59E0B")
      .attr("stroke-width", 3)
      .attr("d", line);

    g
      .selectAll("circle")
      .data(values)
      .enter()
      .append("circle")
      .attr("cx", (_, i) => xScale(i))
      .attr("cy", (d) => yScale(d))
      .attr("r", 5)
      .attr("fill", "#F97316");
  }
}

function runDynamicD3(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  visualData: VisualizationData,
  width: number,
  height: number,
  interactiveValues: ControlState,
  setErrorMessage: (message: string | null) => void,
  setZoom: Dispatch<SetStateAction<number>>,
  setIsZoomed: Dispatch<SetStateAction<boolean>>
): (() => void) | undefined {
  const { d3Code, data } = visualData;

  if (!d3Code) {
    const message = "LLM에서 전달된 D3 코드가 없습니다.";
    showErrorOnSvg(svg, width, height, message);
    setErrorMessage(message);
    return undefined;
  }

  const code = Array.isArray(d3Code) ? d3Code.join("\n") : d3Code;
  if (!code || code.trim().length === 0) {
    const message = "빈 D3 코드가 전달되었습니다.";
    showErrorOnSvg(svg, width, height, message);
    setErrorMessage(message);
    return undefined;
  }

  const normalizedCode = normalizeD3Code(code);

  const cleanupFns: Array<() => void> = [];

  const reportError = (message: string) => {
    showErrorOnSvg(svg, width, height, message);
    setErrorMessage(message);
  };

  const helpers: DynamicHelpers = Object.freeze({
    registerCleanup: (fn: () => void) => {
      if (typeof fn === "function") cleanupFns.push(fn);
    },
    setError: reportError,
    setZoomLevel: (value: number) => {
      const safeValue = Number.isFinite(value) ? value : 1;
      setZoom(() => safeValue);
      setIsZoomed(safeValue !== 1);
    },
    clamp: (value: number, min: number, max: number) => Math.max(min, Math.min(max, value)),
    toRadians: (deg: number) => (deg * Math.PI) / 180,
    toDegrees: (rad: number) => (rad * 180) / Math.PI,
    formatNumber: (value: number, digits = 3) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed.toFixed(digits) : "0";
    },
    width,
    height,
    data: safeClone(data ?? {}),
    interactiveValues: safeClone(interactiveValues ?? {}),
  });

  try {
    const execution = structuredEvaluate(
      normalizedCode,
      {
        svg,
        d3,
        helpers,
        width,
        height,
        data: helpers.data,
        interactiveValues: helpers.interactiveValues,
      },
      reportError
    );

    if (!execution) {
      return undefined;
    }

    if (execution.error === "NO_RENDERER") {
      reportError("renderVisualization 함수가 정의되지 않았습니다.");
      return undefined;
    }

    if (typeof execution.output === "function") {
      cleanupFns.push(execution.output);
    } else if (
      execution.output &&
      typeof execution.output === "object" &&
      typeof (execution.output as { cleanup?: () => void }).cleanup === "function"
    ) {
      cleanupFns.push((execution.output as { cleanup: () => void }).cleanup);
    }
  } catch (error: any) {
    console.error("Dynamic D3 execution error:", error);
    const message = error?.message ?? "동적 시각화 실행 중 오류가 발생했습니다.";
    reportError(message);
    return undefined;
  }

  if (cleanupFns.length === 0) {
    return undefined;
  }

  return () => {
    cleanupFns.forEach((fn) => {
      try {
        fn();
      } catch (cleanupError) {
        console.warn("Dynamic D3 cleanup error:", cleanupError);
      }
    });
  };
}

function showErrorOnSvg(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  width: number,
  height: number,
  message: string
) {
  svg.selectAll("*").remove();
  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", height / 2)
    .attr("text-anchor", "middle")
    .attr("fill", "#DC2626")
    .style("font-size", "14px")
    .style("font-weight", "bold")
    .text(message);
}

function safeClone<T>(value: T): T {
  try {
    const globalAny = globalThis as any;
    if (typeof globalAny.structuredClone === "function") {
      return globalAny.structuredClone(value);
    }
  } catch (error) {
    console.warn("structuredClone failed, fallback to JSON clone", error);
  }

  if (value === undefined || value === null) {
    return value;
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

function createConsoleProxy() {
  const isProduction = typeof process !== "undefined" && process.env?.NODE_ENV === "production";
  const prefix = "[dynamic-d3]";
  return {
    log: (...args: unknown[]) => {
      if (!isProduction) console.log(prefix, ...args);
    },
    warn: (...args: unknown[]) => {
      if (!isProduction) console.warn(prefix, ...args);
    },
    error: (...args: unknown[]) => {
      console.error(prefix, ...args);
    },
  };
}

function normalizeD3Code(code: string): string {
  if (!code) return code;

  let normalized = code
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[‒–—―]/g, "-")
    .replace(/[‐‑‒–—−﹣－]/g, "-")
    .replace(/[   ]/g, " ")
    .replace(/\u2028|\u2029/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/\r/g, "\n");

  const replacementMap: Array<[RegExp, string]> = [
    [/(?:Θ|θ)/g, "theta"],
    [/(?:Π|π)/g, "pi"],
    [/√/g, "Math.sqrt"],
    [/∛/g, "Math.cbrt"],
    [/∞/g, "Infinity"],
    [/±/g, "+/-"],
    [/≤/g, "<="],
    [/≥/g, ">="],
    [/≠/g, "!="],
    [/≈/g, "~"],
    [/(?:→|⇒)/g, "->"],
    [/∠/g, "angle"],
    [/∑/g, "sum"],
    [/∏/g, "product"],
    [/⋅/g, "*"],
    [/·/g, "*"],
    [/⁰/g, "^0"],
    [/¹/g, "^1"],
    [/²/g, "^2"],
    [/³/g, "^3"],
    [/⁴/g, "^4"],
    [/⁵/g, "^5"],
    [/⁶/g, "^6"],
    [/⁷/g, "^7"],
    [/⁸/g, "^8"],
    [/⁹/g, "^9"],
  ];

  replacementMap.forEach(([pattern, replacement]) => {
    normalized = normalized.replace(pattern, replacement);
  });

  normalized = normalized.replace(/Math\.sqrtt/g, "Math.sqrt");

  normalized = escapeNewlinesInQuotedStrings(normalized);
  normalized = stripControlCharacters(normalized);
  normalized = enforceValidStrings(normalized);

  return normalized;
}

type EvalArgs = {
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  d3: typeof d3;
  helpers: DynamicHelpers;
  width: number;
  height: number;
  data: any;
  interactiveValues: ControlState;
};

type EvalResult = { output?: any; error?: string } | undefined;

function structuredEvaluate(code: string, args: EvalArgs, reportError: (message: string) => void): EvalResult {
  const consoleProxy = createConsoleProxy();
  const raf =
    typeof window !== "undefined" && window.requestAnimationFrame
      ? window.requestAnimationFrame.bind(window)
      : (callback: FrameRequestCallback) => setTimeout(() => callback(Date.now()), 16);
  const caf =
    typeof window !== "undefined" && window.cancelAnimationFrame
      ? window.cancelAnimationFrame.bind(window)
      : (handle: number) => clearTimeout(handle);

  const wrappedCode = `"use strict";
let module = { exports: {} };
let exports = module.exports;
let __renderResult = null;
let __renderFn = null;
${code}
if (typeof renderVisualization === "function") {
  __renderFn = renderVisualization;
} else if (exports && typeof exports.renderVisualization === "function") {
  __renderFn = exports.renderVisualization;
} else if (module && module.exports && typeof module.exports.renderVisualization === "function") {
  __renderFn = module.exports.renderVisualization;
}
if (!__renderFn && module && module.exports) {
  const keys = Object.keys(module.exports).filter((key) => typeof module.exports[key] === "function");
  if (keys.length === 1) {
    __renderFn = module.exports[keys[0]];
    module.exports.renderVisualization = __renderFn;
  }
}
if (!__renderFn) {
  return { error: "NO_RENDERER" };
}
__renderResult = __renderFn(svg, data, width, height, interactiveValues, helpers);
return { output: __renderResult };
`;

  try {
    const executor = new Function(
      "svg",
      "d3",
      "helpers",
      "width",
      "height",
      "data",
      "interactiveValues",
      "console",
      "requestAnimationFrame",
      "cancelAnimationFrame",
      wrappedCode
    );

    return executor(
      args.svg,
      args.d3,
      args.helpers,
      args.width,
      args.height,
      args.data,
      args.interactiveValues,
      consoleProxy,
      raf,
      caf
    );
  } catch (error: any) {
    console.error("Dynamic D3 syntax error:", error, code);
    reportError("시각화 코드 구문 오류: " + (error?.message ?? "알 수 없는 오류"));
    return undefined;
  }
}

function escapeNewlinesInQuotedStrings(code: string): string {
  let result = "";
  let inString = false;
  let quoteChar: '"' | "'" | null = null;
  let isEscaped = false;

  for (let i = 0; i < code.length; i += 1) {
    const char = code[i];

    if (isEscaped) {
      result += char;
      isEscaped = false;
      continue;
    }

    if (char === "\\") {
      isEscaped = true;
      result += char;
      continue;
    }

    if (inString) {
      if (char === quoteChar) {
        inString = false;
        quoteChar = null;
        result += char;
        continue;
      }

      if (char === "\r") {
        // Drop carriage returns inside strings
        continue;
      }

      if (char === "\n") {
        result += "\\n";
        continue;
      }

      result += char;
      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      quoteChar = char;
    }

    result += char;
  }

  return result;
}

function stripControlCharacters(code: string): string {
  return code.replace(/[\u0000-\u001F\u007F]/g, (char) => {
    if (char === "\n" || char === "\r" || char === "\t") {
      return char;
    }
    return "";
  });
}

function enforceValidStrings(code: string): string {
  let result = "";
  let inString = false;
  let quoteChar: '"' | "'" | null = null;
  let isEscaped = false;

  for (let i = 0; i < code.length; i++) {
    const char = code[i];

    if (isEscaped) {
      result += char;
      isEscaped = false;
      continue;
    }

    if (char === "\\") {
      isEscaped = true;
      result += char;
      continue;
    }

    if (inString) {
      if (char === quoteChar) {
        inString = false;
        quoteChar = null;
      }
      result += char;
      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      quoteChar = char;
    }

    result += char;
  }

  if (inString && quoteChar) {
    result += quoteChar;
  }

  return result;
}

function ZoomIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="6" />
      <path d="M20 20l-3-3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 8v6" strokeLinecap="round" />
      <path d="M8 11h6" strokeLinecap="round" />
    </svg>
  );
}

function ZoomOutIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="6" />
      <path d="M20 20l-3-3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 11h6" strokeLinecap="round" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        d="M3 12a9 9 0 0 1 9-9 9 9 0 0 1 7.89 4.57"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M21 3v6h-6" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-7.89-4.57"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M3 21v-6h6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}


