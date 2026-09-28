import { useEffect, useRef, useState } from "react";
import type { PointType } from "./Query";

export default function QueryLineChart({ points }: { points: PointType[] }) {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  const [selectedX, setSelectedX] = useState<number | null>(null);
  const data = points
    .filter(
      (point): point is PointType & { x: number } =>
        typeof point.x === "number" &&
        Number.isFinite(point.x) &&
        Number.isFinite(point.y),
    )
    .sort((a, b) => a.x - b.x);

  const hasLine = data.length > 1;
  useEffect(() => {
    const element = container.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.max(280, entry.contentRect.width));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [hasLine]);

  if (!hasLine) return null;
  const latest = data[data.length - 1];
  const selected = data.find((point) => point.x === selectedX) || latest;
  const minX = data[0].x;
  const maxX = latest.x;
  const minY = Math.min(0, ...data.map((point) => point.y));
  const maxY = Math.max(0, ...data.map((point) => point.y));
  const spanY = maxY - minY || 1;
  const bottom = 260;
  const top = 24;
  const left = 55;
  const right = width - 25;
  const px = (x: number) =>
    maxX === minX
      ? (left + right) / 2
      : left + ((x - minX) / (maxX - minX)) * (right - left);
  const py = (y: number) => bottom - ((y - minY) / spanY) * (bottom - top);
  const tickStride = Math.max(
    1,
    Math.ceil(data.length / Math.max(2, Math.floor((right - left) / 65))),
  );
  const format = (value: number) =>
    value.toLocaleString(undefined, { maximumFractionDigits: 3 });

  return (
    <figure
      style={{
        margin: "0 0 24px",
        padding: "16px",
        border: "1px solid #d5dce6",
        borderRadius: "8px",
        background: "#fff",
        color: "#172339",
      }}
    >
      <figcaption style={{ fontWeight: 600, marginBottom: "8px" }}>
        x vs y
      </figcaption>
      <div ref={container} style={{ width: "100%" }}>
        <svg
          viewBox={`0 0 ${width} 310`}
          width="100%"
          height="310"
          role="group"
          aria-label="Line chart of x versus y"
        >
          {Array.from({ length: 5 }, (_, i) => {
            const y = minY + (spanY * i) / 4;
            return (
              <g key={i}>
                <line
                  x1={left}
                  x2={right}
                  y1={py(y)}
                  y2={py(y)}
                  stroke="#e2e7ee"
                />
                <text
                  x={left - 10}
                  y={py(y) + 4}
                  textAnchor="end"
                  fontSize="12"
                  fill="#536176"
                >
                  {format(y)}
                </text>
              </g>
            );
          })}
          <text x="12" y="14" fontSize="12" fill="#536176">
            y
          </text>
          <text
            x={(left + right) / 2}
            y="306"
            textAnchor="middle"
            fontSize="12"
            fill="#536176"
          >
            x
          </text>
          {data.map(
            (point, i) =>
              (i % tickStride === 0 || i === data.length - 1) && (
                <text
                  key={i}
                  x={px(point.x)}
                  y="284"
                  textAnchor="middle"
                  fontSize="12"
                  fill="#536176"
                >
                  {point.x}
                </text>
              ),
          )}
          <polyline
            points={data
              .map((point) => `${px(point.x)},${py(point.y)}`)
              .join(" ")}
            fill="none"
            stroke="#3665b9"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {data.map((point, i) => (
            <g key={i}>
              <circle
                cx={px(point.x)}
                cy={py(point.y)}
                r={selected === point ? 7 : 4.5}
                fill={point === latest ? "#c14916" : "#3665b9"}
                stroke="white"
                strokeWidth="2"
              />
              <circle
                cx={px(point.x)}
                cy={py(point.y)}
                r="13"
                fill="transparent"
                tabIndex={0}
                role="button"
                aria-label={`x: ${point.x}, y: ${format(point.y)}`}
                aria-pressed={selected === point}
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setSelectedX(point.x)}
                onFocus={() => setSelectedX(point.x)}
                onClick={() => setSelectedX(point.x)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedX(point.x);
                  }
                }}
              >
                <title>{`${point.x}: ${format(point.y)}`}</title>
              </circle>
            </g>
          ))}
        </svg>
      </div>
      <div
        aria-label="Selected chart point"
        style={{ background: "#f3f6fa", borderRadius: "6px", padding: "12px" }}
      >
        <strong>
          {selected.x} · {format(selected.y)}
        </strong>
        {selected.label && (
          <div
            style={{
              maxHeight: "9rem",
              overflowY: "auto",
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
              marginTop: "8px",
              fontSize: "14px",
              lineHeight: 1.5,
            }}
          >
            {selected.label}
          </div>
        )}
      </div>
    </figure>
  );
}
