import { createRef } from "react";
import { BestTeamGameQuery } from "../Builder";
import { DataType } from "../Data";

export default BestTeamGameQuery({
  extract: (o) =>
    o.g.drives
      .filter((d) => d.team === o.g.teams[o.tI].name)
      .flatMap((d) => d.plays)
      .map((p) => p.text.match(/punts (\d+) yard/))
      .filter((match) => match)
      .map((match) => parseInt(match![1])),
  mapToPoint: (o) => ({
    x: o.timestamp,
    y:
      o.extraction.length === 0
        ? 0
        : o.extraction.reduce((a, b) => a + b, 0) / o.extraction.length,
    label: `${o.extraction.join(",")} ${o.label}`,
  }),
});

export type CustomType = { name: string; functions: { [k: string]: any } };

export const CustomQueryName = "CustomQuery";

export function CustomQueryEditor(props: {
  updateHash: (hash: string) => void;
  custom: CustomType;
  datas: DataType[];
}) {
  const refs = Object.fromEntries(
    Object.keys(props.custom.functions).map((k) => [
      k,
      createRef<HTMLTextAreaElement>(),
    ])
  );
  return (
    <div>
      <div>
        {Object.entries(props.custom.functions).map(([k, v], i) => (
          <div key={i}>
            <div>{k}</div>
            <div>
              <textarea
                defaultValue={v.toString()}
                ref={refs[k]}
                style={{ width: "42em", height: "12em" }}
              ></textarea>
            </div>
          </div>
        ))}
      </div>
      <div>
        <button
          onClick={() =>
            Promise.resolve().then(() => props.updateHash(`${CustomQueryName}`))
          }
        >
          customize {props.custom.name}
        </button>
      </div>
    </div>
  );
}
