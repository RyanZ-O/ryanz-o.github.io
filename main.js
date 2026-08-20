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

  const ambientMotionEvents = ['pointerdown', 'keydown', 'scroll'];
  let ambientMotionTimer = 0;

  const enableAmbientMotion = () => {
    document.documentElement.classList.toggle('motion-ready', !reducedMotion.matches);
    ambientMotionEvents.forEach((eventName) => {
      window.removeEventListener(eventName, enableAmbientMotion);
    });
    if (ambientMotionTimer) window.clearTimeout(ambientMotionTimer);
  };

  ambientMotionEvents.forEach((eventName) => {
    window.addEventListener(eventName, enableAmbientMotion, {
      once: true,
      passive: eventName !== 'keydown',
    });
  });
  ambientMotionTimer = window.setTimeout(enableAmbientMotion, 15000);

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

  const figureDialog = document.querySelector('#figure-lightbox');
  const figureTriggers = [...document.querySelectorAll('[data-figure-trigger]')];
  const lightboxClose = figureDialog?.querySelector('[data-lightbox-close]');
  const lightboxPrevious = figureDialog?.querySelector('[data-lightbox-previous]');
  const lightboxNext = figureDialog?.querySelector('[data-lightbox-next]');
  const lightboxImageFrame = figureDialog?.querySelector('.figure-lightbox__image-frame');
  const lightboxImageLink = figureDialog?.querySelector('#figure-lightbox-image-link');
  const lightboxOriginal = figureDialog?.querySelector('#figure-lightbox-original');
  const lightboxTitle = figureDialog?.querySelector('#figure-lightbox-title');
  const lightboxCaption = figureDialog?.querySelector('#figure-lightbox-caption');
  const lightboxSource = figureDialog?.querySelector('#figure-lightbox-source');
  const lightboxDoi = figureDialog?.querySelector('#figure-lightbox-doi');
  const lightboxCounter = figureDialog?.querySelector('#figure-lightbox-counter');
  const lightboxStatus = figureDialog?.querySelector('#figure-lightbox-status');
  const lightboxLoadingStatus = figureDialog?.querySelector('#figure-lightbox-loading-status');
  const supportsDialog = Boolean(figureDialog && typeof figureDialog.showModal === 'function');
  const lightboxImage = new Image();
  let activeFigureIndex = 0;
  let figureReturnFocus = null;
  let figureLoadRevision = 0;
  let activeFullImageLoader = null;

  lightboxImage.className = 'figure-lightbox__image';
  lightboxImage.decoding = 'async';
  lightboxImageLink?.append(lightboxImage);

  [lightboxPrevious, lightboxNext].forEach((button) => {
    if (!button) return;
    button.hidden = figureTriggers.length < 2;
    button.disabled = figureTriggers.length < 2;
  });

  const normalizedFigureIndex = (index) => {
    if (!figureTriggers.length) return 0;
    return (index + figureTriggers.length) % figureTriggers.length;
  };

  const updateFigureDialog = (index) => {
    const trigger = figureTriggers[normalizedFigureIndex(index)];
    if (!trigger) return;

    activeFigureIndex = normalizedFigureIndex(index);
    const thumbnail = trigger.querySelector('img');
    const fullImageUrl = trigger.href;
    const imageWidth = Number(trigger.dataset.figureWidth);
    const imageHeight = Number(trigger.dataset.figureHeight);
    const loadRevision = ++figureLoadRevision;
    const previewImageUrl = thumbnail?.currentSrc || thumbnail?.src || fullImageUrl;

    lightboxImageFrame?.classList.add('is-loading');
    lightboxImageFrame?.classList.remove('has-error');
    lightboxImageFrame?.setAttribute('aria-busy', 'true');
    if (lightboxLoadingStatus) lightboxLoadingStatus.textContent = '';

    lightboxImage.alt = trigger.dataset.figureAlt || thumbnail?.alt || '';
    if (Number.isFinite(imageWidth) && imageWidth > 0) {
      lightboxImage.width = imageWidth;
    } else {
      lightboxImage.removeAttribute('width');
    }
    if (Number.isFinite(imageHeight) && imageHeight > 0) {
      lightboxImage.height = imageHeight;
    } else {
      lightboxImage.removeAttribute('height');
    }
    lightboxImage.src = previewImageUrl;

    if (activeFullImageLoader) activeFullImageLoader.src = '';
    const fullImageLoader = new Image();
    activeFullImageLoader = fullImageLoader;
    fullImageLoader.decoding = 'async';
    fullImageLoader.addEventListener('load', () => {
      if (loadRevision !== figureLoadRevision) return;

      lightboxImage.src = fullImageUrl;
      lightboxImageFrame?.classList.remove('is-loading', 'has-error');
      lightboxImageFrame?.setAttribute('aria-busy', 'false');
      if (lightboxLoadingStatus) lightboxLoadingStatus.textContent = '';
      activeFullImageLoader = null;
    });
    fullImageLoader.addEventListener('error', () => {
      if (loadRevision !== figureLoadRevision) return;

      lightboxImageFrame?.classList.remove('is-loading');
      lightboxImageFrame?.classList.add('has-error');
      lightboxImageFrame?.setAttribute('aria-busy', 'false');
      if (lightboxLoadingStatus) {
        lightboxLoadingStatus.textContent = 'The full-resolution figure could not be loaded. The preview remains available; use the source link for the publication.';
      }
      activeFullImageLoader = null;
    });
    fullImageLoader.src = fullImageUrl;

    if (lightboxImageLink) {
      lightboxImageLink.href = fullImageUrl;
      lightboxImageLink.setAttribute(
        'aria-label',
        `Open full-resolution image: ${trigger.dataset.figureTitle || 'publication figure'}`,
      );
    }
    if (lightboxOriginal) lightboxOriginal.href = fullImageUrl;
    if (lightboxTitle) lightboxTitle.textContent = trigger.dataset.figureTitle || 'Publication figure';
    if (lightboxCaption) {
      lightboxCaption.textContent = trigger.dataset.figureCaption || 'Figure from the selected publication.';
    }
    if (lightboxSource) {
      lightboxSource.href = trigger.dataset.figureSourceUrl || fullImageUrl;
      lightboxSource.textContent = trigger.dataset.figureSourceLabel || 'Source publication';
    }
    if (lightboxDoi) {
      const doiUrl = trigger.dataset.figureDoiUrl;
      lightboxDoi.hidden = !doiUrl;
      if (doiUrl) {
        lightboxDoi.href = doiUrl;
      } else {
        lightboxDoi.removeAttribute('href');
      }
    }
    if (lightboxCounter) {
      lightboxCounter.textContent = `${activeFigureIndex + 1} of ${figureTriggers.length}`;
    }
    if (lightboxStatus) {
      lightboxStatus.textContent = `Item ${activeFigureIndex + 1} of ${figureTriggers.length}: ${trigger.dataset.figureTitle || 'Publication figure'}`;
    }
  };

  const openFigureDialog = (trigger, index) => {
    if (!supportsDialog) return;

    figureReturnFocus = trigger;
    updateFigureDialog(index);
    figureDialog.showModal();
    document.documentElement.classList.add('dialog-open');
    lightboxClose?.focus();
  };

  figureTriggers.forEach((trigger, index) => {
    if (supportsDialog) {
      trigger.setAttribute('aria-haspopup', 'dialog');
      trigger.setAttribute('aria-controls', 'figure-lightbox');
      const viewerHint = document.createElement('span');
      viewerHint.className = 'visually-hidden';
      viewerHint.textContent = 'Open figure viewer.';
      trigger.append(viewerHint);
    }

    trigger.addEventListener('click', (event) => {
      const modifiedClick = event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
      if (!supportsDialog || modifiedClick) return;

      event.preventDefault();
      openFigureDialog(trigger, index);
    });
  });

  lightboxClose?.addEventListener('click', () => figureDialog?.close());
  lightboxPrevious?.addEventListener('click', () => updateFigureDialog(activeFigureIndex - 1));
  lightboxNext?.addEventListener('click', () => updateFigureDialog(activeFigureIndex + 1));

  figureDialog?.addEventListener('click', (event) => {
    if (event.target === figureDialog) figureDialog.close();
  });

  figureDialog?.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      updateFigureDialog(activeFigureIndex - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      updateFigureDialog(activeFigureIndex + 1);
    }
  });

  figureDialog?.addEventListener('close', () => {
    document.documentElement.classList.remove('dialog-open');
    if (figureReturnFocus?.isConnected) figureReturnFocus.focus({ preventScroll: true });
  });

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
    publicationAnimations.forEach((_, card) => cancelPublicationAnimation(card));
    document.documentElement.classList.toggle(
      'motion-ready',
      !reducedMotion.matches && document.readyState === 'complete',
    );
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
