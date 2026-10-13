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

  // Hero: side chains switch between many lengths (disperse) and one length (discrete).
  var fig = document.querySelector('.brushfig');
  if (!fig) return;
  var beads = fig.querySelectorAll('circle.b');
  var buttons = fig.querySelectorAll('.brushctl button');
  var DISCRETE = 6, MAX = 11, chains = {};
  beads.forEach(function (b) {
    var c = b.getAttribute('data-c'); (chains[c] = chains[c] || []).push(b);
  });
  var keys = Object.keys(chains);

  // Lengths spread around the same mean, so only the distribution changes.
  function disperseLengths() {
    return keys.map(function () {
      var u = Math.random() + Math.random() + Math.random();   // roughly bell-shaped
      return Math.max(1, Math.min(MAX, Math.round(DISCRETE + (u - 1.5) * 6)));
    });
  }

  function show(state) {
    var lengths = state === 'disperse' ? disperseLengths() : keys.map(function () { return DISCRETE; });
    fig.classList.toggle('disperse', state === 'disperse');
    keys.forEach(function (c, i) {
      chains[c].forEach(function (b) {
        var k = +b.getAttribute('data-k');
        b.style.transitionDelay = reduce ? '0ms' : (i * 12 + k * 18) + 'ms';
        b.classList.toggle('off', k >= lengths[i]);
      });
    });
    buttons.forEach(function (btn) {
      btn.setAttribute('aria-pressed', btn.getAttribute('data-state') === state ? 'true' : 'false');
    });
  }

  var state = 'discrete', timer = null;
  function cycle() { state = state === 'discrete' ? 'disperse' : 'discrete'; show(state); }
  function start() { if (!reduce && !timer) timer = setInterval(cycle, 3600); }
  function stop() { clearInterval(timer); timer = null; }

  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      stop(); state = btn.getAttribute('data-state'); show(state);
    });
  });

  // Run only while the figure is on screen.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) {
      e[0].isIntersecting ? start() : stop();
    }).observe(fig);
  } else { start(); }
  if (!reduce) setTimeout(function () { if (timer) { cycle(); } }, 1200);
})();
