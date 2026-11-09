import { BuildQueryConfig } from "../QueryBuilder";

export default BuildQueryConfig({
  tooltip:
    "opponent-established deficit overcome; clock is time remaining after scoring",
  queryFunctions: () => ({
    extract: (o) =>
      window.QueryHelpers.analyzeLateGame(
        o.g,
        o.teamIndex,
        "comeback",
        o.d.year,
      ),
    mapPoints: (points) =>
      window.QueryHelpers.mapLateGamePoints(points, "comeback"),
  }),
});
