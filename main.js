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

  const publicationCards = [...document.querySelectorAll('#publication-list .pub')];
  const publicationFilterButtons = [...document.querySelectorAll('[data-publication-filter]')];
  const publicationCount = document.querySelector('#publication-count');
  const publicationAnimations = new Map();
  const selectedPublicationCount = publicationCards.filter(
    (card) => card.dataset.selected === 'true',
  ).length;
  let publicationView = 'selected';
  let publicationRevision = 0;

  const shouldShowPublication = (card, view = publicationView) =>
    view === 'all' || card.dataset.selected === 'true';

  const cancelPublicationAnimation = (card) => {
    const animation = publicationAnimations.get(card);
    if (!animation) return;

    animation.cancel();
    publicationAnimations.delete(card);
  };

  const animatePublication = (card, show, revision) => {
    const wasHidden = card.hidden;
    cancelPublicationAnimation(card);
    const duration = reducedMotion.matches || typeof card.animate !== 'function' ? 0 : 190;

    if (show) {
      card.hidden = false;
      card.inert = false;
      if (!wasHidden || !duration) return;

      const animation = card.animate(
        [
          { opacity: 0, transform: 'translate3d(0, 10px, 0)' },
          { opacity: 1, transform: 'translate3d(0, 0, 0)' },
        ],
        { duration, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      );
      publicationAnimations.set(card, animation);
      animation.finished
        .catch(() => {})
        .finally(() => {
          if (publicationAnimations.get(card) === animation) {
            publicationAnimations.delete(card);
          }
        });
      return;
    }

    if (card.hidden) return;

    if (card.contains(document.activeElement)) {
      publicationFilterButtons.find(
        (button) => button.dataset.publicationFilter === publicationView,
      )?.focus();
    }
    card.inert = true;

    if (!duration) {
      card.hidden = true;
      card.inert = false;
      return;
    }

    const animation = card.animate(
      [
        { opacity: 1, transform: 'translate3d(0, 0, 0)' },
        { opacity: 0, transform: 'translate3d(0, 8px, 0)' },
      ],
      { duration, easing: 'ease-in' },
    );
    publicationAnimations.set(card, animation);
    animation.finished
      .then(() => {
        if (revision === publicationRevision && !shouldShowPublication(card)) {
          card.hidden = true;
          card.inert = false;
          window.dispatchEvent(new Event('resize'));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (publicationAnimations.get(card) === animation) {
          publicationAnimations.delete(card);
        }
      });
  };

  const applyPublicationFilter = (view, animate = true) => {
    publicationView = view === 'all' ? 'all' : 'selected';
    publicationRevision += 1;
    const revision = publicationRevision;
    const visibleCount = publicationView === 'all' ? publicationCards.length : selectedPublicationCount;

    publicationFilterButtons.forEach((button) => {
      button.setAttribute(
        'aria-pressed',
        String(button.dataset.publicationFilter === publicationView),
      );
    });

    if (publicationCount) {
      publicationCount.textContent =
        publicationView === 'all'
          ? `Showing all ${visibleCount} publications`
          : `Showing ${visibleCount} selected publications`;
    }

    publicationCards.forEach((card) => {
      const show = shouldShowPublication(card);
      if (!animate) {
        cancelPublicationAnimation(card);
        card.hidden = !show;
        card.inert = false;
        return;
      }

      animatePublication(card, show, revision);
    });
  };

  publicationFilterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      applyPublicationFilter(button.dataset.publicationFilter, true);
      window.dispatchEvent(new Event('resize'));
    });
  });

  applyPublicationFilter('selected', false);

  const publicationRevealTargets = [...document.querySelectorAll('.pub-card')];
  const revealTargets = [
    ...document.querySelectorAll('.md-heading, .bio-body, #awards ul, .site-footer .footer-col'),
    ...publicationRevealTargets,
  ];

  revealTargets.forEach((element) => {
    element.classList.add('reveal-item');
  });

  publicationRevealTargets.forEach((element, index) => {
    element.style.setProperty('--reveal-delay', `${(index % 4) * 65}ms`);
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
    applyPublicationFilter(publicationView, false);
    scheduleScrollUpdate();
  };

  reducedMotion.addEventListener?.('change', handleMotionPreference);
  finePointer.addEventListener?.('change', resetTilt);

  updateScrollState();
});
