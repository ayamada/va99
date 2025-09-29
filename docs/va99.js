// don't set `const`, `let`, `var` to VA (for google-closure-compiler)
VA = (()=> {
  const version = '5.5.20250929'; /* auto-updated */


  const stateSuspended = "suspended";


  // I want to prepare instance of AudioContext lazily,
  // but loader need value of sampleRate,
  // and sampleRate is only provided by `_audioContext.sampleRate`.
  // So this is prepared eagerly, cannot be helped.
  // This is warned by Chromium, but cannot be helped.
  var _audioContext = new (self.AudioContext||self.webkitAudioContext);
  var unlockAudioContext = ()=> {
    // unlock AudioContext for chromium and firefox
    // and resume from interrupted for iOS
    if ((_audioContext.state == stateSuspended)||(_audioContext.state == "interrupted")) {
      try { _audioContext.resume() } catch (e) {};
    }
  };


  var _masterGainNode = _audioContext.createGain();
  var _masterVolume = _masterGainNode.gain.value = 0.2;
  var _extraNode;
  var interpolate = (extraNode=undefined) => {
    // Disconnect old connections at first
    if (_extraNode) {
      _masterGainNode.disconnect();
      _extraNode.disconnect();
    } else {
      _masterGainNode.disconnect();
    }
    _extraNode = extraNode;
    if (extraNode) {
      _masterGainNode.connect(extraNode).connect(_audioContext.destination);
    } else {
      _masterGainNode.connect(_audioContext.destination);
    }
  }


  var isAudioBuffer = (o)=> (o instanceof AudioBuffer);


  var oac = new (self.OfflineAudioContext||self.webkitOfflineAudioContext)(2, 2, _audioContext.sampleRate);
  var asyncLoadAudioBuffer = async (url) => {
    var res = await fetch(url);
    if (!res.ok) throw new Error(url);
    var arrayBuffer = await res.arrayBuffer();
    return await oac.decodeAudioData(arrayBuffer);
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
  var playAudioBufferInternal = (audioBuffer, asBgm, dontReduceVolumeByExcessPlay)=> {
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
      if (!asBgm) { sourceNode.start() }
      if ((!asBgm) && (_audioContext.state == stateSuspended)) {
        setTimeout(() => ((_audioContext.state == stateSuspended) && disposeSourceNodeSafely(sourceNode)), 999);
      }
      return sourceNode;
    }
  };
  var playSe = (audioBuffer)=> playAudioBufferInternal(audioBuffer, 0, 0);


  var bgmState = {};
  var bgmSerial = 0;


  var bgmStartImmediately = (playParams)=> {
    var [audioBuffer, isOneshot, fadeSec, pitch, volume, pan, key] = playParams;
    var sn = playAudioBufferInternal(audioBuffer, 1, 1);
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
    // it is naive, can shortcut it crudely
    //var alreadyExistIdx = cachedBgmAbList.findIndex(([k2]) => (k === k2));
    //if (alreadyExistIdx != -1) { cachedBgmAbList.splice(alreadyExistIdx, 1) }
    cachedBgmAbList.unshift([k, ab]);
    cachedBgmAbList.length = Math.min(cachedBgmAbList.length, _va.BCL);
  };


  var playBgm = (audioBuffer, isOneshot=0, fadeSec=1, pitch=1, volume=1, pan=0)=> {
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
      var cachedAb = referCachedBgmAb(audioBuffer);
      var loading = cachedAb ? (new Promise((res) => res(cachedAb))) : _va.L(audioBuffer);
      loading.then((ab)=> (ab && ((cachedAb || pushCachedBgmAb(audioBuffer, ab)), ((expectedSerial == bgmSerial) && playBgm(ab, isOneshot, fadeSec, pitch, volume, pan)))));
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


  interpolate(0);


  var silence = _audioContext.createBuffer(1, 2, _audioContext.sampleRate);
  // unlock AudioContext and resume from interrupted by click for PC browsers
  var clickHandle = () => {
    playAudioBufferInternal(silence, 0, 1);
    document.removeEventListener("click", clickHandle);
  };
  document.addEventListener("click", clickHandle);
  // unlock AudioContext and resume from interrupted by touch actions for iOS
  // should not remove handle by removeEventListener
  // (in iOS, AudioContext may unlocks again by OS)
  ["touchstart", "touchend"].forEach((k)=> document.addEventListener(k, ()=> playAudioBufferInternal(silence, 0, 1)));


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
    get A () { return _audioContext }, // Audio context
    VER: 'va99-' + version,
    BCL: 2, // BGM cache limit

    // sourceNode.G is GainNode, you can change sourceNode.G.gain.value
    // sourceNode.P is StereoPannerNode, you can change sourceNode.P.pan.value
    // (but it is not exists in iOS earlier 2021/04)
  };

  return _va;
})();
