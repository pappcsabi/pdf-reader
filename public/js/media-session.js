const MediaSession = {
  init(ttsEngine) {
    if (!navigator.mediaSession) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: 'PDF Reader',
      artist: 'Cititor documente',
    });

    navigator.mediaSession.setActionHandler('play', () => {
      if (ttsEngine.isPaused) {
        ttsEngine.resume();
      } else if (!ttsEngine.isPlaying && ttsEngine.chunks.length > 0) {
        ttsEngine.playFrom(ttsEngine.currentChunkIndex);
      }
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      ttsEngine.pause();
    });

    navigator.mediaSession.setActionHandler('seekbackward', () => {
      ttsEngine.skipBackward(10);
    });

    navigator.mediaSession.setActionHandler('seekforward', () => {
      ttsEngine.skipForward(10);
    });

    ttsEngine.on('play', () => {
      if (navigator.mediaSession) {
        navigator.mediaSession.playbackState = 'playing';
      }
    });
    ttsEngine.on('resume', () => {
      if (navigator.mediaSession) {
        navigator.mediaSession.playbackState = 'playing';
      }
    });
    ttsEngine.on('pause', () => {
      if (navigator.mediaSession) {
        navigator.mediaSession.playbackState = 'paused';
      }
    });
    ttsEngine.on('stop', () => {
      if (navigator.mediaSession) {
        navigator.mediaSession.playbackState = 'none';
      }
    });
    ttsEngine.on('end', () => {
      if (navigator.mediaSession) {
        navigator.mediaSession.playbackState = 'none';
      }
    });
    ttsEngine.on('chunk', () => {
      // Păstrează starea "playing" când începe un nou chunk
      if (navigator.mediaSession && ttsEngine.isPlaying) {
        navigator.mediaSession.playbackState = 'playing';
      }
    });
  },

  updateMetadata(title) {
    if (!navigator.mediaSession) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: title || 'PDF Reader',
      artist: 'Cititor documente',
    });
  },
};
