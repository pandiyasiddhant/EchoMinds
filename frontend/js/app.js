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
  function runAnalyzeOverlay() {
    var overlay = document.getElementById('analyze-overlay');
    if (!overlay) return;
    overlay.classList.add('is-active');
    document.body.style.overflow = 'hidden';

    var steps = overlay.querySelectorAll('.analyze-steps li');
    var i = 0;
    function nextStep() {
      if (i > 0) steps[i - 1].classList.remove('is-active');
      if (i > 0) steps[i - 1].classList.add('is-done');
      if (i < steps.length) {
        steps[i].classList.add('is-active');
        i++;
        window.setTimeout(nextStep, 700);
      } else {
        window.setTimeout(function () {
          window.location.href = 'result.html';
        }, 500);
      }
    }
    nextStep();
  }

  function initAssessmentComposer() {
    var textarea = document.getElementById('assessment-textarea');
    if (!textarea) return;

    var charCount = document.getElementById('char-count');
    var wordCount = document.getElementById('word-count');
    var langIndicator = document.getElementById('lang-indicator');
    var analyzeBtn = document.getElementById('analyze-btn');
    var maxChars = 1200;

    function update() {
      var text = textarea.value;
      var chars = text.length;
      var words = text.trim().length ? text.trim().split(/\s+/).length : 0;

      if (charCount) charCount.textContent = chars + ' / ' + maxChars;
      if (wordCount) wordCount.textContent = words + (words === 1 ? ' word' : ' words');
      if (langIndicator) langIndicator.textContent = detectLanguage(text);
      if (analyzeBtn) analyzeBtn.disabled = text.trim().length < 8;
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
        runAnalyzeOverlay();
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

    var demoTranscript = "Aaj thoda tension feel ho raha hai, exams ke wajah se neend bhi poori nahi ho rahi... par dosto se baat karke thoda better lagta hai.";

    var isListening = false;
    var seconds = 0;
    var timerInterval = null;
    var autoStopTimeout = null;

    function formatTime(s) {
      var m = Math.floor(s / 60);
      var sec = s % 60;
      return m + ':' + (sec < 10 ? '0' : '') + sec;
    }

    function startListening() {
      isListening = true;
      seconds = 0;
      micStage.classList.add('is-listening');
      micButton.classList.add('is-listening');
      if (waveform) waveform.classList.add('is-active');
      if (status) status.textContent = 'Listening…';
      if (timerEl) timerEl.textContent = formatTime(seconds);
      if (transcript) {
        transcript.textContent = 'Your words will gently appear here as you speak…';
        transcript.classList.remove('has-text');
      }
      if (voiceAnalyzeBtn) voiceAnalyzeBtn.disabled = true;
      if (langIndicator) langIndicator.textContent = 'Listening for Hinglish or English';

      timerInterval = window.setInterval(function () {
        seconds++;
        if (timerEl) timerEl.textContent = formatTime(seconds);
      }, 1000);

      autoStopTimeout = window.setTimeout(stopListening, 5200);
    }

    function stopListening() {
      isListening = false;
      micStage.classList.remove('is-listening');
      micButton.classList.remove('is-listening');
      if (waveform) waveform.classList.remove('is-active');
      window.clearInterval(timerInterval);
      window.clearTimeout(autoStopTimeout);

      if (status) status.textContent = 'Understanding your thoughts…';

      window.setTimeout(function () {
        if (transcript) {
          transcript.textContent = demoTranscript;
          transcript.classList.add('has-text');
        }
        if (status) status.textContent = "Got it — here's what we heard";
        if (langIndicator) langIndicator.textContent = 'Hinglish detected';
        if (voiceAnalyzeBtn) voiceAnalyzeBtn.disabled = false;
      }, 900);
    }

    micButton.addEventListener('click', function () {
      if (isListening) {
        stopListening();
      } else {
        startListening();
      }
    });

    if (voiceAnalyzeBtn) {
      voiceAnalyzeBtn.addEventListener('click', function () {
        if (voiceAnalyzeBtn.disabled) return;
        runAnalyzeOverlay();
      });
    }
  }

  /* ==========================================================================
     Footer year
     ========================================================================== */
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
