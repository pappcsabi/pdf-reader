const TTSEngine = {
  synth: null,
  chunks: [],
  currentChunkIndex: 0,
  isPlaying: false,
  isPaused: false,
  rate: 1,
  voice: null,
  chunkDurations: [],
  totalElapsed: 0,
  provider: 'web',
  apiVoice: 'ro-RO-EmilNeural',
  currentAudio: null,
  fullDocumentAudio: null,
  playbackSession: 0,
  activeAudios: new Set(),
  abortController: null,
  useFullDocumentAudio: false, // Pentru iOS - folosește un singur audio pentru întreg documentul (dezactivat pentru compatibilitate)
  nextAudioPreload: null, // Preîncărcare următorul chunk pentru iOS
  audioQueue: [], // Queue pentru chunks preîncărcate

  init() {
    this.synth = window.speechSynthesis;
    this.rate = parseFloat(document.getElementById('rate-slider')?.value || 1);
  },

  splitIntoChunks(text) {
    if (!text || !text.trim()) return [];
    const sentences = text.match(/[^.!?]+[.!?]*/g) || [text];
    return sentences.map((s) => s.trim()).filter(Boolean);
  },

  speakChunkWeb(index) {
    if (index < 0 || index >= this.chunks.length) return;
    this.currentChunkIndex = index;
    const session = this.playbackSession;
    const text = this.chunks[index];
    const u = new SpeechSynthesisUtterance(text);
    u.rate = this.rate;
    u.voice = this.voice;
    u.lang = 'ro-RO';
    u.onstart = () => { 
      if (session === this.playbackSession) {
        this.emit('chunk', index);
        if (navigator.mediaSession) navigator.mediaSession.playbackState = 'playing';
      }
    };
    u.onend = () => {
      if (session !== this.playbackSession) return;
      if (index !== this.currentChunkIndex) return;
      if (!this.isPlaying) {
        if (navigator.mediaSession) navigator.mediaSession.playbackState = 'none';
        return;
      }
      const nextIdx = index + 1;
      if (nextIdx < this.chunks.length) {
        // Păstrează starea "playing" pentru Media Session între chunks
        if (navigator.mediaSession) navigator.mediaSession.playbackState = 'playing';
        this.speakChunk(nextIdx);
      } else {
        this.isPlaying = false;
        if (navigator.mediaSession) navigator.mediaSession.playbackState = 'none';
        this.emit('end');
      }
    };
    this.synth.speak(u);
  },

  async preloadNextChunk(index) {
    const nextIdx = index + 1;
    if (nextIdx >= this.chunks.length || this.nextAudioPreload) return;
    
    const session = this.playbackSession;
    const text = this.chunks[nextIdx];
    const signal = this.abortController?.signal;
    
    try {
      const res = await fetch('/api/tts/generate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, engine: this.provider, voice: this.apiVoice }),
        signal,
      });
      
      if (session !== this.playbackSession) return;
      if (!res.ok) return;
      
      const blob = await res.blob();
      if (session !== this.playbackSession) return;
      
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.preload = 'auto';
      audio.setAttribute('playsinline', 'true');
      
      // Preîncarcă audio-ul
      audio.load();
      
      this.nextAudioPreload = { audio, url, index: nextIdx };
      this.audioQueue.push({ audio, url, index: nextIdx });
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Preload error:', err);
      }
    }
  },

  async speakChunkApi(index) {
    if (index < 0 || index >= this.chunks.length) return;
    this.currentChunkIndex = index;
    const session = this.playbackSession;
    if (session !== this.playbackSession) return;
    this.emit('chunk', index);
    
    // Verifică dacă avem deja chunk-ul preîncărcat în queue
    let audio, url;
    const queued = this.audioQueue.find(q => q.index === index);
    
    if (queued) {
      // Folosește chunk-ul preîncărcat
      audio = queued.audio;
      url = queued.url;
      this.audioQueue = this.audioQueue.filter(q => q.index !== index);
      if (this.nextAudioPreload && this.nextAudioPreload.index === index) {
        this.nextAudioPreload = null;
      }
    } else {
      // Încarcă chunk-ul nou
      const text = this.chunks[index];
      const signal = this.abortController?.signal;
      try {
        const res = await fetch('/api/tts/generate', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, engine: this.provider, voice: this.apiVoice }),
          signal,
        });
        if (session !== this.playbackSession) return;
        if (!res.ok) throw new Error('TTS failed');
        const blob = await res.blob();
        if (session !== this.playbackSession) return;
        url = URL.createObjectURL(blob);
        audio = new Audio(url);
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error(err);
        if (session === this.playbackSession) {
          this.isPlaying = false;
          if (navigator.mediaSession) navigator.mediaSession.playbackState = 'none';
          this.emit('end');
        }
        return;
      }
    }
    
    this.currentAudio = audio;
    this.activeAudios.add(audio);
    audio.playbackRate = this.rate;
    
    // Pentru iOS - marcarea ca media activă pentru Media Session
    audio.setAttribute('playsinline', 'true');
    audio.setAttribute('preload', 'auto');
    
    // Preîncarcă următorul chunk când acesta începe să se redă
    audio.onplay = () => {
      if (session === this.playbackSession && navigator.mediaSession) {
        navigator.mediaSession.playbackState = 'playing';
      }
      // Preîncarcă următorul chunk imediat ce acesta începe
      this.preloadNextChunk(index);
    };
    
    // Pentru iOS - folosește timeupdate pentru a detecta apropierea de sfârșit
    audio.ontimeupdate = () => {
      if (session !== this.playbackSession) return;
      // Când mai sunt ~2 secunde, preîncarcă următorul chunk dacă nu e deja preîncărcat
      if (audio.duration && audio.duration - audio.currentTime < 2 && !this.nextAudioPreload) {
        this.preloadNextChunk(index);
      }
    };
    
    audio.onended = () => {
      this.activeAudios.delete(audio);
      this.currentAudio = null;
      if (url && !queued) URL.revokeObjectURL(url);
      
      if (session !== this.playbackSession) return;
      if (!this.isPlaying) {
        if (navigator.mediaSession) navigator.mediaSession.playbackState = 'none';
        return;
      }
      
      // Continuă cu următorul chunk - folosește preîncărcat dacă există
      const nextIdx = index + 1;
      if (nextIdx < this.chunks.length) {
        if (navigator.mediaSession) navigator.mediaSession.playbackState = 'playing';
        
        // Folosește chunk-ul preîncărcat dacă există
        if (this.nextAudioPreload && this.nextAudioPreload.index === nextIdx) {
          const preloaded = this.nextAudioPreload;
          this.nextAudioPreload = null;
          this.audioQueue = this.audioQueue.filter(q => q.index !== nextIdx);
          // Continuă direct cu chunk-ul preîncărcat
          this.speakChunkApi(nextIdx);
        } else {
          this.speakChunk(nextIdx);
        }
      } else {
        this.isPlaying = false;
        if (navigator.mediaSession) navigator.mediaSession.playbackState = 'none';
        this.emit('end');
      }
    };
    
    audio.onerror = () => {
      this.activeAudios.delete(audio);
      this.currentAudio = null;
      if (url && !queued) URL.revokeObjectURL(url);
      if (session !== this.playbackSession) return;
      this.isPlaying = false;
      if (navigator.mediaSession) navigator.mediaSession.playbackState = 'none';
      this.emit('end');
    };
    
    // Pornește playback-ul
    try {
      await audio.play();
      if (session === this.playbackSession && navigator.mediaSession) {
        navigator.mediaSession.playbackState = 'playing';
      }
    } catch (err) {
      console.error('Audio play error:', err);
      if (session === this.playbackSession) {
        this.isPlaying = false;
        if (navigator.mediaSession) navigator.mediaSession.playbackState = 'none';
        this.emit('end');
      }
    }
  },

  async playFullDocument(text) {
    const session = this.playbackSession;
    const signal = this.abortController?.signal;
    try {
      this.emit('play');
      if (navigator.mediaSession) navigator.mediaSession.playbackState = 'playing';
      
      console.log('Generating full document audio:', { 
        engine: this.provider, 
        voice: this.apiVoice, 
        textLength: text.length,
        useFullDocumentAudio: this.useFullDocumentAudio 
      });
      
      if (!this.provider || this.provider === 'web') {
        throw new Error('Provider invalid pentru API mode: ' + this.provider);
      }
      
      const requestBody = { text, engine: this.provider, voice: this.apiVoice };
      console.log('TTS Request:', requestBody);
      
      const res = await fetch('/api/tts/generate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal,
      });
      
      console.log('TTS Response status:', res.status, res.statusText);
      
      if (session !== this.playbackSession) return;
      if (!res.ok) {
        const errorText = await res.text();
        console.error('TTS API error:', res.status, errorText);
        throw new Error(`TTS failed: ${res.status} ${errorText}`);
      }
      
      const blob = await res.blob();
      if (session !== this.playbackSession) return;
      
      console.log('Audio blob received:', { size: blob.size, type: blob.type });
      
      if (blob.size === 0) {
        throw new Error('Empty audio blob received');
      }
      
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      this.fullDocumentAudio = audio;
      this.currentAudio = audio;
      this.activeAudios.add(audio);
      audio.playbackRate = this.rate;
      
      // Pentru iOS - marcarea ca media activă pentru Media Session
      audio.setAttribute('playsinline', 'true');
      audio.setAttribute('preload', 'auto');
      
      // Tracking pentru prompter - estimează când fiecare chunk este citit
      const estimatedChunkDurations = this.chunks.map(chunk => {
        // Estimează ~150 cuvinte/minut la viteza 1.0
        const words = chunk.split(/\s+/).length;
        const baseDuration = (words / 150) * 60 * 1000; // ms
        return baseDuration / this.rate;
      });
      
      let currentChunkIdx = 0;
      let chunkStartTime = 0;
      
      const updateChunkFromTime = () => {
        if (!audio || session !== this.playbackSession || !this.isPlaying) return;
        const currentTime = audio.currentTime * 1000; // ms
        let accumulated = 0;
        let newChunkIdx = 0;
        for (let i = 0; i < estimatedChunkDurations.length; i++) {
          accumulated += estimatedChunkDurations[i];
          if (currentTime <= accumulated) {
            newChunkIdx = i;
            break;
          }
          newChunkIdx = i + 1;
        }
        if (newChunkIdx >= this.chunks.length) {
          newChunkIdx = this.chunks.length - 1;
        }
        if (newChunkIdx !== currentChunkIdx) {
          currentChunkIdx = newChunkIdx;
          this.currentChunkIndex = currentChunkIdx;
          this.emit('chunk', currentChunkIdx);
        }
      };
      
      const timeUpdateInterval = setInterval(() => {
        if (session !== this.playbackSession || !this.isPlaying) {
          clearInterval(timeUpdateInterval);
          return;
        }
        updateChunkFromTime();
      }, 100); // Verifică la fiecare 100ms
      
      audio.onplay = () => {
        if (session === this.playbackSession && navigator.mediaSession) {
          navigator.mediaSession.playbackState = 'playing';
        }
        updateChunkFromTime();
      };
      
      audio.onended = () => {
        clearInterval(timeUpdateInterval);
        this.activeAudios.delete(audio);
        this.currentAudio = null;
        if (this.fullDocumentAudio === audio) {
          this.fullDocumentAudio = null;
        }
        URL.revokeObjectURL(url);
        if (session !== this.playbackSession) return;
        this.isPlaying = false;
        this.currentChunkIndex = this.chunks.length - 1;
        this.emit('chunk', this.currentChunkIndex);
        if (navigator.mediaSession) navigator.mediaSession.playbackState = 'none';
        this.emit('end');
      };
      
      audio.onerror = () => {
        clearInterval(timeUpdateInterval);
        this.activeAudios.delete(audio);
        this.currentAudio = null;
        this.fullDocumentAudio = null;
        URL.revokeObjectURL(url);
        if (session !== this.playbackSession) return;
        this.isPlaying = false;
        if (navigator.mediaSession) navigator.mediaSession.playbackState = 'none';
        this.emit('end');
      };
      
      audio.onpause = () => {
        if (session === this.playbackSession && navigator.mediaSession) {
          navigator.mediaSession.playbackState = 'paused';
        }
      };
      
      await audio.play().catch(err => {
        clearInterval(timeUpdateInterval);
        console.error('Audio play error:', err);
        if (session === this.playbackSession) {
          this.isPlaying = false;
          if (navigator.mediaSession) navigator.mediaSession.playbackState = 'none';
          this.emit('end');
        }
        throw err;
      });
      
      console.log('Audio playback started successfully');
      
      // Asigură-te că Media Session știe că este în playing
      if (session === this.playbackSession && navigator.mediaSession) {
        navigator.mediaSession.playbackState = 'playing';
      }
      
      // Emite primul chunk imediat
      this.currentChunkIndex = 0;
      this.emit('chunk', 0);
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('TTS request aborted');
        return;
      }
      console.error('playFullDocument error:', err);
      if (session === this.playbackSession) {
        this.isPlaying = false;
        if (navigator.mediaSession) navigator.mediaSession.playbackState = 'none';
        this.emit('end');
        // Emite un eveniment de eroare pentru a afișa mesaj utilizatorului
        this.emit('error', err.message || 'Eroare la generarea audio');
      }
    }
  },

  speakChunk(index) {
    if (this.provider === 'web') this.speakChunkWeb(index);
    else this.speakChunkApi(index);
  },

  _cancelAll() {
    this.playbackSession += 1;
    try { this.abortController?.abort(); } catch (_) {}
    this.abortController = new AbortController();
    if (this.provider === 'web' && this.synth) this.synth.cancel();
    this.activeAudios.forEach((a) => { try { a.pause(); a.currentTime = 0; } catch (_) {} });
    this.activeAudios.clear();
    this.currentAudio = null;
    
    // Curăță queue-ul de chunks preîncărcate
    this.audioQueue.forEach(({ audio, url }) => {
      try {
        audio.pause();
        URL.revokeObjectURL(url);
      } catch (_) {}
    });
    this.audioQueue = [];
    if (this.nextAudioPreload) {
      try {
        this.nextAudioPreload.audio.pause();
        URL.revokeObjectURL(this.nextAudioPreload.url);
      } catch (_) {}
      this.nextAudioPreload = null;
    }
    
    if (this.fullDocumentAudio) {
      try {
        this.fullDocumentAudio.pause();
        this.fullDocumentAudio.currentTime = 0;
        URL.revokeObjectURL(this.fullDocumentAudio.src);
      } catch (_) {}
      this.fullDocumentAudio = null;
    }
  },

  play(text, startIndex = 0) {
    if (this.provider === 'web' && !this.synth) this.init();
    this._cancelAll();
    this.chunks = this.splitIntoChunks(text || '');
    this.currentChunkIndex = Math.max(0, Math.min(startIndex, this.chunks.length - 1));
    this.totalElapsed = 0;
    this.isPlaying = true;
    this.isPaused = false;
    if (this.chunks.length > 0) {
      this.speakChunk(this.currentChunkIndex);
      this.emit('play');
    } else {
      this.isPlaying = false;
      this.emit('end');
    }
  },

  prepare(text) {
    this.chunks = this.splitIntoChunks(text || '');
    // Resetează full document audio când se pregătește un document nou
    if (this.fullDocumentAudio) {
      try {
        this.fullDocumentAudio.pause();
        URL.revokeObjectURL(this.fullDocumentAudio.src);
      } catch (_) {}
      this.fullDocumentAudio = null;
    }
  },

  playFrom(index) {
    if (!this.chunks.length || index < 0 || index >= this.chunks.length) return;
    
    // Dacă avem full document audio, setează poziția în audio bazat pe estimare
    if (this.fullDocumentAudio && this.provider !== 'web') {
      const estimatedChunkDurations = this.chunks.map(chunk => {
        const words = chunk.split(/\s+/).length;
        const baseDuration = (words / 150) * 60; // secunde
        return baseDuration / this.rate;
      });
      let targetTime = 0;
      for (let i = 0; i < index && i < estimatedChunkDurations.length; i++) {
        targetTime += estimatedChunkDurations[i];
      }
      this.fullDocumentAudio.currentTime = targetTime;
      this.currentChunkIndex = index;
      this.isPlaying = true;
      this.isPaused = false;
      this.fullDocumentAudio.play().then(() => {
        if (navigator.mediaSession) navigator.mediaSession.playbackState = 'playing';
      }).catch(() => {});
      this.emit('play');
      this.emit('chunk', index);
      return;
    }
    
    this._cancelAll();
    this.currentChunkIndex = index;
    this.isPlaying = true;
    this.isPaused = false;
    this.speakChunk(index);
    this.emit('play');
  },

  getProgress() {
    if (this.chunks.length === 0) return { current: 0, total: 0, percent: 0 };
    return {
      current: this.currentChunkIndex + 1,
      total: this.chunks.length,
      percent: Math.round(((this.currentChunkIndex + 1) / this.chunks.length) * 100),
    };
  },

  pause() {
    if (this.provider === 'web' && this.synth) this.synth.pause();
    if (this.fullDocumentAudio) {
      this.fullDocumentAudio.pause();
    }
    this.activeAudios.forEach((a) => { try { a.pause(); } catch (_) {} });
    this.isPaused = true;
    this.emit('pause');
  },

  resume() {
    if (this.provider === 'web' && this.synth) {
      this.synth.resume();
    }
    if (this.fullDocumentAudio) {
      this.fullDocumentAudio.play().then(() => {
        if (navigator.mediaSession) navigator.mediaSession.playbackState = 'playing';
      }).catch(() => {});
    }
    this.activeAudios.forEach((a) => { 
      try { 
        a.play().then(() => {
          if (navigator.mediaSession) navigator.mediaSession.playbackState = 'playing';
        }).catch(() => {});
      } catch (_) {} 
    });
    this.isPaused = false;
    this.emit('resume');
  },

  stop() {
    this._cancelAll();
    this.isPlaying = false;
    this.isPaused = false;
    this.emit('stop');
  },

  skipForward(seconds = 10) {
    if (!this.isPlaying || this.chunks.length === 0) return;
    
    // Pentru full document audio, skip direct în audio
    if (this.fullDocumentAudio && this.provider !== 'web') {
      const newTime = Math.min(
        this.fullDocumentAudio.currentTime + seconds,
        this.fullDocumentAudio.duration || Infinity
      );
      this.fullDocumentAudio.currentTime = newTime;
      // Actualizează chunk index bazat pe timp
      const estimatedChunkDurations = this.chunks.map(chunk => {
        const words = chunk.split(/\s+/).length;
        const baseDuration = (words / 150) * 60; // secunde
        return baseDuration / this.rate;
      });
      let accumulated = 0;
      let newChunkIdx = 0;
      for (let i = 0; i < estimatedChunkDurations.length; i++) {
        accumulated += estimatedChunkDurations[i];
        if (newTime <= accumulated) {
          newChunkIdx = i;
          break;
        }
        newChunkIdx = i + 1;
      }
      this.currentChunkIndex = Math.min(newChunkIdx, this.chunks.length - 1);
      this.emit('chunk', this.currentChunkIndex);
      return;
    }
    
    const estPerChunk = 4;
    const chunksToSkip = Math.max(1, Math.floor(seconds / estPerChunk));
    const newIndex = Math.min(this.currentChunkIndex + chunksToSkip, this.chunks.length - 1);
    this._cancelAll();
    this.isPlaying = true;
    this.isPaused = false;
    if (newIndex < this.chunks.length) this.speakChunk(newIndex);
    else { this.isPlaying = false; this.emit('end'); }
  },

  skipBackward(seconds = 10) {
    if (!this.chunks.length) return;
    
    // Pentru full document audio, skip direct în audio
    if (this.fullDocumentAudio && this.provider !== 'web') {
      const newTime = Math.max(0, this.fullDocumentAudio.currentTime - seconds);
      this.fullDocumentAudio.currentTime = newTime;
      // Actualizează chunk index bazat pe timp
      const estimatedChunkDurations = this.chunks.map(chunk => {
        const words = chunk.split(/\s+/).length;
        const baseDuration = (words / 150) * 60; // secunde
        return baseDuration / this.rate;
      });
      let accumulated = 0;
      let newChunkIdx = 0;
      for (let i = 0; i < estimatedChunkDurations.length; i++) {
        accumulated += estimatedChunkDurations[i];
        if (newTime <= accumulated) {
          newChunkIdx = i;
          break;
        }
        newChunkIdx = i + 1;
      }
      this.currentChunkIndex = Math.max(0, newChunkIdx);
      this.emit('chunk', this.currentChunkIndex);
      return;
    }
    
    const estPerChunk = 4;
    const chunksToSkip = Math.max(1, Math.floor(seconds / estPerChunk));
    const newIndex = Math.max(0, this.currentChunkIndex - chunksToSkip);
    this._cancelAll();
    this.isPlaying = true;
    this.isPaused = false;
    this.speakChunk(newIndex);
  },

  setRate(r) {
    this.rate = r;
    if (this.fullDocumentAudio) {
      this.fullDocumentAudio.playbackRate = r;
    }
    this.reapplyIfPlaying();
  },

  setVoice(v) {
    this.voice = v;
    this.reapplyIfPlaying();
  },

  reapplyIfPlaying() {
    if (this.isPlaying && !this.isPaused && this.chunks.length > 0) {
      // Pentru full document audio, doar actualizează playback rate
      if (this.fullDocumentAudio && this.provider !== 'web') {
        this.fullDocumentAudio.playbackRate = this.rate;
        return;
      }
      this._cancelAll();
      this.isPlaying = true;
      this.isPaused = false;
      this.speakChunk(this.currentChunkIndex);
    }
  },

  setApiVoice(id) {
    this.apiVoice = id;
    this.reapplyIfPlaying();
  },

  getVoices() {
    return this.synth?.getVoices() || [];
  },

  _listeners: {},
  on(ev, fn) {
    (this._listeners[ev] = this._listeners[ev] || []).push(fn);
  },
  emit(ev, data) {
    (this._listeners[ev] || []).forEach((fn) => fn(data));
  },
};
