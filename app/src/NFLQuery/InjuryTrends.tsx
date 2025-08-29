import { useMemo, useState } from "react";
import Data, { DataType } from "./Data";
import { datasToPlayerYearScores } from "./Fantasy";
import { allYears } from "./Fetch";
import { bubbleStyle } from "./Query";

export default function InjuryTrends() {
  const [datas, updateData] = useState<DataType[] | null>(null);
  const [config, _updateConfig] = useState({
    minYearsExp: 5,
    minBestScore: 200,
    injuredGamesThreshold: 4,
    historicalGamesThreshold: 4,
    historicalRateThreshold: 0.3,
  });
  const updateConfig = (key: string, value: number) =>
    _updateConfig(Object.assign({}, config, { [key]: value }));
  useMemo(() => {
    Data(allYears).then(updateData);
  }, []);
  if (datas === null) return null;
  const output = getOutput(datas, config);
  return (
    <div>
      <div>
        <div style={bubbleStyle}>
          <div>are some players injury prone?</div>
          <ul>
            <li>
              only include a season's data if a player scored positive points
              week 1
            </li>
            <li>disregard the last 2 games of a season</li>
            <li>disregard rookie years</li>
            <li>if you scored zero fantasy points, you were injured</li>
            <ul>
              <li>things get tricky for backup QBs and the like</li>
              <li>lemme know if you have ideas</li>
            </ul>
          </ul>
        </div>
        <div>
          <div style={bubbleStyle}>
            <div>config</div>
          </div>
        </div>
      </div>
      <div>
        <div style={bubbleStyle}>
          <pre>
            {JSON.stringify(
              {
                injuryRate:
                  output.filter((o) => o.injureds[o.i]).length / output.length,
                injuryRateGivenLastYearInjury: ((lastYearInjured) =>
                  lastYearInjured.filter((o) => o.injureds[o.i]).length /
                  lastYearInjured.length)(
                  output.filter((o) => o.injureds[o.i - 1])
                ),
                injuryRateGivenHistoricalRate: ((historicallyInjured) =>
                  historicallyInjured.filter((o) => o.injureds[o.i]).length /
                  historicallyInjured.length)(
                  output
                    .filter(({ i }) => i >= config.historicalGamesThreshold)
                    .filter(
                      ({ historical_injury_rate }) =>
                        historical_injury_rate >= config.historicalRateThreshold
                    )
                ),
              },
              null,
              2
            )}
          </pre>
        </div>
      </div>
    </div>
  );
}

function getOutput(
  datas: DataType[],
  config: {
    minYearsExp: number;
    minBestScore: number;
    injuredGamesThreshold: number;
    historicalGamesThreshold: number;
    historicalRateThreshold: number;
  }
): {
  i: number;
  injureds: boolean[];
  historical_injury_rate: number;
}[] {
  return datasToPlayerYearScores(datas)
    .filter((o) => o.years.length >= config.minYearsExp)
    .map((o) => ({
      ...o,
      max: o.years.map((y) => y.total).sort((a, b) => b - a)[0],
    }))
    .filter((o) => o.max >= config.minBestScore)
    .sort((a, b) => b.max - a.max)
    .map((o) => ({
      ...o,
      years: o.years
        .slice(1)
        .filter((oo) => oo.scores[0] > 0)
        .map((oo) => ({
          scores: oo.scores,
          year: oo.year,
          total: oo.total,
          injured:
            oo.scores
              .slice(0, -2)
              .sort((a, b) => a - b)
              .concat(1)
              .map((v, i) => ({ v, i }))
              .find(({ v }) => v > 0)!.i >= config.injuredGamesThreshold,
        })),
    }))
    .flatMap((o) =>
      o.years.map((y, i) => ({
        i,
        injureds: o.years.slice(0, i + 1).map(({ injured }) => injured),
        historical_injury_rate:
          o.years.slice(0, i).filter(({ injured }) => injured).length / i,
      }))
    );
}
