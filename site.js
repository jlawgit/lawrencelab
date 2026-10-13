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

  // Hero: BBP (disperse backbone and side chains) -> PBP (discrete side chains)
  // -> DBP (discrete backbone and side chains). Three molecules stand in for a sample.
  var fig = document.querySelector('.brushfig');
  if (!fig) return;
  var mols = [].slice.call(fig.querySelectorAll('.mol'));
  var buttons = fig.querySelectorAll('.brushctl button');
  var cap = fig.querySelector('.brushcap');
  var LMAX = 22, SP = 21, K = 6, SIDE = 4, LDBP = 16;
  var CAPS = {
    bbp: 'BBP: backbones and side chains of many lengths.',
    pbp: 'PBP: identical side chains, backbones still of many lengths.',
    dbp: 'DBP: every molecule identical, backbone and side chains.'
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
