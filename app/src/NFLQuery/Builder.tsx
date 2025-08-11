import { DataType } from "./Data";
import { CustomType } from "./queries/CustomQuery";
import { PointType } from "./Query";

export type QueryType = {
  custom: CustomType;
  getPoints: (datas: DataType[]) => PointType[];
};
