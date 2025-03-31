import jwt from "jsonwebtoken";
import { Student } from "./types";

export default class Codec {
  static encode = (data: string) => {
    return jwt.sign(data, "shhhhh");
  };

  static decode = (data: string) => {
    return jwt.decode(data) as string;
  };
}
