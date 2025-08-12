import { DataType, GameType } from "../Data";
import { PointType } from "../Query";

const QueryBuilder = BuildQueryConfig({
  tooltip: "execute a custom query",
  queryFunctions: () =>
    getCustomFunctions({
      extract: (o: any) => [Object.keys(o)],
      mapToPoint: (o: any) => o,
      transform: (points: any) => points,
    }),
});

export default QueryBuilder;

export const QueryBuilderName = "QueryBuilder";

type QueryConfig<T, U> = {
  tooltip: string;
  queryFunctions: () => QueryFunctions<T, U>;
};

export function BuildQueryConfig<T, U>(
  args: QueryConfig<T, U>
): QueryConfig<T, U> {
  return args;
}

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
