import jwt from "jsonwebtoken";
import { Student } from "./types";
let token = jwt.sign({ foo: "bar" }, "shhhhh");

export default class Codec {
  static encode = (data: string) => {
    return Buffer.from(JSON.stringify(data)).toString("base64");
  };

  static decode = (data: string) => {
    return JSON.parse(Buffer.from(data, "base64").toString("utf-8"));
  };
}
