import { DataType } from "../Data";

export default function ThirtyFourToZero(datas: DataType[]) {
  // return PointBuilder({
  //   transform: (o) => ({
  //     ...o,
  //     found: (o.dri === 0 && o.pi === 0
  //       ? o.g.drives.find(
  //           (dr) =>
  //             (dr.scores[0] === 0 && dr.scores[1] === 34) ||
  //             (dr.scores[0] === 34 && dr.scores[1] === 0)
  //         )
  //       : undefined)!,
  //   }),
  //   filter: ({ found }) => found !== undefined,
  //   classify: ({ g, found }) =>
  //     ((fs, gs) => (fs === gs ? "stomp" : "upset"))(
  //       found.scores[0] < found.scores[1],
  //       g.scores[0] < g.scores[1]
  //     ),
  //   quantify: ({ filtered }) => filtered.length,
  //   datas,
  // });
}
