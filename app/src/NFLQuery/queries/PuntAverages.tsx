import { BestTeamGameQuery } from "../Builder";

export default BestTeamGameQuery({
  extract: (o) =>
    o.g.drives
      .filter((d) => d.team === o.g.teams[o.tI].name)
      .flatMap((d) => d.plays)
      .map((p) => p.text.match(/punts (\d+) yard/))
      .filter((match) => match)
      .map((match) => parseInt(match![1])),
  mapToPoint: (o) => ({
    x: o.timestamp,
    y:
      o.extraction.length === 0
        ? 0
        : o.extraction.reduce((a, b) => a + b, 0) / o.extraction.length,
    label: `${o.extraction.join(",")} ${o.label}`,
  }),
});
