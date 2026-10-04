// don't set `const`, `let`, `var` to VA (for google-closure-compiler)
VA = (()=> {
  const version = '5.8.20261005'; /* auto-updated */


  const stateSuspended = "suspended";


  // NB: this library should be importable from node
  //     (a unit-test of va99 users may run in node),
  //     so this touches no WebAudio api and no document at this timing.
  var g = globalThis;
  var doc = g.document;
  var AC = g.AudioContext || g.webkitAudioContext;
  var OAC = g.OfflineAudioContext || g.webkitOfflineAudioContext;


  // NB: an instance of AudioContext is prepared lazily, by `boot()`.
  //     it is required by `_audioContext.sampleRate` in the audio loader,
  //     and it is warned by Chromium if prepared at page loading.
  var _audioContext;
  var _masterGainNode;
  var _masterVolume = 0.2;
  var _extraNode;
  var _silence;
  var _oac;
  var _isTriedBoot = 0;


  var unlockAudioContext = ()=> {
    // unlock AudioContext for chromium and firefox
    // and resume from interrupted for iOS
    if ((_audioContext.state == stateSuspended)||(_audioContext.state == "interrupted")) {
      try { _audioContext.resume() } catch (e) {};
    }
  };


  var installUnlockHandler = ()=> {
    if (!doc) { return }
    // unlock AudioContext and resume from interrupted by click for PC browsers
    var clickHandle = ()=> {
      playSe(_silence, 0, 1);
      doc.removeEventListener("click", clickHandle);
    };
    doc.addEventListener("click", clickHandle);
    // unlock AudioContext and resume from interrupted by touch actions for iOS
    // should not remove handle by removeEventListener
    // (in iOS, AudioContext may unlocks again by OS)
    ["touchstart", "touchend"].forEach((k)=> doc.addEventListener(k, ()=> playSe(_silence, 0, 1)));
  };


  // Prepare all WebAudio things at once, and only once.
  // Returns a falsy value if WebAudio is unavailable (also if preparation
  // is failed), and then all api become no-op. it never throws.
  var boot = ()=> {
    if (_isTriedBoot || !(AC && OAC)) { return _audioContext }
    _isTriedBoot = 1;
    try {
      _audioContext = new AC;
      _masterGainNode = _audioContext.createGain();
      _masterGainNode.gain.value = _masterVolume;
      _silence = _audioContext.createBuffer(1, 2, _audioContext.sampleRate);
      interpolate(_extraNode);
      installUnlockHandler();
    } catch (e) {}
    return _audioContext;
  };


  var interpolate = (extraNode=undefined) => {
    // Disconnect old connections at first
    var oldNode = _extraNode;
    _extraNode = extraNode;
    if (!_masterGainNode) { return } // it is connected in `boot()`, later
    _masterGainNode.disconnect();
    if (oldNode) { oldNode.disconnect() }
    extraNode ? _masterGainNode.connect(extraNode).connect(_audioContext.destination) : _masterGainNode.connect(_audioContext.destination);
  }


  var isAudioBuffer = (o)=> (o instanceof AudioBuffer);


  var asyncLoadAudioBuffer = async (url) => {
    if (!boot()) { return }
    if (!_oac) { _oac = new OAC(2, 2, _audioContext.sampleRate) }
    var res = await fetch(url);
    if (!res.ok) throw new Error(url);
    var arrayBuffer = await res.arrayBuffer();
    return await _oac.decodeAudioData(arrayBuffer);
  };


  var disposeSourceNodeSafely = (sourceNode)=> {
    // !!! Free buffer from memory immediately, this is almost essential !!!
    try { sourceNode.stop() } catch (e) {};
    try { sourceNode.disconnect() } catch (e) {};
    try { sourceNode.buffer = null } catch (e) {};
  };


  var prepareSourceNode = (audioBuffer)=> {
    var sourceNode = _audioContext.createBufferSource();
    sourceNode.buffer = audioBuffer;
    var endedFn = (e)=> {
      disposeSourceNodeSafely(sourceNode);
    };
    sourceNode.addEventListener("ended", endedFn, {once: true});
    // NB: can use createStereoPanner in iOS from 2021/04
    var stereoPannerNode = _audioContext.createStereoPanner?.();
    var gainNode = _audioContext.createGain();
    (stereoPannerNode ? sourceNode.connect(stereoPannerNode) : sourceNode).connect(gainNode).connect(_masterGainNode);
    sourceNode.G = gainNode;
    sourceNode.P = stereoPannerNode;
    return sourceNode;
  };


  var playingStack = [];
  var playSe = (audioBuffer, dontStartAutomatically=0, dontReduceVolumeByExcessPlay=0)=> {
    if (!boot()) { return }
    unlockAudioContext(); // unlock, first
    if (isAudioBuffer(audioBuffer)) {
      var sourceNode = prepareSourceNode(audioBuffer);
      if (!dontReduceVolumeByExcessPlay) {
        for (var i = playingStack.length-1; 0 <= i; i--) {
          var [oldAb, oldSn] = playingStack[i];
          if (
            // prevent huge volume by same many SE
            (oldAb === audioBuffer)
            ||
            // prevent huge volume by many SE before unlocking
            (_audioContext.state == stateSuspended)
          ) {
            oldSn.G.gain.value /= 2;
          }
          if (!oldSn.buffer) { playingStack.splice(i, 1) }
        }
        playingStack.push([audioBuffer, sourceNode]);
      }
      if (!dontStartAutomatically) {
        sourceNode.start();
        // cancel to play SE if suspended and elapsed some sec
        if (_audioContext.state == stateSuspended) {
          setTimeout(() => ((_audioContext.state == stateSuspended) && disposeSourceNodeSafely(sourceNode)), 999);
        }
      }
      return sourceNode;
    }
  };


  var bgmState = {};
  var bgmSerial = 0;


  var bgmStartImmediately = (playParams)=> {
    var [audioBuffer, isOneshot, fadeSec, pitch, volume, pan] = playParams;
    var sn = playSe(audioBuffer, 1, 1);
    if (!sn) { return bgmStopImmediatelyAndPlayNextBgm() }
    sn.loop = !isOneshot;
    sn.G.gain.value = volume;
    sn.playbackRate.value = pitch;
    var panNode = sn.P?.pan;
    if (panNode) { panNode.value = pan }
    bgmState.playParams = playParams;
    bgmState.sourceNode = sn;
    sn.start();
  };


  var bgmStopImmediatelyAndPlayNextBgm = ()=> {
    var sn = bgmState.sourceNode;
    sn && disposeSourceNodeSafely(sn);
    var nextParams = bgmState.nextParams;
    bgmState = {};
    nextParams && bgmStartImmediately(nextParams);
  };


  var isEqualsTwoArrays = (arr1, arr2)=> (arr1.length == arr2.length) && arr1.every((v, i) => (v === arr2[i]));


  var cachedBgmAbList = [];
  var referCachedBgmAb = (k) => cachedBgmAbList.find(([k2]) => (k === k2))?.[1];
  var pushCachedBgmAb = (k, ab) => {
    // NB: this cache is naive (no refcount, no update of existing entry)
    cachedBgmAbList.unshift([k, ab]);
    cachedBgmAbList.length = Math.min(cachedBgmAbList.length, _va.BCL);
  };


  var playBgm = (audioBuffer, isOneshot=0, fadeSec=1, pitch=1, volume=1, pan=0)=> {
    if (!boot()) { return [] }
    if (audioBuffer != null && !isAudioBuffer(audioBuffer)) {
      var cachedAb = referCachedBgmAb(audioBuffer);
      if (cachedAb) { audioBuffer = cachedAb }
    }
    var playBgmArgs = [audioBuffer, isOneshot, fadeSec, pitch, volume, pan];

    var sn = bgmState.sourceNode;
    var pp = bgmState.playParams;
    var isAlreadyPlayingBgm = (sn?.buffer && !bgmState.isFading && pp);

    var resumeParams = []; // playBgm returns resumeParams
    if (audioBuffer == null) {
      // set resumeParams to args for resume bgm
      if (bgmState.nextParams) {
        resumeParams = [... bgmState.nextParams];
      } else if (isAlreadyPlayingBgm) {
        resumeParams = [... pp];
      }
    }

    if (isAlreadyPlayingBgm && isEqualsTwoArrays(playBgmArgs, pp)) {
      // already playing same bgm, nothing changed
      return resumeParams;
    }

    bgmSerial++;
    // if audioBuffer is not instanceof AudioBuffer, try to VA.L() first
    if (audioBuffer != null && !isAudioBuffer(audioBuffer)) {
      playBgm(null, false, fadeSec); // Stop bgm at first
      var expectedSerial = bgmSerial;
      // NB: a failure of loading should be ignored silently, not throw
      _va.L(audioBuffer).catch(()=> {}).then((ab)=> (ab && ((cachedAb || pushCachedBgmAb(audioBuffer, ab)), ((expectedSerial == bgmSerial) && playBgm(ab, isOneshot, fadeSec, pitch, volume, pan)))));
      return resumeParams;
    }

    // reserve (or update) next bgm
    bgmState.nextParams = audioBuffer ? playBgmArgs : null;
    if (bgmState.isFading) { return resumeParams }
    if (!(sn?.buffer) || !sn.G || !fadeSec) {
      bgmStopImmediatelyAndPlayNextBgm();
      return resumeParams;
    }

    // start fading
    bgmState.isFading = true;
    var intervalMsec = fadeSec * 99;
    var decGain = sn.G.gain.value / 9;
    var tick = ()=> (((sn.G.gain.value -= decGain) <= 0) || !sn.buffer) ? bgmStopImmediatelyAndPlayNextBgm() : setTimeout(tick, intervalMsec);
    setTimeout(tick, intervalMsec);
    return resumeParams;
  };


  var _va = {
    L: asyncLoadAudioBuffer, // *async* Load audioBuffer from audio-url
    P: playSe, // Play audioBuffer, return sourceNode (or undefined, when could not play)
    BGM: playBgm, // play audioBuffer as BGM
    D: disposeSourceNodeSafely, // stop and Dispose played sourceNode safely
    I: interpolate, // Interpolate extra node between masterGainNode and ac.destination

    get V () { return _masterVolume }, // get master Volume
    set V (v) {
      _masterVolume = v;
      if (_masterGainNode) { _masterGainNode.gain.value = v }
    }, // set master Volume
    get A () { return boot() }, // Audio context (undefined if unavailable)
    VER: 'va99-' + version,
    BCL: 2, // BGM cache limit

    // sourceNode.G is GainNode, you can change sourceNode.G.gain.value
    // sourceNode.P is StereoPannerNode, you can change sourceNode.P.pan.value
    // (but it is not exists in iOS earlier 2021/04)
  };

  return _va;
})();
