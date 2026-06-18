import { corsair } from "./app/utils/corsair";
import { getSchema } from "corsair";

async function main() {
  try {
    console.log("Getting schema text:");
    const schema = getSchema(corsair, 'gmail.api.messages.list');
    console.log(schema);
  } catch (err) {
    console.error(err);
  }
}

main();
