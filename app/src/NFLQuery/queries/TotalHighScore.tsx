import BuildBestTeamGameQuery from "./custom/BuildBestTeamGameQuery";

export default function TotalHighScore() {
  return {
    tooltip: "highest score total in a game",
    query: BuildBestTeamGameQuery({
      extract: (o) => (o.tI !== 0 ? [] : [o.g.scores]),
      mapToPoint: (o) => ({
        x: o.extraction.join(" "),
        y: o.extraction.reduce((a, b) => a + b),
        label: o.label,
      }),
      transform: (points) => points,
    }),
  };
}
