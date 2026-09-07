/**
 * Header behavior.
 *
 * Three jobs, none of which CSS can do alone:
 *   - publish the header's real height, so a fixed header can reserve space
 *   - flag scroll, so a transparent header can turn solid and stay legible
 *   - manage the disclosure menus and the mobile drawer
 *
 * Everything else is CSS. With this script blocked the header still renders,
 * the menus still open (they are <details>), and the drawer still opens as a
 * non-modal dialog.
 */
class SiteHeader extends HTMLElement {
  connectedCallback() {
    this.header = this.querySelector('[data-header]');
    this.drawer = this.querySelector('[data-header-drawer]');
    this.openers = this.querySelectorAll('[data-drawer-open]');
    this.closers = this.querySelectorAll('[data-drawer-close]');
    this.disclosures = Array.from(this.querySelectorAll('[data-nav-details]'));

    this.onScroll = this.onScroll.bind(this);
    this.onKeydown = this.onKeydown.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);

    this.measure();
    this.resizeObserver = new ResizeObserver(() => this.measure());
    if (this.header) this.resizeObserver.observe(this.header);

    window.addEventListener('scroll', this.onScroll, { passive: true });
    document.addEventListener('keydown', this.onKeydown);
    document.addEventListener('pointerdown', this.onPointerDown);

    this.openers.forEach((button) => {
      button.addEventListener('click', () => this.openDrawer());
    });
    this.closers.forEach((button) => {
      button.addEventListener('click', () => this.closeDrawer());
    });

    // Only one menu open at a time, so two panels never overlap.
    this.disclosures.forEach((details) => {
      details.addEventListener('toggle', () => {
        if (!details.open) return;
        this.disclosures.forEach((other) => {
          if (other !== details && !other.contains(details)) other.open = false;
        });
      });
    });

    this.onScroll();
  }

  disconnectedCallback() {
    this.resizeObserver?.disconnect();
    window.removeEventListener('scroll', this.onScroll);
    document.removeEventListener('keydown', this.onKeydown);
    document.removeEventListener('pointerdown', this.onPointerDown);
  }

  /** Publishes the height so the spacer under a fixed header matches it. */
  measure() {
    if (!this.header) return;
    const height = this.header.offsetHeight;
    if (height) {
      document.documentElement.style.setProperty('--header-height', `${height}px`);
    }
  }

  onScroll() {
    this.classList.toggle('is-scrolled', window.scrollY > 8);
  }

  onKeydown(event) {
    if (event.key !== 'Escape') return;

    const open = this.disclosures.filter((details) => details.open);
    if (open.length === 0) return;

    // Return focus to the summary that opened it, or Escape strands the user.
    const innermost = open[open.length - 1];
    open.forEach((details) => {
      details.open = false;
    });
    innermost.querySelector('summary')?.focus();
  }

  onPointerDown(event) {
    this.disclosures.forEach((details) => {
      if (details.open && !details.contains(event.target)) details.open = false;
    });
  }

  openDrawer() {
    if (!this.drawer) return;
    if (typeof this.drawer.showModal === 'function') {
      // showModal traps focus and adds the inert backdrop for free.
      this.drawer.showModal();
    } else {
      this.drawer.setAttribute('open', '');
    }
  }

  closeDrawer() {
    if (!this.drawer) return;
    if (typeof this.drawer.close === 'function') {
      this.drawer.close();
    } else {
      this.drawer.removeAttribute('open');
    }
  }
}

if (!customElements.get('site-header')) {
  customElements.define('site-header', SiteHeader);
}
