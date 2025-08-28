import { useMemo, useState } from "react";
import Data, { BoxScoreType, DataType } from "./Data";
import { allYears } from "./Fetch";

var initialized = false;

// player: (year)(traded)(consistent/died/injured)[]
//

export default function Trends() {
  const [datas, updateData] = useState<DataType[] | null>(null);
  useMemo(() => {
    if (!initialized) {
      initialized = true;
      Data(allYears).then(updateData);
    }
  }, []);
  return datas === null ? null : <SubTrends datas={datas} />;
}

function SubTrends(props: { datas: DataType[] }) {
  return (
    <pre>
      {JSON.stringify(
        props.datas
          .flatMap((d) => d.games.map((g) => ({ g, d })))
          .flatMap((o) => o.g.teams.map((t) => ({ t, o })))
          .flatMap((oo) => oo.t.boxScore.map((b) => ({ b, oo })))
          .flatMap((ooo) => ooo.b.players.map((p) => ({ p, ooo })))
          .map((oooo) => ({
            year: oooo.ooo.oo.o.d.year,
            p: oooo.p,
            b: { ...oooo.ooo.b, players: [] },
          }))
          .map((ooooo) => ({
            score: getScore(ooooo.p.stats, ooooo.b),
            ooooo,
          }))
          .filter((oooooo) => oooooo.ooooo.p.name === "Robbie Chosen"),
        null,
        2
      )}
    </pre>
  );
}

const scoring = {
  passing: { YDS: 0.04, TD: 4, INT: -2 },
  rushing: { YDS: 0.1, TD: 6 },
  receiving: { REC: 1, YDS: 0.1, TD: 6 },
  fumbles: { LOST: -2 },
} as {
  [k1: string]: { [k2: string]: number };
};
function getScore(stats: string[], b: BoxScoreType): number {
  return Object.entries(scoring[b.category] || {})
    .map(([label, value]) => parseFloat(stats[b.labels.indexOf(label)]) * value)
    .reduce((a, b) => a + b, 0);
}
