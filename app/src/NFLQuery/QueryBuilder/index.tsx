import { DataType, GameType } from "../Data";
import { PointInType, PointType } from "../Query";

const QueryBuilder = BuildQueryConfig({
  tooltip: "execute a custom query",
  queryFunctions: () =>
    getCustomFunctions({
      extract: (o: any) => [Object.keys(o)],
      mapPoints: (o: any) => o,
    }),
});

export default QueryBuilder;

export const QueryBuilderName = "QueryBuilder";

type QueryConfig<T> = {
  tooltip: string;
  queryFunctions: () => QueryFunctions<T>;
};

export function BuildQueryConfig<T>(args: QueryConfig<T>): QueryConfig<T> {
  return args;
}

export type QueryFunctions<T> = {
  extract: (o: { d: DataType; g: GameType; teamIndex: number }) => T[];
  mapPoints: (pointsIn: PointInType<T>[]) => PointType[];
};

function safeEval(v: string) {
  // eslint-disable-next-line
  return eval(v);
}

function getCustomFunctions<T>(
  defaultFunctions: QueryFunctions<T>
): QueryFunctions<T> {
  try {
    const matched = window.location.hash.match(/.*?\.(.*)/);
    if (!matched) return defaultFunctions;
    const functions = JSON.parse(decodeURIComponent(matched![1]));
    const evaledFunctions = evalFunctions(functions);
    // @ts-ignore
    return evaledFunctions;
  } catch (e) {
    alert(e);
  }
  return defaultFunctions;
}

export function evalFunctions(functions: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(functions).map(([k, v]) => [k, safeEval(v as string)])
  );
}
