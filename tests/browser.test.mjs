// Browser tests, running in headless chromium by playwright.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { after, before, test } from "node:test";
import { startServer } from "./static-server.mjs";


// NB: this must be set before loading playwright (it reads this at loading)
process.env.PLAYWRIGHT_BROWSERS_PATH ??= path.resolve("tmp/browsers");
const { chromium } = await import("playwright");

const version = JSON.parse(fs.readFileSync("package.json", "utf-8")).version;

let browser;
let server;

const newPage = async () => {
  const page = await browser.newPage();
  const pageErrors = [];
  page.on("pageerror", (e)=> pageErrors.push(e.message));
  // NB: playwright does not report unhandled promise rejection as pageerror
  await page.addInitScript(()=> {
    globalThis.__rejections = [];
    globalThis.addEventListener("unhandledrejection", (e)=> globalThis.__rejections.push(String(e.reason)));
  });
  await page.goto(server.url + "index.html");
  await page.waitForFunction(()=> !!globalThis.VA);
  return {page, pageErrors};
};

const rejectionsOf = (page) => page.evaluate(()=> globalThis.__rejections.slice());


before(async () => {
  if (!fs.existsSync(process.env.PLAYWRIGHT_BROWSERS_PATH)) {
    throw new Error(`browser is not installed, run "npm run install:browsers" (PLAYWRIGHT_BROWSERS_PATH=${process.env.PLAYWRIGHT_BROWSERS_PATH})`);
  }
  browser = await chromium.launch({args: ["--autoplay-policy=no-user-gesture-required"]});
  server = await startServer(path.resolve("docs"));
});

after(async () => {
  await browser?.close();
  await server?.close();
});


test("demo page can prepare audio resources at page loading", async () => {
  const {page, pageErrors} = await newPage();
  assert.equal(await page.evaluate(()=> VA.VER), "va99-" + version);
  // NB: docs/index.html loads these at page loading, with `VA.L()`
  await page.waitForFunction(()=> !!(window.kick && window.unidentified && window.dandd && window.cntr2), null, {timeout: 10000});
  assert.deepEqual(pageErrors, []);
  await page.close();
});


test("VA.L decodes an audio file and VA.P plays it until ended", async () => {
  const {page, pageErrors} = await newPage();
  const result = await page.evaluate(async ()=> {
    const audioBuffer = await VA.L("audio/kick.m4a");
    const sourceNode = VA.P(audioBuffer);
    const ended = await new Promise((resolve)=> {
      sourceNode.addEventListener("ended", ()=> resolve(true), {once: true});
      setTimeout(()=> resolve(false), 5000);
    });
    return {
      isAudioBuffer: audioBuffer instanceof AudioBuffer,
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      hasGainNode: !!sourceNode.G,
      hasPannerNode: !!sourceNode.P,
      contextState: VA.A.state,
      ended,
      bufferAfterEnded: sourceNode.buffer,
    };
  });
  assert.equal(result.isAudioBuffer, true);
  assert.ok(result.duration > 0, "duration: " + result.duration);
  assert.equal(result.sampleRate, 44100);
  assert.equal(result.hasGainNode, true);
  assert.equal(result.hasPannerNode, true);
  assert.equal(result.contextState, "running");
  assert.equal(result.ended, true, "sourceNode did not end");
  assert.equal(result.bufferAfterEnded, null, "buffer must be released at ended");
  assert.deepEqual(pageErrors, []);
  await page.close();
});


test("VA.BGM plays, returns resume-params, and stops", async () => {
  const {page, pageErrors} = await newPage();
  const result = await page.evaluate(async ()=> {
    const wait = (msec)=> new Promise((resolve)=> setTimeout(resolve, msec));
    const isPlayingToResumeParams = await VA.BGM("audio/dandd.m4a", 0, 0.1, 1, 0.5, 0.25);
    await wait(1000); // wait for loading and playing
    const resumeParams = VA.BGM();
    VA.BGM(null);
    await wait(1000); // wait for stopping
    return {
      lengthOfPlayingToResumeParams: isPlayingToResumeParams.length,
      resumeParamsIsArray: Array.isArray(resumeParams),
      resumedIsAudioBuffer: resumeParams[0] instanceof AudioBuffer,
      resumeParams: [resumeParams[1], resumeParams[2], resumeParams[3], resumeParams[4], resumeParams[5]],
      lengthOfStoppedResumeParams: VA.BGM().length,
    };
  });
  assert.equal(result.lengthOfPlayingToResumeParams, 0, "there is no bgm to resume, at first");
  assert.equal(result.resumeParamsIsArray, true);
  assert.equal(result.resumedIsAudioBuffer, true, "resume-params must have an audioBuffer");
  assert.deepEqual(result.resumeParams, [0, 0.1, 1, 0.5, 0.25], "resume-params must have play params");
  assert.equal(result.lengthOfStoppedResumeParams, 0, "there is no bgm to resume, after stopping");
  assert.deepEqual(pageErrors, []);
  await page.close();
});


test("VA.V and VA.I are available", async () => {
  const {page, pageErrors} = await newPage();
  const result = await page.evaluate(async ()=> {
    // NB: docs/index.html sets `VA.V = 0.4` at page loading
    VA.V = 0.6;
    const delayNode = VA.A.createDelay();
    VA.I(delayNode); // interpolate an extra node
    const audioBuffer = await VA.L("audio/kick.m4a");
    const sourceNode = VA.P(audioBuffer);
    const result = {
      volume: VA.V,
      playedWithExtraNode: !!sourceNode.G,
    };
    VA.I(undefined); // remove the extra node
    result.playedWithoutExtraNode = !!VA.P(audioBuffer);
    return result;
  });
  assert.equal(result.volume, 0.6);
  assert.equal(result.playedWithExtraNode, true);
  assert.equal(result.playedWithoutExtraNode, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});


test("AudioContext is unlocked by a user gesture", async () => {
  const {page, pageErrors} = await newPage();
  await page.click("body"); // NB: this plays a silence, by the unlock handler
  await page.waitForFunction(()=> VA.A.state === "running", null, {timeout: 3000});
  assert.deepEqual(pageErrors, []);
  await page.close();
});


test("a failure of loading does not throw anything", async () => {
  const {page, pageErrors} = await newPage();
  await page.evaluate(()=> VA.BGM("audio/no-such-file.m4a", 0, 0.1));
  await page.evaluate(()=> VA.P(undefined)); // invalid argument
  await new Promise((resolve)=> setTimeout(resolve, 1500)); // wait for rejection
  assert.deepEqual(pageErrors, []);
  assert.deepEqual(await rejectionsOf(page), []);
  await page.close();
});
