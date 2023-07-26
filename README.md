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
- You can override `loading` function if you want
- You don't have to display licensing text in production build by Zlib license


# Why Zlib license

I don't want to display licensing text in production build.

But almost all of common licenses require to display this in production build,
except Zlib license.

I think, licensing text is essentially meta information.

It elicit an effect even separated from production, like as warranty card.



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


# Why this package is in `docs/` directory

It is for github pages ...


# ChangeLog

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
    - Change directory name for github pages

- 1.0.20230721
    - Initial release

