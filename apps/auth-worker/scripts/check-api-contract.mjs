import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const indexFile = path.join(rootDir, "src/index.ts");
const source = fs.readFileSync(indexFile, "utf8");

const requiredSnippets = [
  '"/api/v1/me/entitlements"',
  '"/api/v1/groups"',
  '"/api/v1/users/count"',
  '/api/auth/*'
];

const forbiddenSnippets = [
  '"/api/auth/me/entitlements"',
  '"/api/groups"',
  '"/auth/users/count"'
];

const missing = requiredSnippets.filter((snippet) => !source.includes(snippet));
const forbidden = forbiddenSnippets.filter((snippet) => source.includes(snippet));

if (missing.length > 0 || forbidden.length > 0) {
  console.error("API contract check failed.");
  if (missing.length > 0) {
    console.error("Missing required snippets:");
    for (const snippet of missing) console.error(`- ${snippet}`);
  }
  if (forbidden.length > 0) {
    console.error("Forbidden legacy snippets still present:");
    for (const snippet of forbidden) console.error(`- ${snippet}`);
  }
  process.exit(1);
}

console.log("API contract check passed.");