// Lawrence Lab site: scroll reveals and the hero brush. Pages work without this file.
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('js');

  // Fade sections in as they enter the viewport.
  var items = document.querySelectorAll('[data-reveal]');
  if (reduce || !('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    items.forEach(function (el) { io.observe(el); });
  }

  // Header hairline appears once the page scrolls.
  var top = document.querySelector('header.top');
  if (top) {
    var onScroll = function () { top.classList.toggle('scrolled', window.scrollY > 8); };
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }


  // ---------- explainer animations inside research-area cards ----------
  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e); return e;
  }
  function gauss(x, mu, s) { return Math.exp(-(x - mu) * (x - mu) / (2 * s * s)); }
  function ease(t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function mix(a, b, t) { return a + (b - a) * t; }
  function mixColor(c1, c2, t) {
    var p = function (c, i) { return parseInt(c.slice(1 + 2 * i, 3 + 2 * i), 16); };
    var r = [0, 1, 2].map(function (i) { return Math.round(mix(p(c1, i), p(c2, i), t)); });
    return 'rgb(' + r.join(',') + ')';
  }
  var INK = '#1D1D1F', GRAPH = '#6E6E73', BLUE = '#0071E3', RULE = '#D2D2D7';

  // Run a frame function only while its figure is on screen.
  function animate(svg, frame, still) {
    if (reduce) { still(); return; }
    var on = false, t0 = null, raf = null;
    function tick(now) {
      if (t0 === null) t0 = now;
      frame(now - t0);
      if (on) raf = requestAnimationFrame(tick);
    }
    still();
    new IntersectionObserver(function (e) {
      on = e[0].isIntersecting;
      if (on) { t0 = null; raf = requestAnimationFrame(tick); } else cancelAnimationFrame(raf);
    }).observe(svg);
  }

  // Recycling preparative HPLC: overlapping oligomers resolve pass by pass, the other
  // species are cut away, and only the target is recycled and collected.
  document.querySelectorAll('svg[data-anim="hplc"]').forEach(function (svg) {
    var X0 = 28, X1 = 372, Y0 = 236, H = 150;
    el('line', { x1: X0, y1: Y0, x2: X1, y2: Y0, stroke: RULE, 'stroke-width': 1.5 }, svg);
    var tPass = el('text', { x: X0, y: 44, 'font-size': 17, 'font-weight': 600 }, svg);
    var tSub = el('text', { x: X0, y: 66, 'font-size': 13, class: 'g' }, svg);
    var tx = el('text', { x: X1, y: Y0 + 26, 'font-size': 12, 'text-anchor': 'end', class: 'g' }, svg);
    tx.textContent = 'Retention time';
    var fill = el('path', { fill: BLUE, opacity: 0 }, svg);
    var line = el('path', { fill: 'none', stroke: INK, 'stroke-width': 2, 'stroke-linejoin': 'round' }, svg);
    var AMP = [.5, .82, 1, .88, .66, .42], KEEP = 2, N = 140;
    // t: 0 unresolved to 1 resolved. c: other species cut away. h: target filled (collected).
    function draw(t, c, h) {
      // Peaks narrow and separate with each pass. Height scales as 1/width so area is conserved.
      var d = mix(.03, .118, t), s = mix(.072, .02, t), dl = 'M', fl = 'M';
      // Once alone, the target drifts to the centre of the trace.
      var shift = (.5 + (KEEP - 2.5) * d - .5) * c;
      for (var i = 0; i <= N; i++) {
        var u = i / N, y = 0, yk = 0;
        for (var k = 0; k < AMP.length; k++) {
          var g = AMP[k] * gauss(u, .5 + (k - 2.5) * d - (k === KEEP ? shift : 0), s) * (.02 / s) * .95;
          if (k === KEEP) { y += g; yk = g; } else y += g * (1 - c);
        }
        var px = mix(X0, X1, u).toFixed(1);
        dl += (i ? ' L' : '') + px + ' ' + (Y0 - y * H).toFixed(1);
        fl += (i ? ' L' : '') + px + ' ' + (Y0 - yk * H).toFixed(1);
      }
      line.setAttribute('d', dl);
      fill.setAttribute('d', fl + ' Z'); fill.setAttribute('opacity', (.85 * h).toFixed(2));
    }
    var HOLD1 = 700, SEP = 4200, CUT = 1300, COL = 900, HOLD2 = 2400, OUT = 500;
    var LOOP = HOLD1 + SEP + CUT + COL + HOLD2 + OUT;
    function label(pass, sub) { tPass.textContent = pass; tSub.textContent = sub; }
    animate(svg, function (ms) {
      var m = ms % LOOP, e1 = HOLD1 + SEP, e2 = e1 + CUT, e3 = e2 + COL, e4 = e3 + HOLD2;
      if (m < HOLD1) { draw(0, 0, 0); label('Pass 1', 'A mixture of oligomers'); }
      else if (m < e1) {
        var t = (m - HOLD1) / SEP; draw(ease(t), 0, 0);
        label('Pass ' + (1 + Math.min(4, Math.floor(t * 5))), 'Recycling through the column');
      } else if (m < e2) { draw(1, ease((m - e1) / CUT), 0); label('Pass 5', 'Cutting away the other species'); }
      else if (m < e3) { draw(1, 1, ease((m - e2) / COL)); label('Pass 6', 'Collecting one species'); }
      else if (m < e4) { draw(1, 1, 1); label('Pass 6', 'One species, multigram scale'); }
      else { var r = (m - e4) / OUT; draw(1 - ease(r), 1 - r, 1 - r); label('Pass 1', 'A mixture of oligomers'); }
    }, function () { draw(1, 1, 1); label('Pass 6', 'One species, multigram scale'); });
  });

  // 19F NMR and MRI: disperse agents give a broad, split signal and a dim, patchy image.
  document.querySelectorAll('svg[data-anim="nmr"]').forEach(function (svg) {
    var X0 = 24, X1 = 236, Y0 = 222, H = 150;
    var t1 = el('text', { x: X0, y: 44, 'font-size': 15, 'font-weight': 600 }, svg);
    t1.innerHTML = '<tspan font-size="10" dy="-6">19</tspan><tspan dy="6">F NMR</tspan>';
    el('line', { x1: X0, y1: Y0, x2: X1, y2: Y0, stroke: RULE, 'stroke-width': 1.5 }, svg);
    var ppm = el('text', { x: X1, y: Y0 + 22, 'font-size': 12, 'text-anchor': 'end', class: 'g' }, svg);
    ppm.textContent = 'ppm';
    var spec = el('path', { fill: 'none', 'stroke-width': 2, 'stroke-linejoin': 'round' }, svg);
    var t2 = el('text', { x: 276, y: 44, 'font-size': 15, 'font-weight': 600 }, svg); t2.textContent = 'MRI';
    el('rect', { x: 268, y: 92, width: 112, height: 112, fill: '#0B0B0C' }, svg);
    var disc = el('circle', { cx: 324, cy: 148, r: 40 }, svg);
    var patches = [[-14, -12, 15], [16, -8, 12], [-6, 16, 13], [18, 18, 9], [-22, 8, 8], [4, -24, 9]].map(function (p, i) {
      return el('circle', { cx: 324 + p[0], cy: 148 + p[1], r: p[2], fill: i % 2 ? '#3A3A3C' : '#8E8E93' }, svg);
    });
    var state = el('text', { x: X0, y: 272, 'font-size': 14, 'font-weight': 600 }, svg);
    var A = [.3, .44, .52, .42, .28], C = [.3, .4, .5, .6, .7], N = 180;
    function draw(p) {
      var w = mix(.03, .011, p), d = 'M';
      for (var i = 0; i <= N; i++) {
        var u = i / N, y = 0;
        for (var k = 0; k < A.length; k++) y += mix(A[k], .2, p) * gauss(u, mix(C[k], .5, p), w);
        d += (i ? ' L' : '') + mix(X0, X1, u).toFixed(1) + ' ' + (Y0 - y * H).toFixed(1);
      }
      spec.setAttribute('d', d);
      var col = mixColor(GRAPH, BLUE, p);
      spec.setAttribute('stroke', col); state.setAttribute('fill', col);
      var g = Math.round(mix(88, 236, p));
      disc.setAttribute('fill', 'rgb(' + g + ',' + g + ',' + g + ')');
      patches.forEach(function (c) { c.setAttribute('opacity', (1 - p).toFixed(2)); });
      state.innerHTML = p < .5 ? 'Disperse side chains, <tspan font-style="italic">Đ</tspan> &gt; 1'
                               : 'Discrete side chains, <tspan font-style="italic">Đ</tspan> = 1';
    }
    var HOLD = 1800, GO = 1500, KEEP = 2800, BACK = 900, LOOP = HOLD + GO + KEEP + BACK;
    animate(svg, function (ms) {
      var m = ms % LOOP;
      if (m < HOLD) draw(0);
      else if (m < HOLD + GO) draw(ease((m - HOLD) / GO));
      else if (m < HOLD + GO + KEEP) draw(1);
      else draw(1 - ease((m - HOLD - GO - KEEP) / BACK));
    }, function () { draw(1); });
  });


  // ---------- MD videos: load when visible, play in sync, pausable ----------
  document.querySelectorAll('.mdfig').forEach(function (fig) {
    var vids = [].slice.call(fig.querySelectorAll('video'));
    var btn = fig.querySelector('.mdtoggle');
    var saveData = navigator.connection && navigator.connection.saveData;
    var userPaused = reduce || saveData, loaded = false, visible = false;
    function load() {
      if (loaded) return; loaded = true;
      vids.forEach(function (v) { v.src = v.getAttribute('data-src'); v.load(); });
    }
    function play() {
      load();
      var t = vids[0].currentTime;
      vids.forEach(function (v) {
        if (Math.abs(v.currentTime - t) > 0.15) v.currentTime = t;
        var p = v.play();
        if (p) p.catch(function () { v.addEventListener('canplay', function () { if (visible && !userPaused) v.play(); }, { once: true }); });
      });
    }
    var selfPause = false;
    function pause() { selfPause = true; vids.forEach(function (v) { v.pause(); }); selfPause = false; }
    // If the browser blocks or stops playback (Low Power Mode, autoplay rules), offer Play.
    vids[0].addEventListener('pause', function () {
      if (selfPause || vids[0].ended) return;
      userPaused = true; label(); vids.forEach(function (v) { v.pause(); });
    });
    function label() {
      btn.textContent = userPaused ? 'Play' : 'Pause';
      btn.setAttribute('aria-pressed', userPaused ? 'true' : 'false');
    }
    // Restart all three together so the panels stay in step.
    vids[0].addEventListener('ended', function () {
      vids.forEach(function (v) { v.currentTime = 0; });
      if (visible && !userPaused) play();
    });
    btn.addEventListener('click', function () {
      userPaused = !userPaused; label();
      userPaused ? pause() : play();
    });
    label();
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) {
        visible = e[e.length - 1].isIntersecting;
        if (visible && !userPaused) play(); else pause();
      }, { rootMargin: '200px 0px' }).observe(fig);
    }
  });

  // Hero: BBP (disperse backbone and side chains) -> PBP (discrete side chains)
  // -> DBP (discrete backbone and side chains). Three molecules stand in for a sample.
  var fig = document.querySelector('.brushfig');
  if (!fig) return;
  var mols = [].slice.call(fig.querySelectorAll('.mol'));
  var buttons = fig.querySelectorAll('.brushctl button');
  var cap = fig.querySelector('.brushcap');
  var LMAX = 22, SP = 21, K = 6, SIDE = 4, LDBP = 16;
  var CAPS = {
    bbp: 'Conventional bottlebrush (BBP). Backbones and side chains of many lengths.',
    pbp: 'Precision bottlebrush (PBP). Identical side chains, backbones of many lengths.',
    dbp: 'Discrete bottlebrush (DBP). Every molecule identical.'
  };
  function bell() { return Math.random() + Math.random() + Math.random() - 1.5; }
  var backbones = mols.map(function () { return LDBP; });
  function drawBackbones() {
    backbones = mols.map(function () {
      return Math.max(8, Math.min(LMAX, Math.round(LDBP + bell() * 11)));
    });
  }

  function show(state) {
    fig.setAttribute('data-state', state);
    mols.forEach(function (mol, m) {
      var L = state === 'dbp' ? LDBP : backbones[m];
      var line = mol.querySelector('.bb');
      line.style.transform = 'scaleX(' + ((L - 1) / (LMAX - 1)).toFixed(4) + ')';
      var cols = mol.querySelectorAll('.col');
      for (var j = 0; j < cols.length; j++) {
        var col = cols[j], x = (Math.min(j, L - 1) - (L - 1) / 2) * SP;
        col.style.transform = 'translateX(' + x.toFixed(1) + 'px)';
        col.classList.toggle('gone', j >= L);
        var beads = col.querySelectorAll('circle.b');
        // Each graft point has an upper and a lower side chain.
        var up = state === 'bbp' ? Math.max(1, Math.min(K, Math.round(SIDE + bell() * 3.4))) : SIDE;
        var dn = state === 'bbp' ? Math.max(1, Math.min(K, Math.round(SIDE + bell() * 3.4))) : SIDE;
        for (var b = 0; b < beads.length; b++) {
          var k = +beads[b].getAttribute('data-k'), n = b < K ? up : dn;
          beads[b].style.transitionDelay = reduce ? '0ms' : (j * 14 + k * 22) + 'ms';
          beads[b].classList.toggle('off', k >= n);
        }
      }
    });
    if (cap) cap.textContent = CAPS[state];
    buttons.forEach(function (btn) {
      btn.setAttribute('aria-pressed', btn.getAttribute('data-state') === state ? 'true' : 'false');
    });
  }

  var ORDER = ['bbp', 'pbp', 'dbp'], HOLD = { bbp: 2800, pbp: 2800, dbp: 4200 };
  var idx = 2, timer = null, playing = false;
  function next() {
    idx = (idx + 1) % 3;
    if (ORDER[idx] === 'bbp') drawBackbones();
    show(ORDER[idx]);
    timer = setTimeout(next, HOLD[ORDER[idx]]);
  }
  function start() { if (!reduce && !playing) { playing = true; timer = setTimeout(next, 900); } }
  function stop() { clearTimeout(timer); playing = false; }
  var userPicked = false;

  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      userPicked = true; stop();
      var st = btn.getAttribute('data-state');
      if (st !== 'dbp' && ORDER[idx] === 'dbp') drawBackbones();
      idx = ORDER.indexOf(st); show(st);
    });
  });

  // Play only while the figure is on screen, and never after the visitor takes over.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) {
      if (e[0].isIntersecting && !userPicked) start(); else stop();
    }).observe(fig);
  } else { start(); }
})();
