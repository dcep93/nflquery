import { DataType, GameType } from "../Data";
import { PointType } from "../Query";

export default {
  name: "QueryBuilder",
  tooltip: "execute a custom query",
  queryFunctions: () =>
    getCustomFunctions({
      extract: (o: any) => [Object.keys(o)],
      mapToPoint: (o: any) => o,
      transform: (points: any) => points,
    }),
};

export type QueryFunctions<T, U> = {
  extract: (o: { d: DataType; g: GameType; teamIndex: number }) => T[];
  mapToPoint: (o: {
    timestamp: number;
    extraction: T;
    label: string;
  }) => U | null;
  transform: (points: U[]) => PointType[];
};

function safeEval(v: string) {
  // eslint-disable-next-line
  return eval(v);
}

function getCustomFunctions<T, U>(
  defaultFunctions: QueryFunctions<T, U>
): QueryFunctions<T, U> {
  try {
    const matched = window.location.hash.match(/.*?\.(.*)/);
    if (!matched) return defaultFunctions;
    const functions = JSON.parse(decodeURIComponent(matched![1]));
    const evaledFunctions = Object.fromEntries(
      Object.entries(functions).map(([k, v]) => [k, safeEval(v as string)])
    );
    // @ts-ignore
    return evaledFunctions;
  } catch (e) {
    alert(e);
  }
  return defaultFunctions;
}
