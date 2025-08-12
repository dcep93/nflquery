import { createRef } from "react";
import { QueryBuilderName, QueryFunctions } from ".";
import { DataType } from "../Data";

export default function CustomQueryEditor(props: {
  updateHash: (hash: string) => void;
  customFunctions: QueryFunctions<any, any>;
  datas: DataType[];
}) {
  const refs = Object.fromEntries(
    Object.keys(props.customFunctions).map((k) => [
      k,
      createRef<HTMLTextAreaElement>(),
    ])
  );
  return (
    <div>
      <div>
        {Object.entries(props.customFunctions).map(([k, v], i) => (
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
            Promise.resolve().then(() =>
              props.updateHash(
                `${QueryBuilderName}.${JSON.stringify(
                  Object.fromEntries(
                    Object.entries(refs).map(([k, v]) => [k, v.current!.value])
                  )
                )}`
              )
            )
          }
        >
          customize
        </button>
      </div>
    </div>
  );
}
