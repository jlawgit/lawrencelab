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
  // resolved than the last. Low-MW species (later eluting, right) are cut at pass 5,
  // high-MW species (left) at pass 6, and only the target comes back to be collected.
  document.querySelectorAll('svg[data-anim="hplc"]').forEach(function (svg) {
    var XL = 16, NOW = 352, Y0 = 232, H = 118, W = 140, CENTER = NOW - 78;
    var cutLayer = el('g', {}, svg);
    el('line', { x1: XL, y1: Y0, x2: NOW, y2: Y0, stroke: RULE, 'stroke-width': 1.5 }, svg);
    var fill = el('path', { fill: BLUE, opacity: 0 }, svg);
    var line = el('path', { fill: 'none', stroke: INK, 'stroke-width': 1.8, 'stroke-linejoin': 'round' }, svg);
    var pen = el('circle', { r: 3.2, fill: INK }, svg);
    var passLab = el('g', {}, svg);
    var tTitle = el('text', { x: XL + 8, y: 40, 'font-size': 17, 'font-weight': 600 }, svg);
    tTitle.textContent = 'Recycling SEC';
    var tSub = el('text', { x: XL + 8, y: 62, 'font-size': 13, class: 'g' }, svg);
    var tAx = el('text', { x: NOW, y: Y0 + 40, 'font-size': 11, 'text-anchor': 'end', class: 'g' }, svg);
    tAx.textContent = 'Retention time';
    // Species 0 (highest MW, elutes first) to 5 (lowest MW). Low MW separates more in SEC.
    var AMP = [.45, .75, 1, .85, .62, .4], POS = [-2.3, -1.55, -.75, .3, 1.55, 2.95], KEEP = 2;
    var LOW = [3, 4, 5], HIGH = [0, 1], LAST = 7;
    function passParams(p) { var t = Math.min(1, (p - 1) / 5); return { dx: mix(3.5, 17, t), s: mix(11, 3.4, t) }; }
    function present(p, k) {
      if (p >= 7) return k === KEEP;
      if (p === 6) return LOW.indexOf(k) < 0;
      return true;
    }
    function species(p) {   // screen-independent peak list of pass p, relative to its centre
      var q = passParams(p), out = [];
      for (var k = 0; k < AMP.length; k++) if (present(p, k)) {
        out.push({ k: k, off: POS[k] * q.dx, s: q.s, h: AMP[k] * (3.4 / q.s) * .95 });
      }
      return out;
    }
    var boxes = [];   // [{pass, k, born}]
    function draw(P, ms, fillA) {
      var dl = '', fl = '', lastY = Y0, first = true;
      var vis = [];
      for (var p = 1; p <= LAST; p++) {
        var c = CENTER + (p - P) * W;
        if (c - W / 2 < NOW && c + W / 2 > XL) vis.push({ p: p, c: c, sp: species(p) });
      }
      for (var x = XL; x <= NOW; x += 1.5) {
        var y = 0, yk = 0;
        vis.forEach(function (v) {
          v.sp.forEach(function (q) {
            var g = q.h * gauss(x, v.c + q.off, q.s);
            y += g; if (v.p === LAST) yk += g;
          });
        });
        // Nothing has been recorded beyond the newest pass yet.
        var px = x.toFixed(1), py = (Y0 - y * H).toFixed(1);
        dl += (first ? 'M' : ' L') + px + ' ' + py;
        fl += (first ? 'M' : ' L') + px + ' ' + (Y0 - yk * H).toFixed(1);
        first = false; lastY = Y0 - y * H;
      }
      line.setAttribute('d', dl);
      fill.setAttribute('d', fl + ' L' + NOW + ' ' + Y0 + ' L' + XL + ' ' + Y0 + ' Z');
      fill.setAttribute('opacity', (.85 * fillA).toFixed(2));
      pen.setAttribute('cx', NOW); pen.setAttribute('cy', lastY.toFixed(1));
      // Cut boxes stay on the recorded pass and travel with it.
      cutLayer.innerHTML = '';
      boxes.forEach(function (bx) {
        var c = CENTER + (bx.pass - P) * W, q = passParams(bx.pass), x0 = c + POS[bx.k] * q.dx;
        var hgt = AMP[bx.k] * (3.4 / q.s) * .95 * H + 12, wd = q.s * 4.2;
        var o = Math.min(1, (ms - bx.born) / 350);
        if (x0 + wd < XL || x0 - wd > NOW) return;
        el('rect', { x: (x0 - wd / 2).toFixed(1), y: (Y0 - hgt).toFixed(1), width: wd.toFixed(1), height: hgt.toFixed(1),
          fill: GRAPH, 'fill-opacity': (.14 * o).toFixed(2), stroke: GRAPH, 'stroke-opacity': (.8 * o).toFixed(2),
          'stroke-dasharray': '3 2', 'stroke-width': 1 }, cutLayer);
      });
      passLab.innerHTML = '';
      vis.forEach(function (v) {
        if (v.c > NOW - 20) return;
        var t = el('text', { x: v.c.toFixed(1), y: Y0 + 20, 'font-size': 11.5, 'text-anchor': 'middle',
          class: v.p === LAST ? '' : 'g', 'font-weight': v.p === LAST ? 600 : 400 }, passLab);
        t.textContent = v.p === LAST ? 'Collected' : 'Pass ' + v.p;
      });
    }
    // Timeline (ms): scroll to pass 5, cut low MW, scroll to 6, cut high MW, scroll to 7, collect.
    var STEP = 1100, P0 = .35;
    var T1 = (5 - P0) * STEP, T2 = T1 + 1500, T3 = T2 + STEP, T4 = T3 + 1500, T5 = T4 + STEP,
        T6 = T5 + 700, T7 = T6 + 2300, LOOP = T7 + 500;
    function addCuts(pass, ks, born) {
      ks.forEach(function (k) {
        if (!boxes.some(function (b) { return b.pass === pass && b.k === k; })) boxes.push({ pass: pass, k: k, born: born });
      });
    }
    var lastM = 0;
    function frame(ms) {
      var m = ms % LOOP, P, fa = 0, sub;
      if (m < lastM) boxes = [];   // a new loop starts with a clean trace
      lastM = m;
      if (m < T1) { P = P0 + m / STEP; sub = 'Each pass resolves the oligomers further'; }
      else if (m < T2) { P = 5; addCuts(5, LOW, ms - (m - T1)); sub = 'Pass 5: cut the low-MW species'; }
      else if (m < T3) { P = 5 + (m - T2) / STEP; sub = 'Recycling the rest'; }
      else if (m < T4) { P = 6; addCuts(6, HIGH, ms - (m - T3)); sub = 'Pass 6: cut the high-MW species'; }
      else if (m < T5) { P = 6 + (m - T4) / STEP; sub = 'Only the target returns'; }
      else if (m < T6) { P = 7; fa = ease((m - T5) / (T6 - T5)); sub = 'One species collected'; }
      else if (m < T7) { P = 7; fa = 1; sub = 'One species, multigram scale'; }
      else { P = 7; fa = 1; sub = 'One species, multigram scale'; svg.style.opacity = (1 - (m - T7) / 500).toFixed(2); }
      if (m < T7) svg.style.opacity = 1;
      tSub.textContent = sub;
      draw(P, ms, fa);
    }
    animate(svg, frame, function () {
      boxes = [{ pass: 6, k: 0, born: -1e9 }, { pass: 6, k: 1, born: -1e9 }];
      tSub.textContent = 'One species, multigram scale'; draw(7, 0, 1);
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
