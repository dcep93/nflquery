import { BuildQueryConfig } from "../QueryBuilder";

export default BuildQueryConfig({
  tooltip: "1st & 1 plays (excluding non-plays)",
  queryFunctions: () => ({
    extract: (o) =>
      o.teamIndex !== 0
        ? []
        : [
            o.g.drives.flatMap((drive) =>
              drive.plays
                .filter(
                  (play) =>
                    play.down === "1st & 1" &&
                    window.QueryHelpers.isPlay(play) &&
                    play.distance > 0
                )
                .map((play) => {
                  const playIndex = drive.plays.findIndex(
                    (candidate) =>
                      candidate === play || candidate.clock === play.clock
                  );
                  const sliceEnd =
                    playIndex === -1 ? drive.plays.length : playIndex;

                  return {
                    clock: play.clock,
                    plays: drive.plays.slice(0, sliceEnd),
                  };
                })
            ),
          ],
    mapPoints: (points) =>
      points.map((o) => ({
        x: o.extraction
          .map((extraction) => JSON.stringify(extraction))
          .join(" / "),
        y: o.extraction.length,
        label: o.label,
      })),
  }),
});
