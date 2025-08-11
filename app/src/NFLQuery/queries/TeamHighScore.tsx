import BuildBestTeamGameQuery from "./custom/BuildBestTeamGameQuery";

export default function TeamHighScore() {
  return {
    tooltip: "highest score by a team",
    query: BuildBestTeamGameQuery({
      extract: (o) => [{ scores: o.g.scores, tI: o.tI }],
      mapToPoint: (o) => ({
        x: o.extraction.scores.join(" "),
        y: o.extraction.scores[o.extraction.tI],
        label: o.label,
      }),
      transform: (points) => points,
    }),
  };
}
