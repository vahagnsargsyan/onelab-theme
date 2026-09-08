/**
 * Product page.
 *
 * Three elements, each doing one job:
 *   <product-gallery> — thumbnails, lightbox, and bringing a variant's image forward
 *   <variant-picker>  — option controls to variant, then re-render the section
 *   <product-form>    — Ajax add to cart
 *
 * Variant changes re-render the section through the Section Rendering API
 * rather than patching price and availability by hand. Price, compare-at, unit
 * price, inventory wording, installments, and the buy buttons then all come
 * from Liquid and cannot drift out of step with each other.
 */

class ProductGallery extends HTMLElement {
  connectedCallback() {
    this.dialog = this.querySelector('[data-gallery-dialog]');
    this.items = Array.from(this.querySelectorAll('[data-lightbox-item]'));
    this.index = 0;

    this.onKeydown = this.onKeydown.bind(this);

    this.querySelectorAll('[data-gallery-open]').forEach((button) => {
      button.addEventListener('click', () => this.open(Number(button.dataset.galleryOpen)));
    });

    this.querySelectorAll('[data-gallery-thumb]').forEach((thumb) => {
      thumb.addEventListener('click', () => this.showMedia(thumb.dataset.galleryThumb));
    });

    this.querySelector('[data-gallery-close]')?.addEventListener('click', () => this.dialog?.close());
    this.querySelector('[data-gallery-prev]')?.addEventListener('click', () => this.step(-1));
    this.querySelector('[data-gallery-next]')?.addEventListener('click', () => this.step(1));

    this.dialog?.addEventListener('keydown', this.onKeydown);

    document.addEventListener('variant:changed', (event) => {
      if (event.detail?.mediaId) this.showMedia(String(event.detail.mediaId));
    });
  }

  /** Carousel only: swap which item is on the stage. In grid layout every item is already visible. */
  showMedia(mediaId) {
    const items = this.querySelectorAll('[data-gallery-item]');
    if (this.dataset.galleryLayout === 'carousel') {
      items.forEach((item) => {
        item.hidden = item.dataset.mediaId !== mediaId;
      });
    } else {
      // Grid: scroll the matching tile into view instead of hiding the rest.
      const match = Array.from(items).find((item) => item.dataset.mediaId === mediaId);
      match?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    this.querySelectorAll('[data-gallery-thumb]').forEach((thumb) => {
      if (thumb.dataset.galleryThumb === mediaId) {
        thumb.setAttribute('aria-current', 'true');
      } else {
        thumb.removeAttribute('aria-current');
      }
    });
  }

  open(index) {
    if (!this.dialog || this.items.length === 0) return;
    this.show(index);
    if (typeof this.dialog.showModal === 'function') {
      this.dialog.showModal();
    } else {
      this.dialog.setAttribute('open', '');
    }
  }

  show(index) {
    // Wraps, so the arrows never dead-end at either edge.
    this.index = (index + this.items.length) % this.items.length;
    this.items.forEach((item, i) => {
      item.hidden = i !== this.index;
    });
  }

  step(direction) {
    this.show(this.index + direction);
  }

  onKeydown(event) {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.step(1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.step(-1);
    }
  }
}

class VariantPicker extends HTMLElement {
  connectedCallback() {
    this.variants = this.readVariants();

    this.addEventListener('change', () => this.onChange());
  }

  readVariants() {
    const node = this.querySelector('[data-variant-data]');
    if (!node) return [];
    try {
      return JSON.parse(node.textContent);
    } catch (error) {
      return [];
    }
  }

  /** The value chosen for each option, in option order. */
  get selectedOptions() {
    const values = [];
    this.querySelectorAll('[data-option-position]').forEach((control) => {
      if (control.type === 'radio' && !control.checked) return;
      values[Number(control.dataset.optionPosition) - 1] = control.value;
    });
    return values;
  }

  onChange() {
    const chosen = this.selectedOptions;
    const variant = this.variants.find((candidate) =>
      candidate.options.every((option, index) => option === chosen[index])
    );

    if (!variant) {
      // No such combination exists. Say so rather than leaving a stale price.
      document.dispatchEvent(new CustomEvent('variant:changed', { detail: { variant: null } }));
      return;
    }

    // Keep the URL shareable and the back button meaningful.
    const url = new URL(window.location.href);
    url.searchParams.set('variant', variant.id);
    window.history.replaceState({}, '', url);

    document.dispatchEvent(
      new CustomEvent('variant:changed', {
        detail: { variant, mediaId: variant.featured_media?.id },
      })
    );

    this.render(variant);
  }

  /** Re-renders the section so every price-derived field updates together. */
  async render(variant) {
    const section = this.dataset.section;
    const base = this.dataset.url;
    if (!section || !base) return;

    this.setAttribute('aria-busy', 'true');

    try {
      const response = await fetch(`${base}?variant=${variant.id}&section_id=${section}`);
      if (!response.ok) return;

      const markup = await response.text();
      const parsed = new DOMParser().parseFromString(markup, 'text/html');

      // Only the parts that depend on the variant are swapped; the gallery keeps
      // its own state so the lightbox does not slam shut on a colour change.
      [
        '[data-product-price]',
        '[data-product-inventory]',
        '[data-product-buy]',
        '[data-product-pickup]',
      ].forEach(
        (selector) => {
          const next = parsed.querySelector(selector);
          const current = document.querySelector(selector);
          if (next && current) current.innerHTML = next.innerHTML;
        }
      );
    } finally {
      this.removeAttribute('aria-busy');
    }
  }
}

class ProductForm extends HTMLElement {
  connectedCallback() {
    this.form = this.querySelector('form');
    this.button = this.querySelector('[data-add-button]');
    if (!this.form) return;

    this.form.addEventListener('submit', (event) => this.onSubmit(event));
  }

  get routeRoot() {
    return window.Shopify?.routes?.root || '/';
  }

  async onSubmit(event) {
    event.preventDefault();
    if (this.busy) return;

    this.setBusy(true);

    try {
      const body = new FormData(this.form);
      body.append('sections', 'cart-drawer');

      const response = await fetch(`${this.routeRoot}cart/add.js`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body,
      });
      const data = await response.json();

      if (!response.ok) {
        this.announce(data.description || data.message || '');
        return;
      }

      this.announce(this.dataset.addedMessage || '');

      if (document.querySelector('cart-drawer')) {
        document.dispatchEvent(new CustomEvent('cart:updated', { detail: data }));
        document.dispatchEvent(new CustomEvent('cart:open', { detail: { added: true } }));
      } else {
        document.querySelectorAll('[data-cart-count]').forEach((node) => {
          const next = Number(node.textContent || 0) + 1;
          node.textContent = next;
          node.hidden = false;
        });
      }
    } catch (error) {
      this.announce(this.dataset.errorMessage || '');
    } finally {
      this.setBusy(false);
    }
  }

  setBusy(busy) {
    this.busy = busy;
    if (this.button) {
      this.button.disabled = busy;
      this.button.setAttribute('aria-busy', busy ? 'true' : 'false');
    }
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
}

/**
 * Product tabs.
 *
 * The markup ships as a list of links to the panels below them, which works on
 * its own. This upgrades that strip to the ARIA tabs pattern: one panel open at
 * a time, arrow keys moving between tabs, and the duplicated panel headings
 * hidden once the strip is carrying that job.
 */
class ProductTabs extends HTMLElement {
  connectedCallback() {
    this.tabs = Array.from(this.querySelectorAll('[data-tab]'));
    this.panels = Array.from(this.querySelectorAll('[data-panel]'));
    if (this.tabs.length < 2) return;

    this.querySelector('[data-tab-list]')?.setAttribute('role', 'tablist');

    this.tabs.forEach((tab, index) => {
      tab.setAttribute('role', 'tab');
      tab.addEventListener('click', (event) => {
        event.preventDefault();
        this.select(index);
      });
      tab.addEventListener('keydown', (event) => this.onKeydown(event, index));
    });

    this.panels.forEach((panel) => {
      panel.setAttribute('role', 'tabpanel');
      // Focusable so a keyboard reaches the panel content after the strip.
      panel.setAttribute('tabindex', '0');
      panel.querySelector('[data-panel-heading]')?.setAttribute('hidden', '');
    });

    // A link to one panel should still land on it, wherever it came from.
    const linked = this.panels.findIndex((panel) => `#${panel.id}` === window.location.hash);
    this.select(linked > -1 ? linked : 0);

    // Selecting a tab in the theme editor brings its panel forward.
    document.addEventListener('shopify:block:select', (event) => {
      const index = this.panels.indexOf(event.target.closest('[data-panel]'));
      if (index > -1) this.select(index);
    });
  }

  select(index) {
    this.index = index;

    this.tabs.forEach((tab, i) => {
      const active = i === index;
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
      // Roving tabindex: the strip is one tab stop, arrows move within it.
      tab.setAttribute('tabindex', active ? '0' : '-1');
      tab.classList.toggle('is-active', active);
    });

    this.panels.forEach((panel, i) => {
      panel.hidden = i !== index;
    });
  }

  onKeydown(event, index) {
    const steps = { ArrowRight: 1, ArrowLeft: -1 };
    let next;

    if (event.key in steps) {
      next = (index + steps[event.key] + this.tabs.length) % this.tabs.length;
    } else if (event.key === 'Home') {
      next = 0;
    } else if (event.key === 'End') {
      next = this.tabs.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    this.select(next);
    this.tabs[next].focus();
  }
}

/**
 * Complementary products.
 *
 * Fetched rather than rendered inline because Shopify only fills the
 * recommendations object on a request to the recommendations route. Fetching
 * on idle keeps it off the critical path — nothing above the fold waits for it.
 */
function loadComplementary() {
  document.querySelectorAll('[data-complementary]').forEach(async (holder) => {
    const url = holder.dataset.url;
    if (!url) return;

    try {
      const response = await fetch(url);
      if (!response.ok) return;

      const parsed = new DOMParser().parseFromString(await response.text(), 'text/html');
      const list = parsed.querySelector('.layout__blocks');
      if (list && list.children.length > 0) holder.replaceChildren(list);
    } catch (error) {
      // A missing recommendation is not worth surfacing to the customer.
    }
  });
}

if ('requestIdleCallback' in window) {
  window.requestIdleCallback(loadComplementary);
} else {
  window.addEventListener('load', loadComplementary);
}

if (!customElements.get('product-gallery')) customElements.define('product-gallery', ProductGallery);
if (!customElements.get('variant-picker')) customElements.define('variant-picker', VariantPicker);
if (!customElements.get('product-form')) customElements.define('product-form', ProductForm);
if (!customElements.get('product-tabs')) customElements.define('product-tabs', ProductTabs);
