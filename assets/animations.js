/**
 * Reveal on scroll.
 *
 * One IntersectionObserver for the whole page, watching either each animating
 * section's content or — when the section reveals items one by one — the items
 * inside it. Elements are unobserved once revealed: this is an entrance, not a
 * state, and re-hiding something the customer has already read is worse than
 * not animating at all.
 *
 * The hidden state is CSS (see animations.css) and hangs off a class added
 * before first paint, so nothing here is load-bearing for the content being
 * visible. If this file fails to arrive, the page still reads.
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
     * A little past the bottom edge, so an element starts moving as it comes
     * up rather than the instant its first pixel appears.
     */
    rootMargin: '0px 0px -8% 0px',
    threshold: 0,
  }
);

/**
 * Marks and observes one section.
 *
 * A staggered section animates the children of its first `.layout__blocks` —
 * the first, because a nested group has one of its own and its children are
 * already inside an item that is animating. A section with no block list
 * (the product page, say) falls back to revealing as one piece, which is what
 * "one by one" can honestly mean when there is nothing to count.
 */
function collect(root) {
  if (root.classList.contains('layout--stagger')) {
    const list = root.querySelector('.layout__blocks');
    if (list && list.children.length > 0) return Array.from(list.children);
  }

  const content = root.querySelector(':scope > .layout__content');
  return content ? [content] : [];
}

function scan(scope) {
  scope.querySelectorAll('.layout--animate').forEach((root) => {
    const staggered = root.classList.contains('layout--stagger');

    collect(root).forEach((element, index) => {
      if (element.classList.contains(REVEALED)) return;

      if (staggered) {
        element.setAttribute('data-animate-item', '');
        element.style.setProperty('--animation-index', index);
      }

      observer.observe(element);
    });
  });
}

scan(document);

/*
 * Content that arrives after load has to be picked up, or it keeps the hidden
 * state it was rendered with and never comes back: filtered collection results
 * are swapped in wholesale, and the theme editor re-renders a section on every
 * change.
 */
document.addEventListener('shopify:section:load', (event) => scan(event.target));
document.addEventListener('theme:contentchange', () => scan(document));
