// Generate `docs/va99.js` (for demo page) and `dist/va99.js` (for npm) from `src/va99.js`.
// NB: use node standard api only (this repository has no runtime dependency)

const fs = require("node:fs");
const path = require("node:path");


const srcFile = "src/va99.js";
const dstFiles = ["docs/va99.js", "dist/va99.js"];


const buildOnce = () => {
  const src = fs.readFileSync(srcFile, "utf-8");
  for (const dstFile of dstFiles) {
    const old = fs.existsSync(dstFile) ? fs.readFileSync(dstFile, "utf-8") : null;
    if (old === src) { continue }
    fs.writeFileSync(dstFile, src);
    console.log("updated: " + dstFile);
  }
};


const main = () => {
  buildOnce();
  if (!process.argv.includes("--watch")) { return }

  console.log("watching: " + srcFile);
  let queued = false;
  fs.watch(path.dirname(srcFile), (_eventType, filename) => {
    if (filename && (filename !== path.basename(srcFile))) { return }
    if (queued) { return }
    queued = true;
    // NB: some editors do not write a file atomically, so debounce a bit
    setTimeout(() => { queued = false; buildOnce() }, 50);
  });
};


main();
