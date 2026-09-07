/**
 * ═══════════════════════════════════════════════════════════════════
 * RANKLY.AI — "WONDERFUL TOOLS" APPLE-STYLE PRODUCT SHOWCASE ENGINE
 * Scroll-driven animation controller with parallax & morph effects
 * Inspired by Apple's "Wonderful Tools" motion design language
 * ═══════════════════════════════════════════════════════════════════
 */
(function () {
  'use strict';

  /* ─── Configuration ─── */
  const CONFIG = {
    rootMargin: '-10% 0px -10% 0px',
    threshold: [0, 0.15, 0.3, 0.5, 0.7, 1],
    parallaxIntensity: 0.025,
    counterDuration: 1800,
    counterEase: function (t) { return 1 - Math.pow(1 - t, 3); }, // easeOutCubic
    waveBarCount: 24,
  };

  /* ─── State ─── */
  let observer = null;
  let parallaxActive = false;
  let animationFrameId = null;

  /* ─── Utility: Animate Counter ─── */
  function animateCounter(el, target, suffix) {
    if (el.dataset.counted === 'true') return;
    el.dataset.counted = 'true';

    const start = performance.now();
    const duration = CONFIG.counterDuration;

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = CONFIG.counterEase(progress);
      const current = Math.round(eased * target);

      el.textContent = current.toLocaleString() + (suffix || '');

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    }

    requestAnimationFrame(tick);
  }

  /* ─── Intersection Observer: Reveal on Scroll ─── */
  function initScrollObserver() {
    if (!('IntersectionObserver' in window)) {
      // Fallback: show everything immediately
      document.querySelectorAll('.wt-frame').forEach(function (f) {
        f.classList.add('wt-visible');
      });
      return;
    }

    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.15) {
          entry.target.classList.add('wt-visible');

          // Trigger counter animations inside this frame
          var counters = entry.target.querySelectorAll('[data-wt-count]');
          counters.forEach(function (c) {
            var target = parseInt(c.getAttribute('data-wt-count'), 10);
            var suffix = c.getAttribute('data-wt-suffix') || '';
            animateCounter(c, target, suffix);
          });

          // Trigger wave bars inside this frame
          var waveBars = entry.target.querySelectorAll('.wt-wave-bar');
          waveBars.forEach(function (bar, i) {
            bar.style.animationDelay = (i * 0.05) + 's';
          });
        }
      });
    }, {
      rootMargin: CONFIG.rootMargin,
      threshold: CONFIG.threshold,
    });

    document.querySelectorAll('.wt-frame').forEach(function (frame) {
      observer.observe(frame);
    });
  }

  /* ─── Parallax Mouse Tracking ─── */
  function initParallax() {
    // Only on desktop (no touch)
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) return;

    var layers = document.querySelectorAll('.wt-parallax-layer');
    if (layers.length === 0) return;

    parallaxActive = true;

    document.addEventListener('mousemove', function (e) {
      if (!parallaxActive) return;

      if (animationFrameId) cancelAnimationFrame(animationFrameId);

      animationFrameId = requestAnimationFrame(function () {
        var cx = (e.clientX / window.innerWidth - 0.5) * 2;
        var cy = (e.clientY / window.innerHeight - 0.5) * 2;

        layers.forEach(function (layer) {
          var depth = parseFloat(layer.getAttribute('data-depth')) || 1;
          var moveX = cx * CONFIG.parallaxIntensity * depth * 100;
          var moveY = cy * CONFIG.parallaxIntensity * depth * 100;
          layer.style.transform = 'translate(' + moveX + 'px, ' + moveY + 'px)';
        });
      });
    });
  }

  /* ─── Dynamic Wave Bars Generator (Frame 4) ─── */
  function generateWaveBars() {
    var container = document.querySelector('.wt-waveform');
    if (!container || container.children.length > 0) return;

    for (var i = 0; i < CONFIG.waveBarCount; i++) {
      var bar = document.createElement('div');
      bar.className = 'wt-wave-bar';
      var h = 12 + Math.random() * 36;
      bar.style.setProperty('--wt-wave-h', h + 'px');
      bar.style.animationDelay = (i * 0.05) + 's';
      bar.style.height = '8px';
      container.appendChild(bar);
    }
  }

  /* ─── Card Stack Shuffle Animation (Frame 3) ─── */
  function initCardShuffle() {
    var stack = document.querySelector('.wt-card-stack');
    if (!stack) return;

    var cards = stack.querySelectorAll('.wt-rank-card');
    if (cards.length < 2) return;

    var currentTop = 0;

    setInterval(function () {
      // Only animate if frame is visible
      if (!stack.closest('.wt-visible')) return;

      // Move top card to bottom with animation
      var topCard = cards[currentTop];
      topCard.style.transition = 'transform 0.6s cubic-bezier(0.17, 0.17, 0, 1), opacity 0.6s ease';
      topCard.style.transform = 'translateY(48px) scale(0.88)';
      topCard.style.opacity = '0.2';
      topCard.style.zIndex = '0';

      // Shift other cards up
      for (var i = 0; i < cards.length; i++) {
        if (i === currentTop) continue;
        var offset = i === ((currentTop + 1) % cards.length) ? 0 : 16;
        var scale = i === ((currentTop + 1) % cards.length) ? 1 : 0.96;
        var opacity = i === ((currentTop + 1) % cards.length) ? 1 : 0.7;
        var z = i === ((currentTop + 1) % cards.length) ? 3 : 2;

        cards[i].style.transition = 'transform 0.6s cubic-bezier(0.17, 0.17, 0, 1), opacity 0.6s ease';
        cards[i].style.transform = 'translateY(' + offset + 'px) scale(' + scale + ')';
        cards[i].style.opacity = opacity;
        cards[i].style.zIndex = z;
      }

      // Reset top card to bottom position after transition
      setTimeout(function () {
        topCard.style.transition = 'none';
        topCard.style.transform = 'translateY(32px) scale(0.92)';
        topCard.style.opacity = '0.4';
        topCard.style.zIndex = '1';
      }, 650);

      currentTop = (currentTop + 1) % cards.length;
    }, 2800);
  }

  /* ─── Smooth Scroll to CTA ─── */
  function initSmoothScroll() {
    document.querySelectorAll('[data-wt-scroll]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var targetId = btn.getAttribute('data-wt-scroll');
        var target = document.getElementById(targetId);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    });
  }

  /* ─── CTA Button Handler ─── */
  function initCTAButton() {
    var ctaBtn = document.getElementById('wtCtaButton');
    if (!ctaBtn) return;

    ctaBtn.addEventListener('click', function () {
      // Scroll to the auth/login section at the top
      var authSection = document.getElementById('slidingAuthCard') ||
                        document.getElementById('heroRegister') ||
                        document.querySelector('.auth-card-front');
      if (authSection) {
        authSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  /* ─── Scan Line Position Randomizer (Frame 2) ─── */
  function initScanLine() {
    var scanline = document.querySelector('.wt-scanline');
    if (!scanline) return;
    // CSS handles the animation, we just ensure it's visible when frame is in view
  }

  /* ─── Initialize Everything ─── */
  function init() {
    initScrollObserver();
    initParallax();
    generateWaveBars();
    initCardShuffle();
    initSmoothScroll();
    initCTAButton();
    initScanLine();

    // Log success
    if (typeof console !== 'undefined') {
      console.log('[Rankly.ai] 🍎 Wonderful Tools Showcase Engine initialized');
    }
  }

  /* ─── DOM Ready ─── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ─── Cleanup on page hide ─── */
  window.addEventListener('pagehide', function () {
    if (observer) { observer.disconnect(); observer = null; }
    if (animationFrameId) { cancelAnimationFrame(animationFrameId); }
    parallaxActive = false;
  });

  /* ─── Public API ─── */
  window.RanklyShowcase = {
    refresh: function () {
      document.querySelectorAll('.wt-frame').forEach(function (f) {
        f.classList.remove('wt-visible');
        // Reset counters
        f.querySelectorAll('[data-wt-count]').forEach(function (c) {
          c.dataset.counted = 'false';
        });
      });
      if (observer) observer.disconnect();
      initScrollObserver();
    },
    scrollToFrame: function (index) {
      var frames = document.querySelectorAll('.wt-frame');
      if (frames[index]) {
        frames[index].scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

})();
