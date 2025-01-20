import { DataType } from "../Data";
import {
  clockToSeconds,
  getHomeAdvantage,
  GraphType,
  secondsToClock,
  totalGameSeconds,
} from "../Query";

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
          endScore: g.scores.reduce((a, b) => a + b, 0),
          endHomeAdvantage: getHomeAdvantage(g.scores),
        }))
        .map(({ g, endScore, endHomeAdvantage }) => ({
          d,
          g,
          endHomeAdvantage,
          finalScoringDrive: g.drives
            .slice()
            .map((dr) => ({
              dr,
              drScore: dr.scores.reduce((a, b) => a + b, 0),
            }))
            .find(({ drScore }) => drScore === endScore)!,
        }))
    )
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
                x: secondsToClock(totalGameSeconds - curr.elapsedSeconds),
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
