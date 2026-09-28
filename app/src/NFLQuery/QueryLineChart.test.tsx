import { fireEvent, render, screen } from "@testing-library/react";
import QueryResults, { buildQueryOutput } from "./QueryResults";
import QueryLineChart from "./QueryLineChart";

const points = [
  { x: 2020, y: 50.558, label: "First player\nSecond player" },
  { x: 2014, y: 28.957, label: "Earlier season" },
  { x: 2026, y: 18.85, label: "Current estimate" },
];

test("charts seasons chronologically without changing ranks or including the formula sentinel", () => {
  const formula = { x: "", y: Number.MAX_VALUE, label: "", formula: "score" };
  const output = buildQueryOutput([formula, ...points]);
  const before = JSON.stringify(output);
  const { container } = render(<QueryResults output={output} />);
  const buttons = screen.getAllByRole("button");
  expect(buttons.map((button) => button.getAttribute("aria-label"))).toEqual([
    "x: 2014, y: 28.957",
    "x: 2020, y: 50.558",
    "x: 2026, y: 18.85",
  ]);
  expect(buttons.map((button) => Number(button.getAttribute("cx")))).toEqual([
    55, 415, 775,
  ]);
  expect(container.querySelectorAll("li")[1].textContent).toContain(
    "#1x: 2020",
  );
  expect(container.querySelector("svg")?.textContent).not.toContain(
    String(Number.MAX_VALUE),
  );
  expect(JSON.stringify(output)).toBe(before);
  expect(screen.getByLabelText("Selected chart point").textContent).toContain(
    "2026 · 18.85",
  );
});

test("hover, keyboard focus and tapping show the selected season's multiline details", () => {
  render(<QueryLineChart points={points} />);
  fireEvent.mouseEnter(
    screen.getByRole("button", { name: "x: 2020, y: 50.558" }),
  );
  expect(screen.getByLabelText("Selected chart point").textContent).toContain(
    "First player\nSecond player",
  );
  fireEvent.focus(screen.getByRole("button", { name: "x: 2014, y: 28.957" }));
  expect(screen.getByLabelText("Selected chart point").textContent).toContain(
    "Earlier season",
  );
  fireEvent.click(screen.getByRole("button", { name: "x: 2026, y: 18.85" }));
  expect(screen.getByLabelText("Selected chart point").textContent).toContain(
    "Current estimate",
  );
});

test("skips nonnumeric and nonfinite points, and handles zero and negative scores", () => {
  const { container, rerender } = render(
    <QueryLineChart
      points={[
        { x: "", y: Number.MAX_VALUE, label: "" },
        { x: "player", y: 3, label: "" },
        { x: 1, y: Infinity, label: "" },
        { x: NaN, y: 3, label: "" },
        { x: 2, y: 0, label: "" },
      ]}
    />,
  );
  expect(container.querySelector("svg")).toBeNull();
  rerender(
    <QueryLineChart
      points={[
        { x: 1, y: 0, label: "" },
        { x: 2, y: 0, label: "" },
      ]}
    />,
  );
  expect(container.querySelector("polyline")?.getAttribute("points")).toBe(
    "55,260 775,260",
  );
  rerender(
    <QueryLineChart
      points={[
        { x: 1, y: -10, label: "" },
        { x: 2, y: 10, label: "" },
      ]}
    />,
  );
  expect(container.querySelector("polyline")?.getAttribute("points")).toBe(
    "55,260 775,24",
  );
});
