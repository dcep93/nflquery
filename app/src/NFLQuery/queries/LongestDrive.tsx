import { clockToSeconds } from "../Query";
import BuildBestTeamGameQuery from "./custom/BuildBestTeamGameQuery";

export default function LongestDrive() {
  return {
    tooltip: "longest drive durations",
    query: BuildBestTeamGameQuery({
      extract: (o) =>
        o.tI !== 0
          ? []
          : o.g.drives
              .filter((dr) => dr.description)
              .map((dr) => ({
                description: dr.description,
                seconds: clockToSeconds(dr.description.split(" ").reverse()[0]),
              })),

      mapToPoint: (o) => ({
        x: o.extraction.description,
        y: o.extraction.seconds,
        label: o.label,
      }),
      transform: (points) => points,
    }),
  };
}
