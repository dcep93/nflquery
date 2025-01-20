import { DataType } from "../Data";
import { clockToSeconds, getHomeAdvantage, GraphType } from "../Query";

// for all scores that end the game that dont pad a victory
// what was time on the clock, how many timeouts, how many yards
// how many times did something at least this rare happen
// sort by rarity, timestamp

export default function March(datas: DataType[]): GraphType {
  return datas
    .flatMap((d) =>
      d.games
        .map((g) => ({
          g,
          endHomeAdvantage: getHomeAdvantage(g.scores),
        }))
        .map(({ g, endHomeAdvantage }) => ({
          d,
          g,
          endHomeAdvantage,
          finalScoringDrive: g.drives
            .slice()
            .reverse()
            .map((dr) => ({ dr, drHomeAdvantage: getHomeAdvantage(dr.scores) }))
            .find(
              ({ drHomeAdvantage }) => endHomeAdvantage !== drHomeAdvantage
            )!,
        }))
    )
    .filter((o) => o.endHomeAdvantage * o.finalScoringDrive.drHomeAdvantage < 1)
    .map((o) => ({
      ...o,
      yards: o.finalScoringDrive.dr.plays[0].startYardsToEndzone,
      elapsedSeconds: clockToSeconds(o.finalScoringDrive.dr.plays[0].clock),
    }))
    .sort((a, b) =>
      a.elapsedSeconds === b.elapsedSeconds
        ? b.yards - a.yards
        : b.elapsedSeconds - a.elapsedSeconds
    )
    .reduce(
      (prev, curr) =>
        prev.record >= curr.yards
          ? prev
          : {
              record: curr.yards,
              rval: prev.rval.concat({
                x: curr.elapsedSeconds,
                y: curr.yards,
                label: `${
                  curr.endHomeAdvantage > 0
                    ? curr.g.teams
                        .slice()
                        .reverse()
                        .map((t) => t.name)
                        .join(" vs ")
                    : curr.g.teams.map((t) => t.name).join(" @ ")
                } ${curr.d.year}w${curr.g.week}:${curr.g.gameId}`,
              }),
            },
      {
        record: -1,
        rval: [] as GraphType,
      }
    )
    .rval.sort((a, b) => b.y - a.y);
}
