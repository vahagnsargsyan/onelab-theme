/**
 * Cart drawer.
 *
 * Every control it enhances is a working form field first: quantities post
 * through the cart form, Remove is a real /cart/change link, and Checkout is a
 * submit button. With this script blocked the cart still works — it just
 * reloads the page instead of updating in place.
 *
 * After any change the whole section is re-fetched through the Section
 * Rendering API rather than patched in the DOM. Totals, discounts, the free
 * shipping bar, and per-line prices all move together, so they cannot disagree.
 */
const CART_SECTION_ID = 'cart-drawer';

class CartDrawer extends HTMLElement {
  connectedCallback() {
    this.dialog = this.querySelector('dialog');
    this.bind();

    // The cart page renders its own <cart-drawer> for the line controls while
    // the global one still exists in the layout. Only the instance that owns a
    // dialog listens for global events or takes over the cart link; otherwise
    // the page instance would swallow the click and have nothing to open.
    if (this.dialog) {
      document.addEventListener('cart:updated', (event) => this.refresh(event.detail));
      document.addEventListener('cart:open', (event) => this.open(event.detail));
      this.bindOpeners();
    }
  }

  /** Which section to re-render after a change: the drawer, or the cart page. */
  get sectionId() {
    return this.dataset.sectionId || CART_SECTION_ID;
  }

  /**
   * The cart icon stays a link to /cart. Only a plain left click is taken over;
   * middle-click, ctrl/cmd-click, and shift-click keep their normal meaning, so
   * "open cart in a new tab" is not quietly broken.
   */
  bindOpeners() {
    document.querySelectorAll('[data-cart-open]').forEach((trigger) => {
      trigger.addEventListener('click', (event) => {
        if (
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }

        event.preventDefault();
        this.open();
      });
    });
  }

  get routeRoot() {
    return window.Shopify?.routes?.root || '/';
  }

  get cartType() {
    return this.dataset.cartType || 'drawer';
  }

  /** Re-bound after every re-render, since the markup is replaced wholesale. */
  bind() {
    this.dialog = this.querySelector('dialog');

    this.querySelectorAll('[data-cart-close]').forEach((button) => {
      button.addEventListener('click', () => this.close());
    });

    this.dialog?.addEventListener('click', (event) => {
      if (event.target === this.dialog) this.close();
    });

    this.querySelectorAll('[data-quantity-step]').forEach((button) => {
      button.addEventListener('click', () => {
        const input = button.parentElement.querySelector('[data-quantity-input]');
        if (!input) return;
        const next = Number(input.value) + Number(button.dataset.quantityStep);
        this.changeLine(button.closest('[data-cart-line]'), Math.max(next, 0));
      });
    });

    this.querySelectorAll('[data-quantity-input]').forEach((input) => {
      input.addEventListener('change', () => {
        this.changeLine(input.closest('[data-cart-line]'), Math.max(Number(input.value), 0));
      });
    });

    this.querySelectorAll('[data-cart-remove]').forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        this.changeLine(link.closest('[data-cart-line]'), 0);
      });
    });

    this.querySelector('[data-cart-note-save]')?.addEventListener('click', () => this.saveNote());

    this.querySelector('[data-discount-apply]')?.addEventListener('click', () => this.applyDiscount());
  }

  async changeLine(lineElement, quantity) {
    const line = lineElement?.dataset.cartLine;
    if (!line) return;

    this.setBusy(true);
    try {
      const response = await fetch(`${this.routeRoot}cart/change.js`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ line: Number(line), quantity, sections: [this.sectionId] }),
      });
      const data = await response.json();
      if (!response.ok) {
        this.announce(data.description || data.message || '');
        return;
      }
      this.refresh(data);
    } finally {
      this.setBusy(false);
    }
  }

  async saveNote() {
    const note = this.querySelector('[data-cart-note]');
    if (!note) return;

    this.setBusy(true);
    try {
      await fetch(`${this.routeRoot}cart/update.js`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ note: note.value }),
      });
      this.announce(this.dataset.noteSaved || '');
    } finally {
      this.setBusy(false);
    }
  }

  /**
   * Discount codes belong to the checkout, not the cart — there is no Ajax
   * endpoint for them. /discount/CODE is the supported route, so this is a
   * navigation on purpose.
   */
  applyDiscount() {
    const input = this.querySelector('[data-discount-input]');
    const code = input?.value.trim();
    if (!code) return;

    const back = encodeURIComponent(window.location.pathname);
    window.location.href = `${this.routeRoot}discount/${encodeURIComponent(code)}?redirect=${back}`;
  }

  /** Swaps in freshly rendered markup and reopens if it was open. */
  refresh(data) {
    const markup = data?.sections?.[this.sectionId];
    if (!markup) return;

    const wasOpen = this.dialog?.open;
    const parsed = new DOMParser().parseFromString(markup, 'text/html');
    const next = parsed.querySelector('cart-drawer');
    if (!next) return;

    this.innerHTML = next.innerHTML;
    this.dataset.itemCount = next.dataset.itemCount || '0';
    this.bind();

    this.updateHeaderCount(Number(this.dataset.itemCount));
    if (wasOpen) this.open();
  }

  updateHeaderCount(count) {
    document.querySelectorAll('[data-cart-count]').forEach((node) => {
      node.textContent = count;
      node.hidden = count === 0;
    });
  }

  setBusy(busy) {
    this.classList.toggle('is-busy', busy);
    this.querySelectorAll('button, input, a[data-cart-remove]').forEach((el) => {
      el.toggleAttribute('inert', busy);
    });
  }

  announce(message) {
    if (!message) return;
    const status = document.querySelector('[data-cart-status]');
    if (!status) return;
    status.textContent = '';
    window.requestAnimationFrame(() => {
      status.textContent = message;
    });
  }

  /**
   * @param {{added?: boolean}} [options] - `added: true` when something was
   *   just added, which changes the heading from "Cart" to "Added to cart".
   */
  open(options) {
    if (!this.dialog) return;

    const title = this.querySelector('[data-cart-title]');
    if (title) {
      title.textContent = options?.added
        ? title.dataset.titleAdded
        : title.dataset.titleCart;
    }

    if (this.dialog.open) return;

    if (typeof this.dialog.showModal === 'function') {
      this.dialog.showModal();
    } else {
      this.dialog.setAttribute('open', '');
    }
  }

  close() {
    if (typeof this.dialog?.close === 'function') {
      this.dialog.close();
    } else {
      this.dialog?.removeAttribute('open');
    }
  }
}

if (!customElements.get('cart-drawer')) {
  customElements.define('cart-drawer', CartDrawer);
}
