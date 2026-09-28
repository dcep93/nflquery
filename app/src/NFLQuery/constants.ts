export const startYear = 2005;
export const endYear = 2026;
export const allYears = Array.from(new Array(endYear - startYear + 1)).map(
  (_, index) => startYear + index
);
