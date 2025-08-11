import BuildBestTeamGameQuery from "./custom/BuildBestTeamGameQuery";

export default function GamePenalties() {
  return {
    tooltip: "games with most penalties",
    query: BuildBestTeamGameQuery({
      extract: (o) =>
        o.tI !== 0
          ? []
          : [
              o.g.drives.flatMap((dr) =>
                dr.plays.filter((p) => p.type === "PEN")
              ),
            ],
      mapToPoint: (o) => ({
        x: o.timestamp,
        y: o.extraction.length,
        label: o.label,
      }),
      transform: (points) => points,
    }),
  };
}
