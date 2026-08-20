'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const backToTop = document.querySelector('.back-to-top');

  if (!backToTop) {
    return;
  }

  const toggleBackToTop = () => {
    backToTop.hidden = window.scrollY <= 220;
  };

  window.addEventListener('scroll', toggleBackToTop, { passive: true });
  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  toggleBackToTop();
});
