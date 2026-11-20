/**
 * EchoMinds — app.js
 * Global interactions: navbar, theme, mobile nav, accordion, login select,
 * contact form, assessment composer flow.
 */
(function () {
  'use strict';

  /* ==========================================================================
     Theme (light/dark) — persisted in localStorage
     ========================================================================== */
  var THEME_KEY = 'echominds-theme';

  function applyTheme(theme) {
    if (theme === 'dark' || theme === 'light') {
      document.documentElement.setAttribute('data-theme', theme);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  function initTheme() {
    var saved = localStorage.getItem(THEME_KEY);
    if (saved) applyTheme(saved);

    var toggles = document.querySelectorAll('[data-theme-toggle]');
    toggles.forEach(function (toggle) {
      toggle.addEventListener('click', function () {
        var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        var current = document.documentElement.getAttribute('data-theme') || (prefersDark ? 'dark' : 'light');
        var next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        localStorage.setItem(THEME_KEY, next);
      });
    });
  }

  /* ==========================================================================
     Navbar: scroll state + mobile menu
     ========================================================================== */
  function initNavbar() {
    var navbar = document.querySelector('.navbar');
    if (!navbar) return;

    function onScroll() {
      navbar.classList.toggle('is-scrolled', window.scrollY > 12);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    var toggle = document.querySelector('.nav-toggle');
    var links = document.querySelector('.nav-links');
    if (toggle && links) {
      toggle.addEventListener('click', function () {
        var isOpen = toggle.classList.toggle('is-open');
        links.classList.toggle('is-open', isOpen);
        toggle.setAttribute('aria-expanded', isOpen);
      });
      links.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', function () {
          toggle.classList.remove('is-open');
          links.classList.remove('is-open');
        });
      });
    }
  }

  /* ==========================================================================
     Accordion (FAQ)
     ========================================================================== */
  function initAccordion() {
    var items = document.querySelectorAll('.accordion-item');
    items.forEach(function (item) {
      var trigger = item.querySelector('.accordion-trigger');
      if (!trigger) return;
      trigger.addEventListener('click', function () {
        var isOpen = item.classList.contains('is-open');
        var parent = item.closest('.accordion');
        if (parent && parent.hasAttribute('data-single-open')) {
          parent.querySelectorAll('.accordion-item.is-open').forEach(function (open) {
            if (open !== item) open.classList.remove('is-open');
          });
        }
        item.classList.toggle('is-open', !isOpen);
      });
    });
  }

  /* ==========================================================================
     Login role cards → route to dashboard
     ========================================================================== */
  function initLoginCards() {
    var cards = document.querySelectorAll('[data-role-card]');
    if (!cards.length) return;
    cards.forEach(function (card) {
      card.addEventListener('click', function (e) {
        if (e.target.closest('a')) return;
        var link = card.querySelector('a.btn');
        if (link) window.location.href = link.getAttribute('href');
      });
    });
  }

  /* ==========================================================================
     Generic form "submit" simulation (contact, settings, auth forms)
     ========================================================================== */
  function initFakeForms() {
    document.querySelectorAll('form[data-fake-submit]').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var btn = form.querySelector('button[type="submit"]');
        var successEl = form.querySelector('[data-form-success]');
        if (btn) {
          var original = btn.innerHTML;
          btn.disabled = true;
          btn.innerHTML = '<span class="dot-pulse"><span></span><span></span><span></span></span>';
          window.setTimeout(function () {
            btn.disabled = false;
            btn.innerHTML = original;
            if (successEl) {
              successEl.hidden = false;
              successEl.classList.add('fade-in-up');
            }
            form.reset();
          }, 1100);
        }
      });
    });
  }

  /* ==========================================================================
     Assessment composer: char/word count, language hint, analyze flow
     ========================================================================== */
  function detectLanguage(text) {
    var hinglishHints = /\b(hai|nahi|kyu|kyun|mujhe|acha|bahut|dil|kya|thoda|zindagi|mann|udaas|pareshan|tension)\b/i;
    var devanagari = /[ऀ-ॿ]/;
    if (devanagari.test(text)) return 'Hindi script detected';
    if (hinglishHints.test(text)) return 'Hinglish detected';
    if (text.trim().length === 0) return 'Waiting for input';
    return 'English detected';
  }

  /* Shared "AI thinking" overlay — used by both the Write and Speak composers */

  async function runAnalyzeOverlay(text) {
    var overlay = document.getElementById('analyze-overlay');

    if (!overlay) return;

    var analyzeBtn = document.getElementById('analyze-btn');
    var errorEl = document.getElementById('analyze-error');

    if (errorEl) {
        errorEl.textContent = '';
        errorEl.hidden = true;
    }

    if (analyzeBtn) {
        analyzeBtn.disabled = true;
    }

    overlay.classList.add('is-active');
    document.body.style.overflow = 'hidden';

    var steps = overlay.querySelectorAll('.analyze-steps li');
    steps.forEach(function (step) {
        step.classList.remove('is-active', 'is-done');
    });

    var i = 0;

    function nextStep() {
        if (i > 0) {
            steps[i - 1].classList.remove('is-active');
            steps[i - 1].classList.add('is-done');
        }

        if (i < steps.length) {
            steps[i].classList.add('is-active');
            i++;
            window.setTimeout(nextStep, 700);
        }
    }

    nextStep();

    try {
        var response = await fetch(String.fromCharCode(104,116,116,112,58,47,47,49,50,55,46,48,46,48,46,49,58,53,48,48,49,47,97,112,105,47,112,114,101,100,105,99,116), {

            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: text })
        });

        var result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'The analysis request failed.');
        }

        sessionStorage.setItem('echomindsResult', JSON.stringify(result));
        sessionStorage.setItem('echomindsInputText', text);

        window.setTimeout(function () {
            window.location.href = 'result.html';
        }, 800);

    } catch (error) {
        overlay.classList.remove('is-active');
        document.body.style.overflow = '';

        if (analyzeBtn) {
            analyzeBtn.disabled = false;
        }

        if (errorEl) {
            errorEl.textContent =
                'Unable to connect to the AI service. Please make sure the backend is running and try again.';
            errorEl.hidden = false;
        } else {
            alert(
                'Unable to connect to the AI service. Please make sure the backend is running and try again.'
            );
        }

        console.error('EchoMinds prediction error:', error);
    }
}


  function initAssessmentComposer() {
    var textarea = document.getElementById('assessment-textarea');
    if (!textarea) return;

    var charCount = document.getElementById('char-count');
    var wordCount = document.getElementById('word-count');
    var langIndicator = document.getElementById('lang-indicator');
    var analyzeBtn = document.getElementById('analyze-btn');

    var predictionStatus = document.getElementById('prediction-status');
    var predictionEmpty = document.getElementById('prediction-empty');
    var predictionResults = document.getElementById('prediction-results');
    var predictionSummary = document.getElementById('prediction-summary');

    var maxChars = 1200;
    var predictionTimer = null;
    var activeController = null;
    var requestSequence = 0;

    var scoreElements = {
      Normal: {
        value: document.getElementById('pred-normal-value'),
        bar: document.getElementById('pred-normal-bar')
      },
      Stress: {
        value: document.getElementById('pred-stress-value'),
        bar: document.getElementById('pred-stress-bar')
      },
      Severe: {
        value: document.getElementById('pred-severe-value'),
        bar: document.getElementById('pred-severe-bar')
      }
    };

    function setPredictionStatus(message, type) {
      if (!predictionStatus) return;
      predictionStatus.textContent = message;
      predictionStatus.className = 'badge ' +
        (type === 'success' ? 'badge-success' :
         type === 'warning' ? 'badge-warning' : 'badge-neutral');
    }

    function resetPrediction(message) {
      if (predictionResults) predictionResults.hidden = true;
      if (predictionEmpty) {
        predictionEmpty.hidden = false;
        predictionEmpty.textContent = message ||
          "Start writing to see your model's predictions here.";
      }
      if (predictionSummary) predictionSummary.textContent = '';

      Object.keys(scoreElements).forEach(function (label) {
        var item = scoreElements[label];
        if (item.value) item.value.textContent = '0%';
        if (item.bar) item.bar.style.width = '0%';
      });

      setPredictionStatus('Waiting for input', 'neutral');
    }

    function renderPrediction(result) {
      if (!result || !result.all_scores ||
          typeof result.all_scores !== 'object') {
        throw new Error('The model returned an unexpected response.');
      }

      Object.keys(scoreElements).forEach(function (label) {
        var score = Number(result.all_scores[label]);
        if (!Number.isFinite(score)) {
          throw new Error('Missing probability for ' + label);
        }

        var percentage = Math.max(0, Math.min(100, score * 100));
        var item = scoreElements[label];

        if (item.value) item.value.textContent = percentage.toFixed(1) + '%';
        if (item.bar) item.bar.style.width = percentage + '%';
      });

      if (predictionEmpty) predictionEmpty.hidden = true;
      if (predictionResults) predictionResults.hidden = false;

      var confidence = Number(result.confidence);
      var confidenceText = Number.isFinite(confidence)
        ? (confidence * 100).toFixed(1) + '%'
        : 'not provided';

      if (predictionSummary) {
        predictionSummary.textContent =
          'Highest-scoring category: ' + result.label +
          ' (' + confidenceText + ' confidence). Experimental model output, not a diagnosis.';
      }

      setPredictionStatus('Model updated', 'success');
    }

    function requestPrediction(text) {
      if (predictionTimer) window.clearTimeout(predictionTimer);
      if (activeController) activeController.abort();

      var currentRequest = ++requestSequence;

      if (text.trim().length < 8) {
        resetPrediction();
        return;
      }

      setPredictionStatus('Waiting for typing to pause…', 'neutral');

      predictionTimer = window.setTimeout(async function () {
        activeController = new AbortController();
        setPredictionStatus('Analysing text…', 'neutral');

        try {
          var response = await fetch('http://127.0.0.1:5001/api/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text }),
            signal: activeController.signal
          });

          var result = await response.json();

          if (!response.ok) {
            throw new Error(result.error || 'Prediction request failed.');
          }

          if (currentRequest !== requestSequence) return;

          renderPrediction(result);
        } catch (error) {
          if (error.name === 'AbortError') return;
          if (currentRequest !== requestSequence) return;

          setPredictionStatus('Prediction unavailable', 'warning');
          if (predictionEmpty) {
            predictionEmpty.hidden = false;
            predictionEmpty.textContent =
              'Could not reach the model. Check that the EchoMinds backend is running.';
          }
          if (predictionResults) predictionResults.hidden = true;

          console.error('Live EchoMinds prediction error:', error);
        }
      }, 1200);
    }

    function renderInsights(text) {
      var keywordContainer = document.getElementById('insight-keywords');
      var themesElement = document.getElementById('insight-themes');
      var suggestionElement = document.getElementById('insight-suggestion');

      if (!keywordContainer || !themesElement || !suggestionElement) return;

      var lower = text.toLowerCase();

      var emotionTerms = [
        'stressed', 'stress', 'tension', 'anxious', 'anxiety',
        'overwhelmed', 'worried', 'pareshan', 'ghabrahat',
        'sad', 'lonely', 'udaas', 'hopeless',
        'happy', 'khush', 'relaxed', 'grateful', 'accha', 'acha',
        'calm', 'better', 'pressure', 'afraid', 'tired', 'exhausted'
      ];

      var foundKeywords = emotionTerms.filter(function (term) {
        return lower.includes(term);
      });

      keywordContainer.replaceChildren();

      if (foundKeywords.length === 0) {
        var emptyTag = document.createElement('span');
        emptyTag.className = 'text-secondary';
        emptyTag.textContent = text.trim()
          ? 'No specific emotional keywords identified yet.'
          : 'Your keywords will appear here.';
        keywordContainer.appendChild(emptyTag);
      } else {
        foundKeywords.slice(0, 10).forEach(function (term) {
          var tag = document.createElement('span');
          tag.className = 'insight-tag';
          tag.textContent = term;
          keywordContainer.appendChild(tag);
        });
      }

      var themeRules = [
        { name: 'Studies and academic pressure', terms: ['exam', 'study', 'studies', 'padhai', 'assignment', 'college', 'school', 'marks'] },
        { name: 'Sleep and rest', terms: ['sleep', 'neend', 'insomnia', 'rest', 'tired', 'exhausted'] },
        { name: 'Relationships and social support', terms: ['friend', 'dost', 'family', 'parents', 'relationship', 'alone', 'lonely'] },
        { name: 'Work and responsibilities', terms: ['work', 'job', 'office', 'deadline', 'responsibility'] },
        { name: 'Positive experiences', terms: ['happy', 'khush', 'grateful', 'relaxed', 'good day', 'accha', 'acha'] }
      ];

      var foundThemes = themeRules.filter(function (rule) {
        return rule.terms.some(function (term) {
          return lower.includes(term);
        });
      }).map(function (rule) {
        return rule.name;
      });

      themesElement.textContent = foundThemes.length
        ? foundThemes.join(' • ')
        : (text.trim()
          ? 'No clear theme identified yet. Keep expressing your thoughts.'
          : 'Waiting for your reflection.');

      var suggestion = 'Take your time. There is no right or wrong way to express yourself.';

      if (/stress|stressed|tension|pressure|pareshan|overwhelmed|anxious|worried/.test(lower)) {
        suggestion = 'You seem to be describing some pressure. It may help to write down one thing that is bothering you most and one small step you could take.';
      } else if (/sleep|neend|insomnia|exhausted|tired/.test(lower)) {
        suggestion = 'Rest seems to be an important part of what you are describing. Consider reflecting on what might help you feel more settled before bedtime.';
      } else if (/sad|lonely|udaas|alone|hopeless/.test(lower)) {
        suggestion = 'It can help to share difficult feelings with someone you trust. You do not have to work through everything alone.';
      } else if (/happy|khush|grateful|relaxed|good day|accha|acha/.test(lower)) {
        suggestion = 'It is nice to notice positive moments. You might write down what made this experience meaningful so you can revisit it later.';
      }

      suggestionElement.textContent = suggestion;
    }

    function update() {
      var text = textarea.value;
      var chars = text.length;
      var words = text.trim().length
        ? text.trim().split(/\s+/).length
        : 0;

      if (charCount) charCount.textContent = chars + ' / ' + maxChars;
      if (wordCount) {
        wordCount.textContent = words + (words === 1 ? ' word' : ' words');
      }
      if (langIndicator) langIndicator.textContent = detectLanguage(text);
      if (analyzeBtn) analyzeBtn.disabled = text.trim().length < 8;

      renderInsights(text);

      requestPrediction(text);
    }

    textarea.addEventListener('input', update);
    update();

    document.querySelectorAll('.assessment-prompts button').forEach(function (chip) {
      chip.addEventListener('click', function () {
        textarea.value = chip.getAttribute('data-prompt') || textarea.value;
        textarea.focus();
        update();
      });
    });

    if (analyzeBtn) {
      analyzeBtn.addEventListener('click', function () {
        if (analyzeBtn.disabled) return;

        var text = textarea.value.trim();

        if (text.length < 8) {
          alert('Please write at least 8 characters before analyzing.');
          return;
        }

        runAnalyzeOverlay(text);
      });
    }
  }

  /* ==========================================================================
     Write / Speak composer tabs
     ========================================================================== */
  function initComposerTabs() {
    var tabs = document.querySelectorAll('[data-composer-tab]');
    if (!tabs.length) return;
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) {
          t.classList.remove('is-active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('is-active');
        tab.setAttribute('aria-selected', 'true');

        var target = tab.getAttribute('data-composer-tab');
        document.querySelectorAll('.composer-panel').forEach(function (panel) {
          panel.classList.toggle('is-active', panel.id === 'panel-' + target);
        });
      });
    });
  }

  /* ==========================================================================
     Voice composer — simulated listening, waveform, transcript (UI preview
     for future speech functionality; no real audio capture yet)
     ========================================================================== */
  function initVoiceComposer() {
  var micButton = document.getElementById('mic-button');
  var micStage = document.getElementById('mic-stage');
  if (!micButton || !micStage) return;

  var status = document.getElementById('voice-status');
  var timerEl = document.getElementById('voice-timer');
  var waveform = document.getElementById('voice-waveform');
  var transcript = document.getElementById('voice-transcript');
  var voiceAnalyzeBtn = document.getElementById('voice-analyze-btn');
  var langIndicator = document.getElementById('lang-indicator');

  var audioContext;
  var mediaStream;
  var source;
  var processor;
  var audioChunks = [];
  var isListening = false;
  var seconds = 0;
  var timerInterval = null;
  var audioBlob = null;
  var sampleRate = 16000;

  function formatTime(s) {
    var m = Math.floor(s / 60);
    var sec = s % 60;
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  function stopTimer() {
    window.clearInterval(timerInterval);
    timerInterval = null;
  }

  function stopRecordingUI() {
    isListening = false;
    micStage.classList.remove('is-listening');
    micButton.classList.remove('is-listening');
    if (waveform) waveform.classList.remove('is-active');
    stopTimer();
  }

  function encodeWav(samples, rate) {
    var buffer = new ArrayBuffer(44 + samples.length * 2);
    var view = new DataView(buffer);

    function writeString(offset, value) {
      for (var i = 0; i < value.length; i++) {
        view.setUint8(offset + i, value.charCodeAt(i));
      }
    }

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, rate, true);
    view.setUint32(28, rate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, samples.length * 2, true);

    var offset = 44;
    for (var j = 0; j < samples.length; j++) {
      var sample = Math.max(-1, Math.min(1, samples[j]));
      view.setInt16(offset, sample < 0 ? sample * 32768 : sample * 32767, true);
      offset += 2;
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  async function startListening() {
    try {
      audioChunks = [];
      audioBlob = null;
      seconds = 0;

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone recording is not supported by this browser.');
      }

      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      sampleRate = audioContext.sampleRate;

      source = audioContext.createMediaStreamSource(mediaStream);
      processor = audioContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = function (event) {
        if (!isListening) return;
        audioChunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      isListening = true;
      micStage.classList.add('is-listening');
      micButton.classList.add('is-listening');
      if (waveform) waveform.classList.add('is-active');
      if (status) status.textContent = 'Recording your voice…';
      if (timerEl) timerEl.textContent = formatTime(seconds);
      if (transcript) {
        transcript.textContent = 'Recording in progress. Your speech will not be transcribed.';
        transcript.classList.remove('has-text');
      }
      if (langIndicator) langIndicator.textContent = 'Voice recording active';
      if (voiceAnalyzeBtn) voiceAnalyzeBtn.disabled = true;

      timerInterval = window.setInterval(function () {
        seconds++;
        if (timerEl) timerEl.textContent = formatTime(seconds);
      }, 1000);

    } catch (error) {
      console.error('Microphone error:', error);
      stopRecordingUI();
      if (status) status.textContent = error.message || 'Could not access microphone.';
      if (langIndicator) langIndicator.textContent = 'Please allow microphone access';
    }
  }

  async function stopListening() {
    if (!isListening) return;

    stopRecordingUI();

    if (status) status.textContent = 'Processing your recording…';

    try {
      if (processor) {
        processor.disconnect();
        processor.onaudioprocess = null;
      }
      if (source) source.disconnect();

      if (mediaStream) {
        mediaStream.getTracks().forEach(function (track) {
          track.stop();
        });
      }

      if (audioContext && audioContext.state !== 'closed') {
        await audioContext.close();
      }

      var totalLength = audioChunks.reduce(function (sum, chunk) {
        return sum + chunk.length;
      }, 0);

      if (!totalLength) {
        throw new Error('No audio was recorded. Please try again.');
      }

      var combined = new Float32Array(totalLength);
      var position = 0;

      audioChunks.forEach(function (chunk) {
        combined.set(chunk, position);
        position += chunk.length;
      });

      var offlineContext = new OfflineAudioContext(
        1,
        Math.ceil(combined.length * 16000 / sampleRate),
        16000
      );

      var audioBuffer = offlineContext.createBuffer(1, combined.length, sampleRate);
      audioBuffer.copyToChannel(combined, 0);

      var bufferSource = offlineContext.createBufferSource();
      bufferSource.buffer = audioBuffer;
      bufferSource.connect(offlineContext.destination);
      bufferSource.start();

      var rendered = await offlineContext.startRendering();
      audioBlob = encodeWav(rendered.getChannelData(0), 16000);

      if (transcript) {
        transcript.textContent = 'Recording ready. Your voice recording can now be analysed.';
        transcript.classList.add('has-text');
      }

      if (status) status.textContent = 'Recording ready for analysis';
      if (langIndicator) langIndicator.textContent = 'Audio ready';
      if (voiceAnalyzeBtn) voiceAnalyzeBtn.disabled = false;

    } catch (error) {
      console.error('Audio processing error:', error);
      audioBlob = null;
      if (status) status.textContent = error.message || 'Could not process audio.';
      if (voiceAnalyzeBtn) voiceAnalyzeBtn.disabled = true;
    }
  }

  micButton.addEventListener('click', function () {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  });

  if (voiceAnalyzeBtn) {
    voiceAnalyzeBtn.addEventListener('click', async function () {
      if (voiceAnalyzeBtn.disabled || !audioBlob) return;

      voiceAnalyzeBtn.disabled = true;
      if (status) status.textContent = 'Analysing your voice…';

      var formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');

      try {
        var response = await fetch('http://127.0.0.1:5001/api/predict-voice', {
          method: 'POST',
          body: formData
        });

        var result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Voice analysis failed.');
        }

        sessionStorage.setItem('echomindsResult', JSON.stringify(result));
        sessionStorage.setItem('echomindsInputText', '');
        sessionStorage.setItem('echomindsInputType', 'voice');

        window.location.href = 'result.html';

      } catch (error) {
        console.error('Voice analysis error:', error);
        if (status) status.textContent = error.message || 'Could not connect to the voice model.';
        voiceAnalyzeBtn.disabled = false;
      }
    });
  }
}
function initFooterYear() {
    document.querySelectorAll('[data-current-year]').forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.body.classList.add('page-ready');
    initTheme();
    initNavbar();
    initAccordion();
    initLoginCards();
    initFakeForms();
    initAssessmentComposer();
    initComposerTabs();
    initVoiceComposer();
    initFooterYear();
  });
})();
