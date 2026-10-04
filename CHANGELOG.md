# CHANGELOG

## 5.8.20261005
- Support to import va99 from node (it does not touch WebAudio api and `document` at import time)
  - `import { VA } from "va99"` / `require("va99")` do not throw anything now, but no sound is played there
  - Add `exports` field to `package.json` for this
- Prepare the instance of AudioContext lazily (it does not cause a warning of Chromium at page loading now)
- `VA.L()` failures (for example by an invalid argument) do not cause unhandled promise rejection now
- Move the main source from `docs/va99.js` to `src/va99.js`
- Add tests

## 5.7.20251013
- Second and third arguments in `VA.P()` were ignored, repaired now

## 5.6.20250929
- `VA.BGM(path)` caching AudioContext now, but it is in limited quantity (max quantity by `VA.BCL`)
- `VA.BGM(path)` recognize same BGM now

## 5.5.20250816
- `VA.P()` does NOT reserve to play SE in before unlock AudioContext
  (but `VA.BGM()` reserve to play BGM in before unlock AudioContext)

## 5.4.20241209
- `VA.BGM()` returns `[]` if playing BGM

## 5.4.20241208
- Improve to unlock AudioContext for PC browsers
- `VA.BGM()` returns args for resume BGM if stopping BGM

## 5.3.20240316
- Prevent huge volume by play many SE before unlocking on chrome

## 5.3.20231110
- Resume from interruped in iOS by touch actions, not automatically now

## 5.2.20231107
- Resume automatically from interruped by iOS
  (See https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/state#resuming_interrupted_play_states_in_ios_safari )

## 5.1.20230925
- Follow to forgot to update va99.externs.js

## 5.0.20230925
- Deprecated and deleted `VA.C` and internal compressor node
- Add `VA.I()` to interpolate extra node if you want

## 4.1.20230801
- `VA.BGM()` try to load audioBuffer ahead if argument like url

## 4.0.20230730
- Breaking change: distribution directory name
- Change format of `VA.VER` a bit

## 3.1.20230729
- Add `VA.C` as an accessor to internal compressor node
- Remove `capture` flag from AudioContext-unlocker for iOS
- Update some documents

## 3.0.20230728
- Change initial value of `VA.V` (master volume) from `0.3` to `0.2`

## 2.0.20230727
- Apply `createDynamicsCompressor()` for last safety
- Optimize for size a bit

## 2.0.20230723
- Settle AudioContext initially for determine default sampleRate
    - This cause a warning in js-console,
      but loader need value of standard `sampleRate`,
      and this is only provided by `_audioContext.sampleRate`.

## 2.0.20230722
- Update some documents

## 2.0.20230721
- Breaking change: directory name for github pages

## 1.0.20230721
- Initial release
