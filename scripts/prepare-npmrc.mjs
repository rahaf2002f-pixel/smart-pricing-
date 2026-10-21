import { readFile, writeFile } from "node:fs/promises";

const npmrcPath = new URL("../.npmrc", import.meta.url);
const officialRegistry = "registry=https://registry.npmjs.org/\n";

let current;
try {
  current = await readFile(npmrcPath, "utf8");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

if (current !== officialRegistry) {
  await writeFile(npmrcPath, officialRegistry, "utf8");
}
