export default "";
// import { DataType, DriveType, GameType, PlayType } from "../Data";
// import { groupByF, PointType } from "../Query";

// export type BuilderType = {
//   d: DataType;
//   g: GameType;
//   dr: DriveType;
//   dri: number;
//   p: PlayType;
//   pi: number;
// };

// export function MaxBuilder<T>(args: {
//   filter: (o: BuilderType) => boolean;
//   extract: (o: BuilderType) => T;
//   mapToPoint: (o: T) => PointType | null;
//   datas: DataType[];
// }): PointType[] {
//   return args.datas
//     .flatMap((d) =>
//       d.games.flatMap((g) =>
//         g.drives.flatMap((dr, dri) =>
//           dr.plays.map((p, pi) => ({
//             d,
//             g,
//             dr,
//             dri,
//             p,
//             pi,
//           }))
//         )
//       )
//     )
//     .filter(args.filter)
//     .map(args.extract)
//     .map(args.mapToPoint)
//     .filter((o) => o)
//     .map((o) => o!)
//     .sort((a, b) => b.y - a.y)
//     .slice(0, 50);
// }

// export function YearBuilder<T>(args: {
//   filter: (o: BuilderType) => boolean;
//   extract: (o: BuilderType) => T;
//   classify: (o: T) => string;
//   quantify: (o: { filtered: T[]; grouped: { [key: string]: T[] } }) => number;
//   datas: DataType[];
// }): PointType[] {
//   return args.datas
//     .map((d) => ({
//       d,
//       filtered: d.games.flatMap((g) =>
//         g.drives.flatMap((dr, dri) =>
//           dr.plays
//             .map((p, pi) => ({
//               d,
//               g,
//               dr,
//               dri,
//               p,
//               pi,
//             }))
//             .filter(args.filter)
//             .map(args.extract)
//         )
//       ),
//     }))
//     .map((o) => ({
//       ...o,
//       grouped: groupByF(o.filtered, (oo) => args.classify(oo)),
//     }))
//     .map((o) => ({
//       x: o.d.year,
//       y: args.quantify(o),
//       label: `${Object.entries(o.grouped)
//         .map(([k, v]) => `${k}:${v.length}`)
//         .sort()
//         .join(",")}/${o.filtered.length}`,
//     }));
// }

// export function PointBuilder<T>(args: {
//   filter: (o: BuilderType) => boolean;
//   extract: (o: BuilderType) => T;
//   classify: (o: T) => string;
//   quantify: (o: { filtered: T[]; grouped: { [key: string]: T[] } }) => number;
//   datas: DataType[];
// }): PointType[] {
//   return [
//     args.datas.flatMap((d) =>
//       d.games.flatMap((g) =>
//         g.drives.flatMap((dr, dri) =>
//           dr.plays
//             .map((p, pi) => ({
//               d,
//               g,
//               dr,
//               dri,
//               p,
//               pi,
//             }))
//             .filter(args.filter)
//             .map(args.extract)
//         )
//       )
//     ),
//   ]
//     .map((filtered) => ({
//       filtered,
//       grouped: groupByF(filtered, (oo) => args.classify(oo)),
//     }))
//     .map((o) => ({
//       x: "point",
//       y: args.quantify(o),
//       label: `${Object.entries(o.grouped)
//         .map(([k, v]) => `${k}:${v.length}`)
//         .sort()
//         .join(",")}/${o.filtered.length}`,
//     }));
// }

// export function groupByF<T>(
//   ts: T[],
//   f: (t: T) => string
// ): { [key: string]: T[] } {
//   return ts.reduce((prev, curr) => {
//     const key = f(curr);
//     if (!prev[key]) prev[key] = [];
//     prev[key]!.push(curr);
//     return prev;
//   }, {} as { [key: string]: T[] });
// }

// export function clockToSeconds(clock: string): number {
//   const parts = clock.split(" ").reverse();
//   return (
//     parts[0]
//       .split(":")
//       .map((p, i) => (i === 0 ? 60 : 1) * parseInt(p))
//       .reduce((a, b) => a + b, 0) +
//     (parts.length === 1 ? 0 : 15 * 60 * (4 - parseInt(parts[1][1])))
//   );
// }

// export const totalGameSeconds = clockToSeconds("Q0 00:00");

// export function getHomeAdvantage(scores: [number, number]): number {
//   return scores[1] - scores[0];
// }

// export function secondsToClock(seconds: number): string {
//   return `${Math.floor(seconds / 60)}:${"0"
//     .concat((seconds % 60).toString())
//     .slice(-2)}`;
// }

// export function isPlay(p: PlayType): boolean {
//   return (
//     p.type !== "TO" &&
//     p.type !== "Off TO" &&
//     p.type !== "EH" &&
//     p.type !== "2Min Warn" &&
//     p.type !== "PEN" &&
//     p.down !== " & -1" &&
//     p.text !== undefined &&
//     !p.text.toLowerCase().startsWith("start of") &&
//     !p.text.toLowerCase().startsWith("end of") &&
//     !p.text.toLowerCase().includes("two-minute warning") &&
//     !p.text.toLowerCase().includes("2 minute warning") &&
//     !p.text.toLowerCase().includes("timeout") &&
//     !p.text.toLowerCase().includes("penalty")
//   );
// }

// export function mapDict<T, U>(
//   d: { [key: string]: T },
//   f: (t: T) => U,
//   g: (key: string, t: T) => boolean = () => true
// ) {
//   return Object.fromEntries(
//     Object.entries(d)
//       .filter(([key, t]) => g(key, t))
//       .map(([key, t]) => [key, f(t)])
//   );
// }
