import { BuildQueryConfig } from "../QueryBuilder";

export default BuildQueryConfig({
  tooltip:
    "net yards gained on the permanent go-ahead offensive possession; clock is time remaining at start",
  queryFunctions: () => ({
    extract: (o) =>
      window.QueryHelpers.analyzeLateGame(o.g, o.teamIndex, "march", o.d.year),
    mapPoints: (points) =>
      window.QueryHelpers.mapLateGamePoints(points, "march"),
  }),
});
