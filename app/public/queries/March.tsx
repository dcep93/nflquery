import { DataType } from "../Data";
import {
  clockToSeconds,
  getHomeAdvantage,
  PointType,
  secondsToClock,
  totalGameSeconds,
} from "../Query";

export default function March(datas: DataType[]): PointType[] {
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
          endScore,
          endHomeAdvantage,
          finalScoringDrive: g.drives
            .map((dr, dri) => ({
              dr,
              dri,
              drScore: dr.scores.reduce((a, b) => a + b, 0),
            }))
            .find(({ drScore }) => drScore === endScore)!,
        }))
    )
    .filter(
      (o) =>
        o.finalScoringDrive?.dri > 0 &&
        o.endHomeAdvantage *
          getHomeAdvantage(o.g.drives[o.finalScoringDrive.dri - 1].scores) <
          0
    )
    .map((o) => ({
      ...o,
      yards: o.finalScoringDrive.dr.plays[0].startYardsToEndzone,
      elapsedSeconds: clockToSeconds(o.finalScoringDrive.dr.plays[0].clock),
    }))
    .sort((a, b) =>
      a.elapsedSeconds === b.elapsedSeconds
        ? b.yards - a.yards
        : a.elapsedSeconds - b.elapsedSeconds
    )
    .reduce(
      (prev, curr) =>
        prev.record >= curr.yards
          ? { ...prev, count: prev.count + 1 }
          : {
              count: 0,
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
                } ${curr.d.year}w${curr.g.week}:${curr.g.gameId}/c:${
                  prev.count
                }`,
              }),
            },
      {
        count: 0,
        record: -1,
        rval: [] as PointType[],
      }
    )
    .rval.sort((a, b) => b.y - a.y);
}
