/**
 * Scroll-snap slider.
 *
 * The track is a native scroll container, so it works with no JavaScript at all:
 * touch, trackpad, and keyboard scrolling are the browser's. This element only
 * adds the previous and next buttons and keeps their disabled state accurate.
 *
 * Items per view come from --slider-per-view and --slider-per-view-mobile,
 * emitted by the section.
 *
 * The `loop` attribute wraps around: past the last item it returns to the
 * first, and before the first it jumps to the last. This is a wrap, not a
 * clone-based infinite carousel — no slide is duplicated, so screen readers
 * and the block editor keep seeing each item exactly once.
 */
class SliderCarousel extends HTMLElement {
  get loop() {
    return this.hasAttribute('loop');
  }

  connectedCallback() {
    this.track = this.querySelector('[data-slider-track]');
    if (!this.track) return;

    this.previous = this.querySelector('[data-slider-previous]');
    this.next = this.querySelector('[data-slider-next]');
    this.dots = Array.from(this.querySelectorAll('[data-slider-dot]'));

    this.onScroll = this.onScroll.bind(this);

    this.previous?.addEventListener('click', () => this.page(-1));
    this.next?.addEventListener('click', () => this.page(1));
    this.dots.forEach((dot, index) => {
      dot.addEventListener('click', () => this.goTo(index));
    });
    this.track.addEventListener('scroll', this.onScroll, { passive: true });

    this.resizeObserver = new ResizeObserver(this.onScroll);
    this.resizeObserver.observe(this.track);

    this.onScroll();
  }

  disconnectedCallback() {
    this.resizeObserver?.disconnect();
    this.track?.removeEventListener('scroll', this.onScroll);
  }

  /**
   * Scrolls one full track width in the given direction. When looping, a step
   * past either end lands on the opposite end instead of stopping.
   */
  page(direction) {
    const motionOk = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const behavior = motionOk ? 'smooth' : 'auto';
    const { scrollLeft, scrollWidth, clientWidth } = this.track;
    const maxScroll = scrollWidth - clientWidth;
    const position = Math.abs(scrollLeft);

    if (this.loop) {
      if (direction > 0 && position >= maxScroll - 1) {
        this.track.scrollTo({ left: 0, behavior });
        return;
      }

      if (direction < 0 && position <= 1) {
        this.track.scrollTo({ left: maxScroll, behavior });
        return;
      }
    }

    this.track.scrollBy({ left: clientWidth * direction, behavior });
  }

  /** Scrolls a specific item to the start of the track. */
  goTo(index) {
    const item = this.track.children[index];
    if (!item) return;

    const motionOk = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.track.scrollTo({
      left: item.offsetLeft,
      behavior: motionOk ? 'smooth' : 'auto',
    });
  }

  /**
   * The item nearest the start of the visible area. Measured rather than
   * calculated from a fixed width, so it stays correct when items differ in
   * size or the track is mid-scroll.
   */
  currentIndex() {
    const position = Math.abs(this.track.scrollLeft);
    let nearest = 0;
    let shortest = Infinity;

    Array.from(this.track.children).forEach((item, index) => {
      const distance = Math.abs(item.offsetLeft - position);
      if (distance < shortest) {
        shortest = distance;
        nearest = index;
      }
    });

    return nearest;
  }

  updateDots() {
    if (!this.dots.length) return;

    const current = this.currentIndex();

    this.dots.forEach((dot, index) => {
      const isCurrent = index === current;
      dot.classList.toggle('is-current', isCurrent);
      // aria-current, not aria-selected: these are links to positions, not tabs.
      if (isCurrent) {
        dot.setAttribute('aria-current', 'true');
      } else {
        dot.removeAttribute('aria-current');
      }
    });
  }

  /**
   * Disables a button when the track cannot travel further that way. Compared
   * with a 1px tolerance because scrollLeft is fractional at some zoom levels
   * and would otherwise never equal the maximum.
   *
   * A looping slider never disables its buttons, since both directions always
   * lead somewhere. Either way, a track with nothing to scroll hides both.
   */
  onScroll() {
    const { scrollLeft, scrollWidth, clientWidth } = this.track;
    const maxScroll = scrollWidth - clientWidth;
    const position = Math.abs(scrollLeft);
    const noOverflow = maxScroll <= 1;
    const atStart = position <= 1;
    const atEnd = position >= maxScroll - 1;

    if (this.previous) {
      this.previous.disabled = noOverflow || (!this.loop && atStart);
    }

    if (this.next) {
      this.next.disabled = noOverflow || (!this.loop && atEnd);
    }

    this.classList.toggle('slider--static', noOverflow);

    this.updateDots();
  }
}

if (!customElements.get('slider-carousel')) {
  customElements.define('slider-carousel', SliderCarousel);
}
