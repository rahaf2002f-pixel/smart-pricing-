import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const files = ["package.json", "package-lock.json", "pnpm-lock.yaml", ".npmrc"];
const contents = Object.fromEntries(await Promise.all(files.map(async file =>
  [file, await readFile(new URL(`../${file}`, import.meta.url), "utf8")]
)));
const privateHost = host => {
  const hostname = host.toLowerCase().replace(/\.$/, "");
  return hostname === "localhost"
    || hostname.endsWith(".localhost")
    || hostname === "internal"
    || hostname.endsWith(".internal")
    || /^127(?:\.\d{1,3}){3}$/.test(hostname)
    || hostname === "::1"
    || hostname === "[::1]";
};
for (const [file, text] of Object.entries(contents)) {
  const urls = text.match(/https?:\/\/[^\s"'<>]+/gi) ?? [];
  for (const value of urls) {
    let url;
    try {
      url = new URL(value);
    } catch {
      continue;
    }
    assert(!privateHost(url.hostname),
      `${file} contains a URL with a private host (${url.hostname}). Keep deployment dependencies portable.`);
  }
}
const lock = JSON.parse(contents["package-lock.json"]);
const manifest = JSON.parse(contents["package.json"]);
assert.deepEqual(lock.packages[""].dependencies, manifest.dependencies,
  "package.json and package-lock.json dependencies must match.");
let count = 0;
for (const [name, entry] of Object.entries(lock.packages)) {
  if (!entry.resolved) continue;
  const url = new URL(entry.resolved);
  assert(url.origin === "https://registry.npmjs.org" && !url.username && !url.password,
    `Non-public registry in locked package: ${name}`);
  count++;
}
assert(/^\s*registry\s*=\s*https:\/\/registry\.npmjs\.org\/?\s*$/m.test(contents[".npmrc"]),
  "The project npm registry must be https://registry.npmjs.org/.");
console.log(`Registry check passed: ${count} locked tarballs use the official npm registry.`);
