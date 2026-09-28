import type { PointType } from "./Query";

export type QueryOutput = {
  num_points: number;
  points: Array<PointType & { index: number } & Record<string, unknown>>;
};

export default function QueryResults({ output }: { output: QueryOutput }) {
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
        {output.points.length < output.num_points && (
          <span>
            {" — "}Showing {output.points.length.toLocaleString()} of{" "}
            {output.num_points.toLocaleString()}
          </span>
        )}
      </p>
      <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {output.points.map((point) => {
          const { x, y, label, index, ...extras } = point;
          const hasExtras = Object.keys(extras).length > 0;
          const isFormulaHeader =
            x === "" && label === "" && y === Number.MAX_VALUE && hasExtras;

          return (
            <li
              key={index}
              style={{
                border: "1px solid #ccc",
                borderRadius: "0.4rem",
                padding: "1rem",
                marginBottom: "0.75rem",
              }}
            >
              {!isFormulaHeader && (
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
              {hasExtras && (
                <pre
                  style={{
                    margin: isFormulaHeader ? 0 : "0.75rem 0 0",
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
