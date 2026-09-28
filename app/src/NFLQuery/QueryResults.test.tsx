import { renderToStaticMarkup } from "react-dom/server";
import QueryResults, { buildQueryOutput } from "./QueryResults";
import type { QueryOutput } from "./QueryResults";

function renderResults(output: QueryOutput) {
  const container = document.createElement("div");
  container.innerHTML = renderToStaticMarkup(<QueryResults output={output} />);
  return container;
}

test("separates standard fields from nested extra JSON and preserves result order", () => {
  const extras = {
    formula: "yards / attempts",
    details: { yards: 120, attempts: [3, 4] },
  };
  const container = renderResults({
    num_points: 12,
    points: [
      { index: 1, x: "First", y: 7, label: "First label", ...extras },
      { index: 2, x: "Second", y: 6, label: "Second label" },
    ],
  });

  expect(container.textContent).toContain("12 results — Showing 2 of 12");
  const rows = container.querySelectorAll("li");
  expect(rows[0].textContent).toContain("#1x: Firsty: 7First label");
  expect(rows[1].textContent).toContain("#2x: Secondy: 6Second label");
  expect(rows[0].querySelector("pre")?.textContent).toBe(
    JSON.stringify(extras, null, 2),
  );
  expect(rows[1].querySelector("pre")).toBeNull();
});

test("keeps literal newlines and escapes HTML in labels", () => {
  const label = "First line\n<script>alert('unsafe')</script>\nLast line";
  const container = renderResults({
    num_points: 1,
    points: [{ index: 1, x: "", y: 4, label }],
  });
  const renderedLabel = container.querySelector("li p") as HTMLParagraphElement;

  expect(renderedLabel.textContent).toBe(label);
  expect(renderedLabel.style.whiteSpace).toBe("pre-wrap");
  expect(renderedLabel.style.overflowWrap).toBe("anywhere");
  expect(container.querySelector("script")).toBeNull();
});

test("shows zero values and omits empty fields and unnecessary JSON", () => {
  const container = renderResults({
    num_points: 2,
    points: [
      { index: 1, x: 0, y: 0, label: "" },
      { index: 2, x: "", y: 0, label: "" },
    ],
  });
  const rows = container.querySelectorAll("li");

  expect(rows[0].textContent).toBe("#1x: 0y: 0");
  expect(rows[1].textContent).toBe("#2y: 0");
  expect(container.querySelector("pre")).toBeNull();
  expect(container.querySelector("li p")).toBeNull();
  expect(container.textContent).not.toContain("Showing");
});

test("renders a formula sorting header as extra JSON without its rank or sentinel", () => {
  const extras = { formula: "yards / attempts" };
  const container = renderResults(
    buildQueryOutput([{ x: "", y: Number.MAX_VALUE, label: "", ...extras }]),
  );
  const row = container.querySelector("li")!;

  expect(container.textContent).toContain("0 results");
  expect(row.textContent).toBe(JSON.stringify(extras, null, 2));
  expect(row.children).toHaveLength(1);
  expect(row.firstElementChild?.tagName).toBe("PRE");
});

test("formula headers do not consume ranks, result counts, or the 100-result limit", () => {
  const formula = { x: "", y: Number.MAX_VALUE, label: "", formula: "score" };
  const seasons = Array.from({ length: 101 }, (_, i) => ({
    x: 2026 - i,
    y: 101 - i,
    label: `Season ${i + 1}`,
  }));
  const output = buildQueryOutput([formula, ...seasons]);
  expect(output.num_points).toBe(101);
  expect(output.points).toHaveLength(101);
  expect(output.points[0].index).toBeUndefined();
  expect(output.points[1]).toEqual({ ...seasons[0], index: 1 });
  expect(output.points[100]).toEqual({ ...seasons[99], index: 100 });
  const container = renderResults(output);
  expect(container.textContent).toContain("101 results — Showing 100 of 101");
  expect(container.querySelectorAll("small")[0].textContent).toBe("#1");
  expect(container.querySelectorAll("small")[99].textContent).toBe("#100");
  expect(buildQueryOutput(seasons).points).toEqual(output.points.slice(1));
});
