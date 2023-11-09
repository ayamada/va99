# VA99

Tiny audio manager for BGM and SE in browser


## Usage

See online demo https://ayamada.github.io/va99/

You can get this package from https://www.npmjs.com/package/va99


# Features

- Play audio files (and so on) in browser, very easily
- Small file size, about 2k
- You can change master-volume
- You can change volume of individual sounds
- You can set panning of individual sounds
- You can access to instance of AudioContext
- Apply to fade-out volume automatically at changing BGM
- Apply to suppress volume automatically when excess many SE
- Add AudioContext unlocking handler to screen
- You can override loading function if you want
- You don't have to display licensing text in production build by Zlib license


# Why Zlib license

I don't want to display licensing text in production build.

But almost all of common licenses require to display this in production build,
except Zlib license.

I think, licensing text is essentially meta information.

It elicit an effect even separated from production, like as warranty card.

And more,

I only want to ensure right to use this library for me.

For example,
an individual creator deliver thiers production with copyright to a big company,
and this production using my library, and then,
this big company found my library in the web by an automatic manner way,
so this big company will accuse me and inhibit to use my library for me,
potentially.

Therefore my libraries need steady license.

CC0 and Unlicense are insufficiency in some countries.


# Why this name is VA99

It is the final form of series of the `VNCTST-AUDIO`.

Obsoleted older works:

- https://github.com/ayamada/vnctst-audio3
- https://github.com/ayamada/vnctst-audio4
- https://github.com/ayamada/va5


# ChangeLog

- 5.3.20231110
    - Resume from interruped in iOS by touch actions, not automatically now

- 5.2.20231107
    - Resume automatically from interruped by iOS
      (See https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/state#resuming_interrupted_play_states_in_ios_safari )

- 5.1.20230925
    - Follow to forgot to update va99.externs.js

- 5.0.20230925
    - Deprecated and deleted `VA.C` and internal compressor node
    - Add `VA.I()` to interpolate extra node if you want

- 4.1.20230801
    - `VA.BGM()` try to load audioBuffer ahead if argument like url

- 4.0.20230730
    - Breaking change: distribution directory name
    - Change format of `VA.VER` a bit

- 3.1.20230729
    - Add `VA.C` as an accessor to internal compressor node
    - Remove `capture` flag from AudioContext-unlocker for iOS
    - Update some documents

- 3.0.20230728
    - Change initial value of `VA.V` (master volume) from `0.3` to `0.2`

- 2.0.20230727
    - Apply `createDynamicsCompressor()` for last safety
    - Optimize for size a bit

- 2.0.20230723
    - Settle AudioContext initially for determine default sampleRate
        - This cause a warning in js-console,
          but loader need value of standard `sampleRate`,
          and this is only provided by `_audioContext.sampleRate`.

- 2.0.20230722
    - Update some documents

- 2.0.20230721
    - Breaking change: directory name for github pages

- 1.0.20230721
    - Initial release

