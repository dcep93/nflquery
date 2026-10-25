import { useState } from "react";
import type { PointType } from "./Query";
import QueryLineChart from "./QueryLineChart";

export type QueryOutput = {
  num_points: number;
  points: Array<PointType & { index?: number } & Record<string, unknown>>;
};

function isFormulaHeader(point: PointType & Record<string, unknown>) {
  const { x, y, label, index, ...extras } = point;
  return (
    x === "" &&
    label === "" &&
    y === Number.MAX_VALUE &&
    Object.keys(extras).length > 0
  );
}

export function buildQueryOutput(points: PointType[]): QueryOutput {
  let rank = 0;
  const displayed: QueryOutput["points"] = [];
  points.forEach((point) => {
    if (isFormulaHeader(point)) {
      displayed.push({ ...point, index: undefined });
    } else {
      rank += 1;
      if (rank <= 100) displayed.push({ ...point, index: rank });
    }
  });
  return { num_points: rank, points: displayed };
}

function SlowerComebacks({ points, deficit }: { points: PointType[]; deficit: number }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <details
      style={{ marginTop: "0.75rem" }}
      onToggle={(event) => setExpanded(event.currentTarget.open)}
    >
      <summary style={{ cursor: "pointer" }}>
        View {points.length} slower {points.length === 1 ? "comeback" : "comebacks"}
      </summary>
      {expanded && (
        <>
          <p>
            Other games overcoming at least {deficit} points, starting earlier on
            the game clock. Each game appears once.
          </p>
          <ol>
            {points.map((point, i) => (
              <li key={i} style={{ marginBottom: "0.75rem", overflowWrap: "anywhere" }}>
                <div><strong>{point.y}-point deficit:</strong> {point.x}</div>
                <div>{point.label}</div>
              </li>
            ))}
          </ol>
        </>
      )}
    </details>
  );
}

export default function QueryResults({ output }: { output: QueryOutput }) {
  const displayedResults = output.points.filter(
    (point) => !isFormulaHeader(point),
  ).length;
  return (
    <section
      aria-label="Query results"
      style={{ maxWidth: "70rem", margin: "1rem auto", textAlign: "left" }}
    >
      <p>
        <strong>
          {output.num_points.toLocaleString()}{" "}
          {output.num_points === 1 ? "result" : "results"}
        </strong>
        {displayedResults < output.num_points && (
          <span>
            {" — "}Showing {displayedResults.toLocaleString()} of{" "}
            {output.num_points.toLocaleString()}
          </span>
        )}
      </p>
      <QueryLineChart
        points={output.points.filter((point) => !isFormulaHeader(point))}
      />
      <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {output.points.map((point, position) => {
          const { x, y, label, index, slowerComebacks, ...extras } = point;
          const hasExtras = Object.keys(extras).length > 0;
          const formulaHeader = isFormulaHeader(point);

          return (
            <li
              key={position}
              style={{
                border: "1px solid #ccc",
                borderRadius: "0.4rem",
                padding: "1rem",
                marginBottom: "0.75rem",
              }}
            >
              {!formulaHeader && (
                <>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "baseline",
                      gap: "0.5rem 1.25rem",
                      overflowWrap: "anywhere",
                    }}
                  >
                    <small
                      aria-label={`Rank ${index}`}
                      style={{ color: "#555" }}
                    >
                      #{index}
                    </small>
                    {x !== "" && (
                      <span>
                        <strong>x:</strong> {x}
                      </span>
                    )}
                    <span>
                      <strong>y:</strong> {y}
                    </span>
                  </div>
                  {label !== "" && (
                    <p
                      style={{
                        margin: "0.75rem 0 0",
                        whiteSpace: "pre-wrap",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {label}
                    </p>
                  )}
                </>
              )}
              {!!slowerComebacks?.length && (
                <SlowerComebacks points={slowerComebacks} deficit={y} />
              )}
              {hasExtras && (
                <pre
                  style={{
                    margin: formulaHeader ? 0 : "0.75rem 0 0",
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                  }}
                >
                  {JSON.stringify(extras, null, 2)}
                </pre>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
