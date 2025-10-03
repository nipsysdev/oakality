import process from "node:process";
import { Application } from "@oak/oak/application";
import { BZIP2_CMD, FIND_CMD, PMTILES_CMD, PORT } from "./constants.ts";
import { Router } from "./router.ts";
import { ensureToolsArePresent } from "./utils/cmd.ts";
import { ensureDatabaseIsPresent } from "./utils/db.ts";
import { ensureAllLocatitiesPresent } from "./utils/locality.ts";
import { closeDatabase } from "./utils/db-client.ts";
import { cors } from "./middleware/cors.ts";

process.on("SIGINT", exit);
process.on("SIGTERM", exit);

await ensureToolsArePresent([PMTILES_CMD, BZIP2_CMD, FIND_CMD]);
await ensureDatabaseIsPresent();

await ensureAllLocatitiesPresent();

const app = new Application();

app.use(cors());

app.use(Router.routes());
app.use(Router.allowedMethods());

console.log(`Listening on port ${PORT}`);
app.listen({ port: PORT });

function exit() {
  console.log("\nShutting down...");
  closeDatabase();
  process.exit(0);
}
