/**
 * Reveal on scroll.
 *
 * One IntersectionObserver for the page, watching section roots and nothing
 * else. Which elements move, and in what order, is entirely CSS — see
 * animations.css. That split is deliberate: anything this script has to mark or
 * measure is, by definition, not in place during the first paint, and a section
 * that appears and then hides itself a frame later looks broken.
 *
 * Elements are unobserved once revealed. This is an entrance, not a state, and
 * re-hiding something the customer has already read is worse than not
 * animating at all.
 */
const REVEALED = 'is-revealed';

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add(REVEALED);
      observer.unobserve(entry.target);
    });
  },
  {
    /*
     * A little past the bottom edge, so a section starts moving as it comes up
     * rather than the instant its first pixel appears. Kept small: a tall
     * section whose top is already above the fold must still qualify.
     */
    rootMargin: '0px 0px -5% 0px',
    threshold: 0,
  }
);

function scan(scope) {
  scope.querySelectorAll('.layout--animate').forEach((root) => {
    if (root.classList.contains(REVEALED)) return;
    observer.observe(root);
  });
}

scan(document);

/*
 * Content that arrives after load keeps the hidden state it was rendered with
 * unless it is picked up again: filtered collection results are swapped in
 * wholesale, and the theme editor re-renders a section on every change.
 */
document.addEventListener('shopify:section:load', (event) => scan(event.target));
document.addEventListener('theme:contentchange', () => scan(document));
