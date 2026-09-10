/**
 * Scrolling banner.
 *
 * The row is a scroll container and the animation moves `scrollLeft`. That
 * choice is what makes the rest fall out for free: a drag sets the scroll
 * position directly, touch scrolls natively, a trackpad swipe works, and there
 * is no CSS animation to fight when the customer takes hold of it.
 *
 * Liquid renders one copy of the row. This clones it until the track is wide
 * enough that the loop never runs out, and hides the clones from assistive
 * technology — the same phrases repeated across the screen should be read once.
 */
class MarqueeBanner extends HTMLElement {
  connectedCallback() {
    this.list = this.querySelector('[data-marquee-list]');
    if (!this.list) return;

    this.speed = Number(this.dataset.speed) || 60;
    // 1 moves the content left, -1 moves it right.
    this.direction = this.dataset.direction === 'right' ? -1 : 1;
    this.period = 0;
    this.visible = false;
    this.dragging = false;
    this.hovered = false;

    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    this.step = this.step.bind(this);
    this.onScroll = this.onScroll.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);

    this.build();

    this.addEventListener('pointerdown', this.onPointerDown);
    this.addEventListener('pointermove', this.onPointerMove);
    this.addEventListener('pointerup', this.onPointerUp);
    this.addEventListener('pointercancel', this.onPointerUp);

    /*
     * Which way it is actually travelling, read from the scroll position rather
     * than the pointer. A finger flick and a mouse drag then count the same,
     * and momentum scrolling on iOS is included instead of being cut off at
     * the moment the finger lifts.
     */
    this.addEventListener('scroll', this.onScroll, { passive: true });

    if (this.hasAttribute('data-pause-on-hover')) {
      this.addEventListener('pointerenter', () => {
        this.hovered = true;
      });
      this.addEventListener('pointerleave', () => {
        this.hovered = false;
      });
    }

    // A row scrolling off screen is work nobody sees.
    if ('IntersectionObserver' in window) {
      this.watcher = new IntersectionObserver(
        (entries) => {
          this.visible = entries[0].isIntersecting;
          this.run();
        },
        { rootMargin: '200px' }
      );
      this.watcher.observe(this);
    } else {
      this.visible = true;
      this.run();
    }

    // A font swap or a resize changes how long one copy is.
    if ('ResizeObserver' in window) {
      this.resizer = new ResizeObserver(() => this.build());
      this.resizer.observe(this);
    }
  }

  disconnectedCallback() {
    cancelAnimationFrame(this.frame);
    this.watcher?.disconnect();
    this.resizer?.disconnect();
  }

  /** Clone the row until it is long enough to loop, then measure one length. */
  build() {
    this.querySelectorAll('[data-marquee-clone]').forEach((clone) => clone.remove());

    const one = this.list.getBoundingClientRect().width;
    if (one === 0) return;

    /*
     * Enough copies that the wrap point always has a full copy on either side
     * of the viewport, so the seam is never on screen.
     */
    const copies = Math.max(3, Math.ceil(this.clientWidth / one) + 2);

    for (let i = 1; i < copies; i += 1) {
      const clone = this.list.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      clone.setAttribute('data-marquee-clone', '');
      clone.removeAttribute('data-marquee-list');

      // A clone is not a block. Leaving these on would give the theme editor
      // several elements claiming to be the same one.
      clone.querySelectorAll('[data-shopify-editor-block]').forEach((node) => {
        node.removeAttribute('data-shopify-editor-block');
      });

      this.append(clone);
    }

    const lists = this.querySelectorAll('.marquee__list');
    // Measured rather than derived: this picks up the gap without assuming it.
    this.period = lists.length > 1 ? lists[1].offsetLeft - lists[0].offsetLeft : one;

    // Start one copy in, so there is room to travel either way before wrapping.
    this.scrollLeft = this.period;
    this.run();
  }

  run() {
    cancelAnimationFrame(this.frame);
    if (!this.visible || this.period <= 0) return;
    this.last = performance.now();
    this.frame = requestAnimationFrame(this.step);
  }

  step(now) {
    // Clamped: coming back to a backgrounded tab should not teleport the row.
    const elapsed = Math.min(now - this.last, 50) / 1000;
    this.last = now;

    const moving = !this.dragging && !this.hovered && !this.reduced.matches;
    if (moving) this.scrollTo(this.scrollLeft + this.direction * this.speed * elapsed);

    this.frame = requestAnimationFrame(this.step);
  }

  /** Keeps the position inside one copy's worth of the middle of the track. */
  scrollTo(value) {
    let next = value;
    if (next < 0) next += this.period;
    else if (next >= this.period * 2) next -= this.period;
    this.scrollLeft = next;
  }

  onScroll() {
    const previous = this.previousScroll;
    this.previousScroll = this.scrollLeft;
    if (previous === undefined) return;

    const delta = this.scrollLeft - previous;
    // A jump of about one copy is the loop wrapping, not the customer.
    if (delta !== 0 && Math.abs(delta) < this.period / 2) this.travel = delta;
  }

  onPointerDown(event) {
    this.dragging = true;
    this.pointerType = event.pointerType;
    this.startX = event.clientX;
    this.startScroll = this.scrollLeft;
    this.travel = 0;

    // Touch already scrolls this natively; taking it over would only make it
    // worse. The flag is still set, so the animation yields to the finger.
    if (event.pointerType === 'touch') return;

    this.classList.add('is-dragging');
    this.setPointerCapture(event.pointerId);
  }

  onPointerMove(event) {
    if (!this.dragging || this.pointerType === 'touch') return;
    this.scrollTo(this.startScroll - (event.clientX - this.startX));
  }

  onPointerUp(event) {
    if (!this.dragging) return;
    this.dragging = false;
    this.classList.remove('is-dragging');

    if (this.hasPointerCapture?.(event.pointerId)) this.releasePointerCapture(event.pointerId);

    // Carry on the way it was thrown. A stationary press is not a direction.
    if (this.travel) this.direction = this.travel > 0 ? 1 : -1;
  }
}

if (!customElements.get('marquee-banner')) customElements.define('marquee-banner', MarqueeBanner);
