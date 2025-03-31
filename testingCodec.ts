import Codec from "./Codec";

const testString = "123";

const t = Codec.encode(testString);
console.log(Codec.decode(t) == testString);
