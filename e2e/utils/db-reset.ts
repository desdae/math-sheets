import { resetE2EDatabase } from "./database";

const main = async () => {
  await resetE2EDatabase();
  console.log("e2e database reset");
};

void main();
