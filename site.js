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

  // Recycling SEC, drawn as a chart recorder: each pass slides in from the right, better
  // resolved than the last. Species are isolated in pairs once they reach baseline
  // separation, lowest MW first (#1, #2 at pass 4; #3, #4 at pass 5; #5, #6 at pass 6).
  // #4 is the target.
  document.querySelectorAll('svg[data-anim="hplc"]').forEach(function (svg) {
    var XL = 16, NOW = 352, Y0 = 232, H = 112, W = 140, CENTER = NOW - 78;
    var cutLayer = el('g', {}, svg);
    el('line', { x1: XL, y1: Y0, x2: NOW, y2: Y0, stroke: RULE, 'stroke-width': 1.5 }, svg);
    var line = el('path', { fill: 'none', stroke: INK, 'stroke-width': 1.8, 'stroke-linejoin': 'round' }, svg);
    var pen = el('circle', { r: 3.2, fill: INK }, svg);
    var passLab = el('g', {}, svg);
    var tTitle = el('text', { x: XL + 8, y: 36, 'font-size': 17, 'font-weight': 600 }, svg);
    tTitle.textContent = 'Recycling SEC';
    var tSub = el('text', { x: XL + 8, y: 58, 'font-size': 13, class: 'g' }, svg);
    var tAx = el('text', { x: NOW, y: Y0 + 40, 'font-size': 11, 'text-anchor': 'end', class: 'g' }, svg);
    tAx.textContent = 'Retention time';
    // Index k = 0 (highest MW, elutes first) to 5 (lowest MW). Number #n counts from the lowest MW.
    // Low-MW species sit farther apart, as in SEC, so they reach baseline separation first.
    var AMP = [.42, .7, .9, 1, .78, .5], POS = [-3.0, -2.2, -1.25, -.1, 1.3, 2.9];
    var DX = [0, 3, 6, 10, 15, 17, 19], SIG = [0, 12, 9, 6, 4.2, 3.4, 2.8];   // per pass 1..6
    var TAKEN = { 5: 4, 4: 4, 3: 5, 2: 5, 1: 6, 0: 6 };                        // k -> pass isolated
    var TARGET = 2, LAST = 6;
    function num(k) { return 6 - k; }
    function species(p) {
      var out = [];
      for (var k = 0; k < AMP.length; k++) if (p <= TAKEN[k]) {
        out.push({ k: k, off: POS[k] * DX[p], s: SIG[p], h: AMP[k] * (3.4 / SIG[p]) * .95 });
      }
      return out;
    }
    var boxes = [];   // [{pass, k, born}]
    function draw(P, ms) {
      var dl = '', first = true, lastY = Y0, vis = [];
      for (var p = 1; p <= LAST; p++) {
        var c = CENTER + (p - P) * W;
        if (c - W / 2 < NOW && c + W / 2 > XL) vis.push({ p: p, c: c, sp: species(p) });
      }
      for (var x = XL; x <= NOW; x += 1.5) {
        var y = 0;
        vis.forEach(function (v) { v.sp.forEach(function (q) { y += q.h * gauss(x, v.c + q.off, q.s); }); });
        dl += (first ? 'M' : ' L') + x.toFixed(1) + ' ' + (Y0 - y * H).toFixed(1);
        first = false; lastY = Y0 - y * H;
      }
      line.setAttribute('d', dl);
      pen.setAttribute('cx', NOW); pen.setAttribute('cy', lastY.toFixed(1));
      // Isolated fractions: shaded peak, dashed box and number. They travel with their pass.
      cutLayer.innerHTML = '';
      boxes.forEach(function (bx) {
        var c = CENTER + (bx.pass - P) * W, s = SIG[bx.pass], x0 = c + POS[bx.k] * DX[bx.pass];
        var hpk = AMP[bx.k] * (3.4 / s) * .95, hgt = hpk * H + 10, wd = s * 5;
        if (x0 + wd < XL || x0 - wd > NOW) return;
        var o = Math.min(1, (ms - bx.born) / 350), tgt = bx.k === TARGET, col = tgt ? BLUE : GRAPH;
        var d = 'M' + (x0 - wd / 2).toFixed(1) + ' ' + Y0;
        for (var xx = x0 - wd / 2; xx <= x0 + wd / 2; xx += 1) d += ' L' + xx.toFixed(1) + ' ' + (Y0 - hpk * H * gauss(xx, x0, s)).toFixed(1);
        d += ' L' + (x0 + wd / 2).toFixed(1) + ' ' + Y0 + ' Z';
        el('path', { d: d, fill: col, 'fill-opacity': ((tgt ? .85 : .28) * o).toFixed(2) }, cutLayer);
        el('rect', { x: (x0 - wd / 2).toFixed(1), y: (Y0 - hgt).toFixed(1), width: wd.toFixed(1), height: hgt.toFixed(1),
          fill: 'none', stroke: col, 'stroke-opacity': (.8 * o).toFixed(2), 'stroke-dasharray': '3 2', 'stroke-width': 1 }, cutLayer);
        var t = el('text', { x: x0.toFixed(1), y: (Y0 - hgt - 5).toFixed(1), 'font-size': 11, 'text-anchor': 'middle',
          'font-weight': tgt ? 700 : 500, fill: tgt ? BLUE : GRAPH, opacity: o.toFixed(2) }, cutLayer);
        t.textContent = '#' + num(bx.k);
      });
      passLab.innerHTML = '';
      vis.forEach(function (v) {
        if (v.c > NOW - 20) return;
        var t = el('text', { x: v.c.toFixed(1), y: Y0 + 20, 'font-size': 11.5, 'text-anchor': 'middle', class: 'g' }, passLab);
        t.textContent = 'Pass ' + v.p;
      });
    }
    // Timeline (ms): scroll in passes 1 to 4, then hold at passes 4, 5 and 6 to isolate each pair.
    var STEP = 1100, P0 = .35, HOLD = 1600;
    var T1 = (4 - P0) * STEP, T2 = T1 + HOLD, T3 = T2 + STEP, T4 = T3 + HOLD, T5 = T4 + STEP,
        T6 = T5 + HOLD, T7 = T6 + 2200, LOOP = T7 + 500;
    function take(pass, born) {
      for (var k in TAKEN) if (TAKEN[k] === pass && !boxes.some(function (b) { return b.pass === pass && b.k === +k; }))
        boxes.push({ pass: pass, k: +k, born: born });
    }
    var lastM = 0;
    function frame(ms) {
      var m = ms % LOOP, P, sub;
      if (m < lastM) boxes = [];   // a new loop starts with a clean trace
      lastM = m;
      if (m < T1) { P = P0 + m / STEP; sub = 'Each pass resolves the oligomers further'; }
      else if (m < T2) { P = 4; take(4, ms - (m - T1)); sub = 'Pass 4: #1 and #2 isolated'; }
      else if (m < T3) { P = 4 + (m - T2) / STEP; sub = 'Recycling the rest'; }
      else if (m < T4) { P = 5; take(5, ms - (m - T3)); sub = 'Pass 5: #3 and #4 isolated. #4 is the target'; }
      else if (m < T5) { P = 5 + (m - T4) / STEP; sub = 'Recycling the rest'; }
      else if (m < T6) { P = 6; take(6, ms - (m - T5)); sub = 'Pass 6: #5 and #6 isolated'; }
      else { P = 6; sub = 'Six single species, each at baseline'; }
      svg.style.opacity = m > T7 ? (1 - (m - T7) / 500).toFixed(2) : 1;
      tSub.textContent = sub;
      draw(P, ms);
    }
    animate(svg, frame, function () {
      boxes = [4, 5, 6].reduce(function (acc, pass) {
        for (var k in TAKEN) if (TAKEN[k] === pass) acc.push({ pass: pass, k: +k, born: -1e9 });
        return acc;
      }, []);
      tSub.textContent = 'Six single species, each at baseline'; draw(6, 0);
    });
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
