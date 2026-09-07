/**
 * Quick add.
 *
 * Progressive enhancement over a real <form action="/cart/add">. With the script
 * blocked the form still posts and the browser lands on the cart, so the button
 * is never dead — it just stops being asynchronous.
 *
 * Only single-variant products get a form. Anything with options is a link to
 * the product page, because picking a variant is a decision the customer has to
 * make rather than one the theme can guess.
 */
class ProductAdd extends HTMLElement {
  connectedCallback() {
    this.form = this.querySelector('form');
    this.button = this.querySelector('[data-cart-add-button]');
    if (!this.form) return;

    this.onSubmit = this.onSubmit.bind(this);
    this.form.addEventListener('submit', this.onSubmit);
  }

  disconnectedCallback() {
    this.form?.removeEventListener('submit', this.onSubmit);
  }

  get routeRoot() {
    return window.Shopify?.routes?.root || '/';
  }

  async onSubmit(event) {
    event.preventDefault();
    if (this.busy) return;

    this.setBusy(true);

    try {
      const response = await fetch(`${this.routeRoot}cart/add.js`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(this.form),
      });

      const data = await response.json();

      if (!response.ok) {
        // Shopify returns the human-readable reason in `description`.
        this.announce(data.description || data.message || '');
        return;
      }

      await this.refreshCartCount();
      this.announce(this.dataset.addedMessage || '');
    } catch (error) {
      // A network failure should not leave the customer with a silent button.
      this.announce(this.dataset.errorMessage || '');
    } finally {
      this.setBusy(false);
    }
  }

  setBusy(busy) {
    this.busy = busy;
    this.classList.toggle('is-busy', busy);
    if (this.button) {
      this.button.disabled = busy;
      this.button.setAttribute('aria-busy', busy ? 'true' : 'false');
    }
  }

  /**
   * Re-reads the cart rather than incrementing a number in the DOM, so the
   * count stays right when the same product is added twice or a line merges.
   */
  async refreshCartCount() {
    const response = await fetch(`${this.routeRoot}cart.js`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return;

    const cart = await response.json();

    document.querySelectorAll('[data-cart-count]').forEach((node) => {
      node.textContent = cart.item_count;
      node.hidden = cart.item_count === 0;
    });
  }

  /** Speaks through the shared live region; silence would look like nothing happened. */
  announce(message) {
    if (!message) return;
    const status = document.querySelector('[data-cart-status]');
    if (!status) return;

    // Clearing first forces a re-announcement when the text is unchanged.
    status.textContent = '';
    window.requestAnimationFrame(() => {
      status.textContent = message;
    });
  }
}

if (!customElements.get('product-add')) {
  customElements.define('product-add', ProductAdd);
}
