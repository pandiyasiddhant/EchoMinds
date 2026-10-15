/**
 * EchoMinds — dashboard.js
 * Sidebar shell behavior, canvas charts, table search/filter, settings tabs.
 */
(function () {
  'use strict';

  /* ==========================================================================
     Sidebar toggle (mobile)
     ========================================================================== */
  function initSidebar() {
    var sidebar = document.querySelector('.sidebar');
    var overlay = document.querySelector('.sidebar-overlay');
    var openBtn = document.querySelector('.sidebar-toggle');
    var closeBtn = document.querySelector('.sidebar-close');
    if (!sidebar) return;

    function open() {
      sidebar.classList.add('is-open');
      if (overlay) overlay.classList.add('is-open');
    }
    function close() {
      sidebar.classList.remove('is-open');
      if (overlay) overlay.classList.remove('is-open');
    }
    if (openBtn) openBtn.addEventListener('click', open);
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (overlay) overlay.addEventListener('click', close);
  }

  /* ==========================================================================
     Risk trend line chart — plain canvas, no dependency
     ========================================================================== */
  function drawLineChart(canvas) {
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    var dpr = window.devicePixelRatio || 1;
    var rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    var raw = canvas.getAttribute('data-points') || '';
    var points = raw.split(',').map(function (n) { return parseFloat(n); }).filter(function (n) { return !isNaN(n); });
    if (!points.length) return;

    var w = rect.width, h = rect.height;
    var pad = 18;
    var max = Math.max.apply(null, points) * 1.15 || 1;
    var min = Math.min.apply(null, points) * 0.85;
    var stepX = (w - pad * 2) / (points.length - 1 || 1);

    function coords(i, v) {
      var x = pad + stepX * i;
      var y = h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2);
      return [x, y];
    }

    var styles = getComputedStyle(document.documentElement);
    var primary = styles.getPropertyValue('--color-primary').trim() || '#2563eb';
    var accent = styles.getPropertyValue('--color-secondary').trim() || '#14b8a6';

    var grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, primary + '33');
    grad.addColorStop(1, primary + '00');

    // Animate the line drawing progressively
    var progress = 0;
    function frame() {
      progress += 0.025;
      if (progress > 1) progress = 1;
      ctx.clearRect(0, 0, w, h);

      var visibleCount = Math.max(2, Math.floor(points.length * progress));
      var visible = points.slice(0, visibleCount);

      // area fill
      ctx.beginPath();
      visible.forEach(function (v, i) {
        var c = coords(i, v);
        if (i === 0) ctx.moveTo(c[0], c[1]); else ctx.lineTo(c[0], c[1]);
      });
      var last = coords(visible.length - 1, visible[visible.length - 1]);
      ctx.lineTo(last[0], h - pad);
      ctx.lineTo(pad, h - pad);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // line
      var lineGrad = ctx.createLinearGradient(0, 0, w, 0);
      lineGrad.addColorStop(0, primary);
      lineGrad.addColorStop(1, accent);
      ctx.beginPath();
      visible.forEach(function (v, i) {
        var c = coords(i, v);
        if (i === 0) ctx.moveTo(c[0], c[1]); else ctx.lineTo(c[0], c[1]);
      });
      ctx.strokeStyle = lineGrad;
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();

      // dots
      visible.forEach(function (v, i) {
        var c = coords(i, v);
        ctx.beginPath();
        ctx.arc(c[0], c[1], i === visible.length - 1 ? 5 : 3, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = primary;
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();
      });

      if (progress < 1) requestAnimationFrame(frame);
    }

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) { progress = 1; frame(); } else { requestAnimationFrame(frame); }
  }

  function initCharts() {
    var canvases = document.querySelectorAll('canvas[data-chart="line"]');
    canvases.forEach(function (canvas) {
      drawLineChart(canvas);
      window.addEventListener('resize', debounce(function () { drawLineChart(canvas); }, 200));
    });
  }

  function debounce(fn, wait) {
    var t;
    return function () {
      clearTimeout(t);
      var args = arguments;
      t = setTimeout(function () { fn.apply(null, args); }, wait);
    };
  }

  /* ==========================================================================
     Bar chart heights (CSS driven, JS just triggers transition on load)
     ========================================================================== */
  function initBarCharts() {
    var bars = document.querySelectorAll('.bar-chart__bar[data-height]');
    bars.forEach(function (bar) {
      var target = bar.getAttribute('data-height');
      bar.style.height = '0%';
      requestAnimationFrame(function () {
        window.setTimeout(function () {
          bar.style.transition = 'height 900ms cubic-bezier(0.16,1,0.3,1)';
          bar.style.height = target + '%';
        }, 80);
      });
    });
  }

  /* ==========================================================================
     Risk gauge needle rotation (result page)
     ========================================================================== */
  function initRiskGauge() {
    var gauge = document.querySelector('.risk-gauge');
    if (!gauge) return;
    var pct = parseFloat(gauge.getAttribute('data-percent') || '40');
    var angle = -90 + (pct / 100) * 180;
    var needle = gauge.querySelector('.risk-gauge__needle');
    window.setTimeout(function () {
      if (needle) needle.style.setProperty('--angle', angle + 'deg');
    }, 250);
  }

  /* ==========================================================================
     Progress ring (confidence score)
     ========================================================================== */
  function initProgressRing() {
    document.querySelectorAll('.progress-ring').forEach(function (ring) {
      var pct = parseFloat(ring.getAttribute('data-percent') || '0');
      var circle = ring.querySelector('.ring-fill');
      if (!circle) return;
      var circumference = 351;
      var offset = circumference - (pct / 100) * circumference;
      window.setTimeout(function () {
        circle.style.setProperty('--offset', offset);
      }, 250);
    });
  }

  /* ==========================================================================
     Student table: search + risk filter
     ========================================================================== */
  function initTableFilter() {
    var table = document.querySelector('[data-filterable-table]');
    if (!table) return;
    var searchInput = document.querySelector('[data-table-search]');
    var filterChips = document.querySelectorAll('[data-table-filter]');
    var rows = table.querySelectorAll('tbody tr');
    var activeFilter = 'all';

    function applyFilters() {
      var query = (searchInput && searchInput.value || '').toLowerCase().trim();
      var visibleCount = 0;
      rows.forEach(function (row) {
        var name = (row.getAttribute('data-name') || row.textContent).toLowerCase();
        var risk = row.getAttribute('data-risk') || 'all';
        var matchesQuery = !query || name.indexOf(query) !== -1;
        var matchesFilter = activeFilter === 'all' || risk === activeFilter;
        var show = matchesQuery && matchesFilter;
        row.style.display = show ? '' : 'none';
        if (show) visibleCount++;
      });
      var emptyState = document.querySelector('[data-table-empty]');
      if (emptyState) emptyState.hidden = visibleCount !== 0;
    }

    if (searchInput) searchInput.addEventListener('input', applyFilters);
    filterChips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        filterChips.forEach(function (c) { c.classList.remove('is-active'); });
        chip.classList.add('is-active');
        activeFilter = chip.getAttribute('data-table-filter');
        applyFilters();
      });
    });
  }

  /* ==========================================================================
     Settings tabs
     ========================================================================== */
  function initSettingsTabs() {
    var nav = document.querySelector('.settings-nav');
    if (!nav) return;
    var buttons = nav.querySelectorAll('button[data-panel]');
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        buttons.forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        document.querySelectorAll('.settings-panel').forEach(function (panel) {
          panel.classList.toggle('is-active', panel.id === btn.getAttribute('data-panel'));
        });
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initSidebar();
    initCharts();
    initBarCharts();
    initRiskGauge();
    initProgressRing();
    initTableFilter();
    initSettingsTabs();
  });
})();
