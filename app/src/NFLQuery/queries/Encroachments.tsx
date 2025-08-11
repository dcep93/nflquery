import { DataType } from "../Data";

export default function Encroachments(datas: DataType[]) {
  // return MaxBuilder({
  //   transform: (o) => o,
  //   filter: (o) => o.dri === 0 && o.pi === 0,
  //   map: (o) => ({
  //     x: o.g.gameId,
  //     y: o.g.drives.flatMap((dr) =>
  //       dr.plays.filter((p) => p.text.toLowerCase().includes("encroachment"))
  //     ).length,
  //     label: `${o.g.teams.map((t) => t.name).join(" @ ")} ${o.d.year}w${
  //       o.g.week
  //     }`,
  //   }),
  //   datas,
  // });
}
