import { useMemo, useState } from "react";
import Data, { DataType } from "./Data";
import { datasToPlayerYearScores } from "./Fantasy";
import { allYears } from "./Fetch";
import { bubbleStyle } from "./Query";

const MIN_YEARS_EXP = 5;
const MIN_BEST_SCORE = 200;
const INJURED_GAMES_THRESHOLD = 4;
const HISTORICAL_GAMES_THRESHOLD = 4;
const HISTORICAL_RATE_THRESHOLD = 0.3;

export default function InjuryTrends() {
  const [datas, updateData] = useState<DataType[] | null>(null);
  const [config, updateConfig] = useState({
    minYearsExp: 5,
    minBestScore: 200,
    injuredGamesThreshold: 4,
    historicalGamesThreshold: 4,
    historicalRateThreshold: 0.3,
  });
  useMemo(() => {
    Data(allYears).then(updateData);
  }, []);
  if (datas === null) return null;
  const output = datasToPlayerYearScores(datas)
    .filter((o) => o.years.length >= MIN_YEARS_EXP)
    .map((o) => ({
      ...o,
      max: o.years.map((y) => y.total).sort((a, b) => b - a)[0],
    }))
    .filter((o) => o.max >= MIN_BEST_SCORE)
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
              .find(({ v }) => v > 0)!.i >= INJURED_GAMES_THRESHOLD,
        })),
    }))
    .flatMap((o) =>
      o.years.map((y, i) => ({
        i,
        injured: y.injured,
        injured_last: o.years[i - 1]?.injured,
        historical_injury_rate:
          o.years.slice(0, i).filter(({ injured }) => injured).length / i,
      }))
    );
  return (
    <div>
      <div>
        <div style={bubbleStyle}>
          <div>config</div>
        </div>
      </div>
      <div>
        <div style={bubbleStyle}>
          <pre>
            {JSON.stringify(
              {
                injuryRate:
                  output.filter(({ injured }) => injured).length /
                  output.length,
                injuryRateGivenLastYearInjury: ((lastYearInjured) =>
                  lastYearInjured.filter(({ injured }) => injured).length /
                  lastYearInjured.length)(
                  output.filter(({ injured_last }) => injured_last)
                ),
                injuryRateGivenHistoricalRate: ((historicallyInjured) =>
                  historicallyInjured.filter(({ injured }) => injured).length /
                  historicallyInjured.length)(
                  output
                    .filter(({ i }) => i >= HISTORICAL_GAMES_THRESHOLD)
                    .filter(
                      ({ historical_injury_rate }) =>
                        historical_injury_rate >= HISTORICAL_RATE_THRESHOLD
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

function getInjuryRate(player: {
  years: { missed: number }[];
  max: number;
  name: string;
  position: string;
}) {
  const x = player.years.map(({ missed }) => missed).sort((a, b) => b - a);
  const y = x
    .concat(-1)
    .findIndex((missed) => missed < INJURED_GAMES_THRESHOLD);
  const z = y / x.length;
  return z;
}
