document.addEventListener('DOMContentLoaded', () => {
  const authSection = document.getElementById('auth-section');
  const dashboard = document.getElementById('dashboard');
  const userInfo = document.getElementById('user-info');
  const userEmail = document.getElementById('user-email');
  const btnLogout = document.getElementById('btn-logout');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const formLogin = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');
  const authError = document.getElementById('auth-error');
  const registerError = document.getElementById('register-error');
  const toggleRegister = document.getElementById('toggle-register');
  const toggleLogin = document.getElementById('toggle-login');
  const uploadZone = document.getElementById('upload-zone');
  const fileInput = document.getElementById('file-input');
  const btnUpload = document.getElementById('btn-upload');
  const documentsList = document.getElementById('documents');
  const readerPanel = document.getElementById('reader-panel');
  const readerTitle = document.getElementById('reader-title');
  const readerHint = document.getElementById('reader-hint');
  const prompter = document.getElementById('prompter');
  const prompterText = document.getElementById('prompter-text');
  const progressSection = document.getElementById('progress-section');
  const progressLabel = document.getElementById('progress-label');
  const progressPercent = document.getElementById('progress-percent');
  const progressSlider = document.getElementById('progress-slider');
  const chaptersSection = document.getElementById('chapters-section');
  const chaptersToggle = document.getElementById('chapters-toggle');
  const chaptersNav = document.getElementById('chapters-nav');
  const chaptersList = document.getElementById('chapters-list');
  const engineSelect = document.getElementById('engine-select');
  const rateSlider = document.getElementById('rate-slider');
  const rateValue = document.getElementById('rate-value');
  const voiceSelect = document.getElementById('voice-select');
  const btnPlay = document.getElementById('btn-play');
  const btnPause = document.getElementById('btn-pause');
  const btnBack = document.getElementById('btn-back');
  const btnForward = document.getElementById('btn-forward');
  const btnStop = document.getElementById('btn-stop');
  const iosHint = document.querySelector('.ios-hint');

  let currentUser = null;
  let currentDoc = null;

  TTSEngine.init();
  if (navigator.mediaSession) MediaSession.init(TTSEngine);
  if (/iPhone|iPad|iPod/.test(navigator.userAgent)) iosHint?.classList.remove('hidden');

  function populateVoicesWeb() {
    const voices = TTSEngine.getVoices();
    voiceSelect.innerHTML = '';
    const preferred = (v) => {
      const n = (v.name || '').toLowerCase();
      if (n.includes('google')) return 3;
      if (n.includes('microsoft') || n.includes('natural') || n.includes('neural')) return 2;
      if (n.includes('samantha') || n.includes('alex') || n.includes('daniel') || n.includes('karen')) return 1;
      return 0;
    };
    const ordered = [...voices].sort((a, b) => {
      const pa = preferred(a);
      const pb = preferred(b);
      if (pa !== pb) return pb - pa;
      const roA = a.lang.startsWith('ro') ? 2 : a.lang.startsWith('en') ? 1 : 0;
      const roB = b.lang.startsWith('ro') ? 2 : b.lang.startsWith('en') ? 1 : 0;
      if (roA !== roB) return roB - roA;
      return 0;
    });
    ordered.forEach((v) => {
      const opt = document.createElement('option');
      opt.value = v.name;
      opt.textContent = `${v.name} (${v.lang})`;
      voiceSelect.appendChild(opt);
    });
    if (voiceSelect.options.length) TTSEngine.setVoice(ordered[0]);
  }

  async function populateVoicesForEngine() {
    const engine = engineSelect?.value || 'web';
    console.log('Setting provider to:', engine);
    TTSEngine.provider = engine;
    if (engine === 'web') {
      populateVoicesWeb();
    } else {
      try {
        console.log('Fetching voices for engine:', engine);
        const res = await fetch(`/api/tts/voices?engine=${engine}`, { credentials: 'include' });
        console.log('Voices response:', res.status, res.statusText);
        const data = await res.json();
        console.log('Voices data:', data);
        voiceSelect.innerHTML = '';
        (data.voices || []).forEach((v) => {
          const opt = document.createElement('option');
          opt.value = v.id;
          opt.textContent = v.name;
          voiceSelect.appendChild(opt);
        });
        if (voiceSelect.options.length) {
          TTSEngine.setApiVoice(voiceSelect.options[0].value);
          console.log('Set API voice to:', voiceSelect.options[0].value);
        }
      } catch (err) {
        console.error('Error loading voices:', err);
        voiceSelect.innerHTML = '<option value="">Eroare încărcare voci</option>';
      }
    }
  }

  if (speechSynthesis) {
    speechSynthesis.onvoiceschanged = () => { if (TTSEngine.provider === 'web') populateVoicesWeb(); };
  }
  populateVoicesForEngine();

  engineSelect?.addEventListener('change', () => populateVoicesForEngine());

  rateSlider?.addEventListener('input', () => {
    const v = parseFloat(rateSlider.value);
    rateValue.textContent = v.toFixed(1);
    TTSEngine.setRate(v);
  });

  voiceSelect?.addEventListener('change', () => {
    const engine = engineSelect?.value || 'web';
    if (engine === 'web') {
      const voices = TTSEngine.getVoices();
      const v = voices.find((x) => x.name === voiceSelect.value);
      if (v) TTSEngine.setVoice(v);
    } else {
      TTSEngine.setApiVoice(voiceSelect.value);
    }
  });

  async function checkAuth() {
    try {
      currentUser = await Auth.getMe();
      if (currentUser) {
        authSection.classList.add('hidden');
        dashboard.classList.remove('hidden');
        userInfo.classList.remove('hidden');
        userEmail.textContent = currentUser.email;
        loadDocuments();
      } else {
        authSection.classList.remove('hidden');
        dashboard.classList.add('hidden');
        userInfo.classList.add('hidden');
      }
    } catch (err) {
      console.error('checkAuth error:', err);
      authSection.classList.remove('hidden');
      dashboard.classList.add('hidden');
      userInfo.classList.add('hidden');
    }
  }

  let loginSubmitting = false;
  formLogin?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (loginSubmitting) return;
    loginSubmitting = true;
    authError.classList.add('hidden');
    try {
      const result = await Auth.login(
        document.getElementById('login-email').value,
        document.getElementById('login-password').value
      );
      await checkAuth();
    } catch (err) {
      authError.textContent = err.message;
      authError.classList.remove('hidden');
    } finally {
      loginSubmitting = false;
    }
  });

  let registerSubmitting = false;
  formRegister?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (registerSubmitting) return;
    registerSubmitting = true;
    registerError.classList.add('hidden');
    try {
      await Auth.register(
        document.getElementById('register-email').value,
        document.getElementById('register-password').value
      );
      await checkAuth();
    } catch (err) {
      registerError.textContent = err.message;
      registerError.classList.remove('hidden');
    } finally {
      registerSubmitting = false;
    }
  });

  toggleRegister?.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    authError.classList.add('hidden');
  });

  toggleLogin?.addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
    registerError.classList.add('hidden');
  });

  btnLogout?.addEventListener('click', async () => {
    await Auth.logout();
    currentUser = null;
    currentDoc = null;
    TTSEngine.stop();
    await checkAuth();
  });

  if (new URLSearchParams(location.search).get('login') === 'ok') {
    history.replaceState({}, '', '/');
    checkAuth();
  }

  async function loadDocuments() {
    try {
      const docs = await Documents.list();
      documentsList.innerHTML = '';
      docs.forEach((d) => {
        const li = document.createElement('li');
        li.innerHTML = `
          <span class="doc-name" data-id="${d.id}">${escapeHtml(d.original_name)}</span>
          <span class="doc-actions">
            <button class="btn-delete" data-id="${d.id}">Șterge</button>
          </span>
        `;
        documentsList.appendChild(li);
      });

      documentsList.querySelectorAll('.doc-name').forEach((el) => {
        el.addEventListener('click', () => selectDocument(el.dataset.id));
      });
      documentsList.querySelectorAll('.btn-delete').forEach((el) => {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          deleteDocument(el.dataset.id);
        });
      });
    } catch (err) {
      console.error(err);
    }
  }

  function renderPrompter(text) {
    if (!text || !text.trim()) {
      prompter.classList.add('hidden');
      progressSection.classList.add('hidden');
      chaptersSection.classList.add('hidden');
      return;
    }
    TTSEngine.prepare(text);
    const chunks = TTSEngine.chunks;
    prompterText.innerHTML = chunks
      .map(
        (c, i) =>
          `<span class="chunk" data-index="${i}">${escapeHtml(c)}</span> `
      )
      .join('');
    prompter.classList.remove('hidden');
    progressSection.classList.remove('hidden');
    chaptersSection.classList.remove('hidden');
    progressSlider.max = Math.max(0, chunks.length - 1);
    progressSlider.value = 0;
    updateProgress();
    renderChapters(chunks);
    prompterText.querySelectorAll('.chunk').forEach((el) => {
      el.addEventListener('click', () => jumpToChunk(parseInt(el.dataset.index, 10)));
    });
  }

  function updateProgress() {
    const p = TTSEngine.getProgress();
    if (p.total === 0) return;
    progressLabel.textContent = `Propoziția ${p.current} din ${p.total}`;
    progressPercent.textContent = `${p.percent}%`;
    progressSlider.max = Math.max(0, p.total - 1);
    progressSlider.value = TTSEngine.currentChunkIndex;
    progressSlider.disabled = p.total <= 1;
    chaptersList.querySelectorAll('li').forEach((li, i) => {
      const startIdx = parseInt(li.dataset.index, 10);
      const nextStart = i < chaptersList.children.length - 1
        ? parseInt(chaptersList.children[i + 1].dataset.index, 10)
        : Infinity;
      li.classList.toggle(
        'current-chapter',
        TTSEngine.currentChunkIndex >= startIdx && TTSEngine.currentChunkIndex < nextStart
      );
    });
  }

  function renderChapters(chunks) {
    const chs = Chapters.detect(null, chunks);
    chaptersList.innerHTML = chs
      .map(
        (c) =>
          `<li data-index="${c.startIndex}">${escapeHtml(c.title)}</li>`
      )
      .join('');
    chaptersList.querySelectorAll('li').forEach((el) => {
      el.addEventListener('click', () => jumpToChunk(parseInt(el.dataset.index, 10)));
    });
  }

  function jumpToChunk(index) {
    if (!currentDoc?.extracted_text || index < 0) return;
    TTSEngine.playFrom(index);
    highlightChunk(index);
    updateProgress();
    btnPlay.classList.add('hidden');
    btnPause.classList.remove('hidden');
    chaptersNav.classList.add('hidden');
  }

  function highlightChunk(index) {
    prompterText?.querySelectorAll('.chunk').forEach((span, i) => {
      span.classList.remove('active', 'past');
      if (i < index) span.classList.add('past');
      if (i === index) span.classList.add('active');
    });
    const activeEl = prompterText?.querySelector('.chunk.active');
    activeEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    updateProgress();
  }

  chaptersToggle?.addEventListener('click', () => {
    chaptersNav.classList.toggle('hidden');
  });

  progressSlider?.addEventListener('change', () => {
    const total = TTSEngine.chunks.length;
    if (total === 0) return;
    const idx = parseInt(progressSlider.value, 10);
    jumpToChunk(idx);
  });

  async function selectDocument(id) {
    try {
      const doc = await Documents.get(id);
      currentDoc = doc;
      readerPanel.classList.remove('hidden');
      readerTitle.textContent = doc.original_name;
      if (doc.extracted_text) {
        TTSEngine.currentChunkIndex = 0;
        renderPrompter(doc.extracted_text);
        readerHint.textContent = 'Apasă Play, click pe o propoziție sau pe un capitol pentru a sari.';
      } else {
        prompter.classList.add('hidden');
        progressSection.classList.add('hidden');
        chaptersSection.classList.add('hidden');
        readerHint.textContent = 'Nu s-a putut extrage text din acest document.';
      }
      readerHint.classList.remove('hidden');
      if (!doc.extracted_text) TTSEngine.stop();
    } catch (err) {
      readerHint.textContent = 'Eroare la încărcare document.';
    }
  }

  function deleteDocument(id) {
    if (!confirm('Ștergi acest document?')) return;
    Documents.delete(id).then(() => {
      if (currentDoc?.id === id) {
        currentDoc = null;
        prompter.classList.add('hidden');
        progressSection.classList.add('hidden');
        chaptersSection.classList.add('hidden');
        readerHint.textContent = 'Selectează un document pentru a-l citi cu voce.';
      }
      loadDocuments();
    }).catch(console.error);
  }

  uploadZone?.addEventListener('click', () => fileInput?.click());
  uploadZone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
  });
  uploadZone?.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
  uploadZone?.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  });

  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleUpload(file);
    e.target.value = '';
  });

  async function handleUpload(file) {
    const ext = file.name.toLowerCase().split('.').pop();
    if (!['pdf', 'docx', 'txt'].includes(ext)) {
      alert('Doar PDF, DOCX și TXT sunt permise.');
      return;
    }
    try {
      await Documents.upload(file);
      loadDocuments();
    } catch (err) {
      alert(err.message);
    }
  }

  TTSEngine.on('chunk', (index) => {
    highlightChunk(index);
    if (progressSlider && !progressSlider.matches(':active')) {
      progressSlider.value = index;
    }
  });

  btnPlay?.addEventListener('click', () => {
    if (!currentDoc?.extracted_text) return;
    if (TTSEngine.isPaused) {
      TTSEngine.resume();
      btnPlay.classList.add('hidden');
      btnPause.classList.remove('hidden');
    } else {
      MediaSession.updateMetadata(currentDoc.original_name);
      if (!TTSEngine.chunks.length) {
        renderPrompter(currentDoc.extracted_text);
      }
      TTSEngine.playFrom(TTSEngine.currentChunkIndex);
      btnPlay.classList.add('hidden');
      btnPause.classList.remove('hidden');
    }
  });

  btnPause?.addEventListener('click', () => {
    TTSEngine.pause();
    btnPause.classList.add('hidden');
    btnPlay.classList.remove('hidden');
  });

  btnBack?.addEventListener('click', () => TTSEngine.skipBackward(10));
  btnForward?.addEventListener('click', () => TTSEngine.skipForward(10));
  btnStop?.addEventListener('click', () => {
    TTSEngine.stop();
    btnPause.classList.add('hidden');
    btnPlay.classList.remove('hidden');
  });

  TTSEngine.on('end', () => {
    btnPause.classList.add('hidden');
    btnPlay.classList.remove('hidden');
    prompterText?.querySelectorAll('.chunk').forEach((s) => s.classList.remove('active', 'past'));
    updateProgress();
  });
  TTSEngine.on('stop', () => {
    btnPause.classList.add('hidden');
    btnPlay.classList.remove('hidden');
    prompterText?.querySelectorAll('.chunk').forEach((s) => s.classList.remove('active', 'past'));
    updateProgress();
  });
  
  TTSEngine.on('error', (message) => {
    console.error('TTS Error:', message);
    alert('Eroare la generarea audio: ' + message);
    btnPlay.classList.remove('hidden');
    btnPause.classList.add('hidden');
  });

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  checkAuth();
});
