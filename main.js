'use strict';

document.documentElement.classList.add('js');

document.addEventListener('DOMContentLoaded', () => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const hero = document.querySelector('#profile-cover');
  const portrait = document.querySelector('#my-pic');
  const backToTop = document.querySelector('.back-to-top');
  const menu = document.querySelector('.site-nav');
  const menuButton = menu?.querySelector('.menu-icon');
  const menuLinks = menu?.querySelectorAll('.page-link') ?? [];

  const progress = document.createElement('div');
  progress.className = 'scroll-progress';
  progress.setAttribute('aria-hidden', 'true');
  progress.innerHTML = '<span class="scroll-progress__bar"></span>';
  document.body.prepend(progress);
  const progressBar = progress.firstElementChild;

  if (backToTop) {
    backToTop.hidden = false;
  }

  const setMenuOpen = (open) => {
    if (!menu || !menuButton) return;

    menu.classList.toggle('is-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
  };

  menuButton?.addEventListener('click', () => {
    setMenuOpen(!menu?.classList.contains('is-open'));
  });

  menuLinks.forEach((link) => {
    link.addEventListener('click', () => setMenuOpen(false));
  });

  document.addEventListener('click', (event) => {
    if (menu?.classList.contains('is-open') && !menu.contains(event.target)) {
      setMenuOpen(false);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu?.classList.contains('is-open')) {
      setMenuOpen(false);
      menuButton?.focus();
    }
  });

  const revealTargets = [
    ...document.querySelectorAll('.md-heading, .bio-body, .pub, #awards ul, .site-footer .footer-col'),
  ];

  revealTargets.forEach((element, index) => {
    element.classList.add('reveal-item');
    const delay = element.matches('.pub') ? (index % 4) * 65 : 0;
    element.style.setProperty('--reveal-delay', `${delay}ms`);
  });

  let revealObserver;

  const revealEverything = () => {
    revealObserver?.disconnect();
    revealTargets.forEach((element) => element.classList.add('is-visible'));
  };

  if (reducedMotion.matches || !('IntersectionObserver' in window)) {
    revealEverything();
  } else {
    revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -4% 0px' },
    );

    revealTargets.forEach((element) => revealObserver.observe(element));
  }

  let scrollFrame = 0;

  const updateScrollState = () => {
    scrollFrame = 0;
    const scrollTop = window.scrollY;
    const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    const scrollRatio = Math.min(Math.max(scrollTop / maxScroll, 0), 1);

    if (progressBar) {
      progressBar.style.transform = `scaleX(${scrollRatio})`;
    }

    if (backToTop) {
      const isVisible = scrollTop > 300;
      backToTop.classList.toggle('is-visible', isVisible);
      backToTop.setAttribute('aria-hidden', String(!isVisible));
      backToTop.tabIndex = isVisible ? 0 : -1;
    }

    if (hero) {
      const heroRect = hero.getBoundingClientRect();
      const heroIsVisible = heroRect.bottom > 0 && heroRect.top < window.innerHeight;
      const shift = !reducedMotion.matches && heroIsVisible ? Math.min(scrollTop * 0.1, 32) : 0;

      hero.style.setProperty('--hero-shift', `${shift}px`);
      hero.style.setProperty('--hero-light-shift', `${shift * 0.45}px`);
    }
  };

  const scheduleScrollUpdate = () => {
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(updateScrollState);
  };

  window.addEventListener('scroll', scheduleScrollUpdate, { passive: true });
  window.addEventListener('resize', scheduleScrollUpdate, { passive: true });

  backToTop?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  });

  let tiltFrame = 0;
  let pointerPosition = null;

  const resetTilt = () => {
    if (tiltFrame) {
      window.cancelAnimationFrame(tiltFrame);
      tiltFrame = 0;
    }

    pointerPosition = null;
    portrait?.classList.remove('is-tilting');
    portrait?.style.setProperty('--tilt-x', '0deg');
    portrait?.style.setProperty('--tilt-y', '0deg');
  };

  const updateTilt = () => {
    tiltFrame = 0;
    if (!portrait || !pointerPosition || reducedMotion.matches || !finePointer.matches) {
      resetTilt();
      return;
    }

    const rect = portrait.getBoundingClientRect();
    const x = (pointerPosition.x - rect.left) / rect.width - 0.5;
    const y = (pointerPosition.y - rect.top) / rect.height - 0.5;
    const rotateX = Math.max(-3.5, Math.min(3.5, y * -7));
    const rotateY = Math.max(-3.5, Math.min(3.5, x * 7));

    portrait.classList.add('is-tilting');
    portrait.style.setProperty('--tilt-x', `${rotateX.toFixed(2)}deg`);
    portrait.style.setProperty('--tilt-y', `${rotateY.toFixed(2)}deg`);
  };

  portrait?.addEventListener('pointermove', (event) => {
    if (reducedMotion.matches || !finePointer.matches) return;

    pointerPosition = { x: event.clientX, y: event.clientY };
    if (!tiltFrame) {
      tiltFrame = window.requestAnimationFrame(updateTilt);
    }
  });

  portrait?.addEventListener('pointerleave', resetTilt);
  portrait?.addEventListener('pointercancel', resetTilt);

  const handleMotionPreference = () => {
    if (reducedMotion.matches) {
      revealEverything();
      resetTilt();
    }
    scheduleScrollUpdate();
  };

  reducedMotion.addEventListener?.('change', handleMotionPreference);
  finePointer.addEventListener?.('change', resetTilt);

  updateScrollState();
});
