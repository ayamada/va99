// API tests, running in node (no WebAudio, no browser).
// NB: va99 must be importable from node, even though it cannot play any sounds.
//     (a unit-test of va99 users may run in node)

import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { test } from "node:test";


const require = createRequire(import.meta.url);
const version = JSON.parse(fs.readFileSync("package.json", "utf-8")).version;

const deleteGlobalVa = ()=> { delete globalThis.VA };

// `VA` is provided as a global value by these files (for a html `script` tag)
const globalVaFiles = ["src/va99.js", "dist/va99.js", "dist/va99.min.js"];

// NB: these files set `VA` as a side effect, so they must be re-executed
const requireVa = (specifier) => {
  deleteGlobalVa();
  delete require.cache[require.resolve(specifier)];
  require(specifier); // must not throw
  assert.equal(typeof globalThis.VA, "object", specifier);
};


test("can be loaded from node, without WebAudio and document", () => {
  for (const file of globalVaFiles) {
    requireVa(path.resolve(file));
  }
});


test("can be imported as es module from node", async () => {
  deleteGlobalVa();
  const { VA } = await import(path.resolve("dist/va99.min.mjs")); // must not throw
  assert.equal(typeof VA, "object");
});


test("can be imported by its own package name from node", async () => {
  // NB: this depends on `exports` field in package.json (node can self-reference)
  requireVa("va99");
  const { VA } = await import("va99"); // must not throw
  assert.equal(typeof VA, "object");
});


test("has expected api", async () => {
  const { VA } = await import(path.resolve("dist/va99.min.mjs"));
  for (const key of ["L", "P", "BGM", "D", "I"]) {
    assert.equal(typeof VA[key], "function", key);
  }
  assert.equal(VA.VER, "va99-" + version);
  assert.equal(typeof VA.BCL, "number");
  assert.equal(VA.V, 0.2); // default master volume
});


test("api does nothing (but does not throw) in node", async () => {
  const { VA } = await import(path.resolve("dist/va99.min.mjs"));
  assert.equal(VA.P(), undefined);
  assert.equal(VA.P(undefined), undefined);
  assert.equal(VA.I(undefined), undefined);
  assert.equal(VA.D(undefined), undefined);
  assert.equal(VA.A, undefined);
  assert.deepEqual(VA.BGM(), []);
  assert.deepEqual(VA.BGM(null), []);
  assert.equal(await VA.L("https://example.invalid/foo.m4a"), undefined);
  VA.V = 0.4; // must not throw
  assert.equal(VA.V, 0.4);
});


test("generated files are up-to-date with src/va99.js", () => {
  const src = fs.readFileSync("src/va99.js", "utf-8");
  for (const file of ["docs/va99.js", "dist/va99.js"]) {
    assert.equal(fs.readFileSync(file, "utf-8"), src, `run "npm run build", then commit ${file}`);
  }
});


test("minified files are small enough", () => {
  // NB: file size is an important feature of va99.
  //     FIXME: update this threshold, only when growth is intended
  const file = "dist/va99.min.js";
  const size = fs.statSync(file).size;
  assert.ok(size <= 3072, `${file} is ${size} bytes, too large`);
});
