import BuildBestTeamGameQuery from "./custom/BuildBestTeamGameQuery";

export default function Encroachments() {
  return {
    tooltip: "games with most encroachments",
    query: BuildBestTeamGameQuery({
      extract: (o) =>
        o.tI !== 0
          ? []
          : [
              o.g.drives.flatMap((dr) =>
                dr.plays.filter((p) =>
                  p.text.toLowerCase().includes("encroachment")
                )
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
