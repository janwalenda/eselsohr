import { config as loadDotenv } from "dotenv";
import { resolve } from "node:path";

const workspaceRoot = process.cwd();

loadDotenv({ path: resolve(workspaceRoot, ".env.local") });
loadDotenv({ path: resolve(workspaceRoot, ".env") });

const baseUrl = (process.env.REINDEX_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

console.log(
  `Trigger tag reindex via POST ${baseUrl}/api/search/reindex while logged into Eselsohr in the browser.`,
);
console.log("Example:");
console.log(`  curl -X POST ${baseUrl}/api/search/reindex --cookie "eselsohr-session=..."`);
