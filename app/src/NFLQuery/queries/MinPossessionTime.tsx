import { DataType } from "../Data";

import { clockToSeconds } from "../Query";
import BuildBestTeamGameQuery from "./custom/BuildBestTeamGameQuery";

export default function MinPossessionTime() {
  return {
    tooltip: "min game possession time",
    query: BuildBestTeamGameQuery({
      extract: (o) =>
        (({ rawPossessionTime }) =>
          rawPossessionTime === undefined
            ? []
            : [
                {
                  o,
                  rawPossessionTime,
                },
              ])({
          rawPossessionTime: o.g.teams[o.tI].statistics.possessionTime,
        }),
      mapToPoint: (o) => ({
        x: o.extraction.rawPossessionTime,
        y: clockToSeconds(o.extraction.rawPossessionTime),
        label: `${o.extraction.o.g.scores.join(" ")} / ${o.label}`,
      }),
      transform: (points) => points,
    }),
  };
}

export function MinPossessionTimex(datas: DataType[]) {
  // return MaxBuilder({
  //   transform: (o) => o,
  //   filter: ({ dri, pi }) => dri <= 1 && pi === 0,
  //   map: ({ d, g, dri }) =>
  //     ((o) =>
  //       o.rawPossessionTime === undefined
  //         ? null
  //         : {
  //             x: g.scores.join(" "),
  //             y: clockToSeconds(o.rawPossessionTime),
  //             label: `${o.rawPossessionTime} ${o.matchup} ${d.year}w${g.week}:${g.gameId}`,
  //           })({
  //       rawPossessionTime: g.teams[dri].statistics.possessionTime,
  //       matchup:
  //         dri === 0
  //           ? g.teams.map((t) => t.name).join(" @ ")
  //           : g.teams
  //               .slice()
  //               .reverse()
  //               .map((t) => t.name)
  //               .join(" vs "),
  //     }),
  //   datas,
  // });
}
