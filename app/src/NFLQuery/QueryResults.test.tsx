import { renderToStaticMarkup } from "react-dom/server";
import QueryResults from "./QueryResults";
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
  const container = renderResults({
    num_points: 1,
    points: [{ index: 1, x: "", y: Number.MAX_VALUE, label: "", ...extras }],
  });
  const row = container.querySelector("li")!;

  expect(container.textContent).toContain("1 result");
  expect(row.textContent).toBe(JSON.stringify(extras, null, 2));
  expect(row.children).toHaveLength(1);
  expect(row.firstElementChild?.tagName).toBe("PRE");
});
