// don't set `const`, `let`, `var` to VA (for google-closure-compiler)
VA = (()=> {
  const version = '5.1.20230925'; /* auto-updated */


  // I want to prepare instance of AudioContext lazily,
  // but loader need value of sampleRate,
  // and sampleRate is only provided by `_audioContext.sampleRate`.
  // So this is prepared eagerly, cannot be helped.
  // This is warned by Chromium, but cannot be helped.
  var _audioContext = new (self.AudioContext||self.webkitAudioContext);
  var unlockAudioContext = ()=> {
    // unlock AudioContext for chromium and firefox
    if (_audioContext.state == "suspended") {
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
  var playAudioBuffer = (audioBuffer, dontStartAutomatically=0, dontReduceVolumeByExcessPlay=0)=> {
    unlockAudioContext(); // unlock, first
    if (isAudioBuffer(audioBuffer)) {
      var sourceNode = prepareSourceNode(audioBuffer);
      if (!dontReduceVolumeByExcessPlay) {
        for (var i = playingStack.length-1; 0 <= i; i--) {
          var [oldAb, oldSn] = playingStack[i];
          if (oldAb === audioBuffer) { oldSn.G.gain.value /= 2 }
          if (!oldSn.buffer) { playingStack.splice(i, 1) }
        }
        playingStack.push([audioBuffer, sourceNode]);
      }
      if (!dontStartAutomatically) { sourceNode.start() }
      return sourceNode;
    }
  };


  var bgmState = {};
  var bgmSerial = 0;


  var bgmStartImmediately = (playParams)=> {
    var [key, audioBuffer, isOneshot, volume, pitch, pan] = playParams;
    var sn = playAudioBuffer(audioBuffer, 1, 1);
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


  var playBgm = (audioBuffer, isOneshot=0, fadeSec=1, pitch=1, volume=1, pan=0, _key=false)=> {
    _key ||= audioBuffer;
    var sn = bgmState.sourceNode;
    var pp = bgmState.playParams;
    if (sn?.buffer && !bgmState.isFading
      && (_key === pp[0])
      && (isOneshot == pp[2])
      && (volume == pp[3])
      && (pitch == pp[4])
      && (pan == pp[5])) {
      // already playing same bgm, nothing changed
      return;
    }

    bgmSerial++;
    // if audioBuffer is not instanceof AudioBuffer, try to VA.L() first
    if (audioBuffer != null && !isAudioBuffer(audioBuffer)) {
      playBgm(null, false, fadeSec); // Stop bgm at first
      var expectedSerial = bgmSerial;
      _va.L(audioBuffer).then((ab)=> ab && (expectedSerial == bgmSerial) && playBgm(ab, isOneshot, fadeSec, pitch, volume, pan, _key));
      return;
    }

    // reserve (or update) next bgm
    bgmState.nextParams = audioBuffer ? [_key, audioBuffer, isOneshot, volume, pitch, pan] : null;
    if (bgmState.isFading) { return }
    if (!(sn?.buffer) || !sn.G || !fadeSec) { return bgmStopImmediatelyAndPlayNextBgm() }

    // start fading
    bgmState.isFading = true;
    var intervalMsec = fadeSec * 99;
    var decGain = sn.G.gain.value / 9;
    var tick = ()=> (((sn.G.gain.value -= decGain) <= 0) || !sn.buffer) ? bgmStopImmediatelyAndPlayNextBgm() : setTimeout(tick, intervalMsec);
    setTimeout(tick, intervalMsec);
  };


  interpolate(0);


  // unlock AudioContext for iOS
  ["click", "touchstart", "touchend"].forEach((k)=> document.addEventListener(k, (() => playAudioBuffer(_audioContext.createBuffer(1, 2, _audioContext.sampleRate), 0, 1)), {once: true}));


  var _va = {
    L: asyncLoadAudioBuffer, // *async* Load audioBuffer from audio-url
    P: playAudioBuffer, // Play audioBuffer, return sourceNode
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

    // sourceNode.G is GainNode, you can change sourceNode.G.gain.value
    // sourceNode.P is StereoPannerNode, you can change sourceNode.P.pan.value
    // (but it is not exists in iOS earlier 2021/04)
  };

  return _va;
})();
